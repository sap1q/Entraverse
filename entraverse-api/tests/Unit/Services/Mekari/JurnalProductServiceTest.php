<?php

declare(strict_types=1);

use App\Events\ProductSyncedToJurnal;
use App\Models\Category;
use App\Models\Product;
use App\Services\Mekari\Exceptions\MekariApiException;
use App\Services\Mekari\Jurnal\JurnalProductService;
use App\Services\Mekari\MekariService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function (): void {
    config()->set('services.mekari.jurnal_base_path', '/public/jurnal/api/v1');
    config()->set('services.mekari.base_url', 'https://api.mekari.com');
    $this->mekariMock = \Mockery::mock(MekariService::class);
    $this->service = new JurnalProductService($this->mekariMock);
});

afterEach(function (): void {
    \Mockery::close();
});

it('transforms product to jurnal format correctly', function (): void {
    $category = Category::factory()->create(['name' => 'Electronics']);
    $product = Product::factory()
        ->for($category)
        ->withVariants(2)
        ->create([
            'name' => 'Test Product',
            'spu' => 'TEST-001',
            'barcode' => '8991234567890',
            'brand' => 'Test Brand',
            'category' => 'Legacy Category',
            'product_status' => 'active',
            'inventory' => [
                'price' => 150000,
                'cost' => 100000,
                'total_stock' => 10,
                'weight' => 500,
            ],
        ]);

    $reflection = new ReflectionClass($this->service);
    $method = $reflection->getMethod('transformProductToJurnal');
    $method->setAccessible(true);
    $result = $method->invoke($this->service, $product->fresh('category'));

    expect($result['name'])->toBe('Test Product');
    expect($result['product_code'])->toBe('TEST-001');
    expect($result['custom_id'])->toBe('TEST-001');
    expect($result['track_inventory'])->toBeTrue();
    expect($result['archive'])->toBeFalse();
    expect($result['weight'])->toBe(500.0);
    expect($result['barcode'])->toBe('8991234567890');
    expect($result)->toHaveKey('sell_price_per_unit');
    expect($result)->toHaveKey('buy_price_per_unit');
});

it('creates product in jurnal and persists jurnal fields', function (): void {
    Event::fake([ProductSyncedToJurnal::class]);

    $product = Product::factory()->create([
        'jurnal_id' => null,
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with(
            'POST',
            '/public/jurnal/api/v1/products',
            \Mockery::on(fn ($options): bool => isset($options['body']['product']) && is_array($options['body']['product']))
        )
        ->andReturn([
            'product' => ['id' => 'jurnal-123'],
        ]);

    $response = $this->service->createProduct($product->fresh('category'));

    expect(data_get($response, 'product.id'))->toBe('jurnal-123');
    expect($product->fresh()->jurnal_id)->toBe('jurnal-123');
    expect($product->fresh()->last_synced_at)->not->toBeNull();
    Event::assertDispatched(ProductSyncedToJurnal::class);
});

it('updates product in jurnal when jurnal id exists', function (): void {
    Event::fake([ProductSyncedToJurnal::class]);

    $product = Product::factory()->withJurnal()->create([
        'jurnal_id' => 'jurnal-123',
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with(
            'PATCH',
            '/public/jurnal/api/v1/products/jurnal-123',
            \Mockery::on(fn ($options): bool => isset($options['body']['product']) && is_array($options['body']['product']))
        )
        ->andReturn([
            'product' => ['id' => 'jurnal-123'],
        ]);

    $response = $this->service->updateProduct($product->fresh('category'));

    expect(data_get($response, 'product.id'))->toBe('jurnal-123');
    expect($product->fresh()->jurnal_id)->toBe('jurnal-123');
    Event::assertDispatched(ProductSyncedToJurnal::class);
});

it('deletes product from jurnal and resets local jurnal fields', function (): void {
    $product = Product::factory()->withJurnal()->create([
        'jurnal_id' => 'jurnal-123',
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('DELETE', '/public/jurnal/api/v1/products/jurnal-123')
        ->andReturn([
            'success' => true,
        ]);

    $response = $this->service->deleteProduct($product);

    expect($response)->toBe(['success' => true]);
    expect($product->fresh()->jurnal_id)->toBeNull();
    expect($product->fresh()->last_synced_at)->not->toBeNull();
});

it('propagates exception from mekari service and stores failed sync status', function (): void {
    $product = Product::factory()->create();

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->andThrow(new RuntimeException('Mekari error'));

    try {
        $this->service->createProduct($product);
        $this->fail('Expected RuntimeException was not thrown.');
    } catch (RuntimeException $exception) {
        expect($exception->getMessage())->toBe('Mekari error');
    }

    $failedStatus = $product->fresh()->mekari_status ?? [];
    expect(data_get($failedStatus, 'sync_status'))->toBe('failed');
    expect(data_get($failedStatus, 'last_action'))->toBe('create');
    expect(data_get($failedStatus, 'last_error'))->toBe('Mekari error');
});

it('marks product as failed when minimum jurnal sync requirements are not met', function (): void {
    $product = Product::factory()->create([
        'spu' => null,
        'inventory' => [
            'price' => 0,
            'cost' => 0,
            'total_stock' => 2,
            'weight' => 100,
        ],
        'variant_pricing' => [],
    ]);

    $this->mekariMock->shouldNotReceive('request');

    try {
        $this->service->createProduct($product);
        $this->fail('Expected InvalidArgumentException was not thrown.');
    } catch (\InvalidArgumentException $exception) {
        expect($exception->getMessage())->toContain('SPU/SKU kosong');
        expect($exception->getMessage())->toContain('harga jual harus lebih dari 0');
    }

    $failedStatus = $product->fresh()->mekari_status ?? [];
    expect(data_get($failedStatus, 'sync_status'))->toBe('failed');
    expect(data_get($failedStatus, 'last_action'))->toBe('create');
    expect((string) data_get($failedStatus, 'last_error'))->toContain('tidak memenuhi syarat sinkronisasi Jurnal');
});

it('imports product image using fallback image fields from jurnal payload', function (): void {
    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-img-1',
                    'name' => 'Imported Product With Image',
                    'product_code' => 'IMG-001',
                    'quantity_available' => 3,
                    'sell_price_per_unit' => 250000,
                    'buy_price_per_unit' => 180000,
                    'images' => [
                        [
                            'url' => '/images/products/img-001.jpg',
                        ],
                    ],
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['created'])->toBe(1);
    expect($result['failed_count'])->toBe(0);

    $product = Product::query()->where('jurnal_id', 'jrnl-img-1')->first();
    expect($product)->not()->toBeNull();
    expect(data_get($product?->photos, '0.url'))->toBe('https://api.mekari.com/images/products/img-001.jpg');
    expect(data_get($product?->photos, '0.is_primary'))->toBeTrue();
});

it('imports barcode from jurnal product list payload', function (): void {
    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-barcode-list-1',
                    'name' => 'Imported Product With Barcode',
                    'product_code' => 'BARCODE-001',
                    'barcode' => '8990001112223',
                    'quantity_available' => 5,
                    'sell_price_per_unit' => 125000,
                    'buy_price_per_unit' => 85000,
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['created'])->toBe(1);
    expect($result['failed_count'])->toBe(0);

    $product = Product::query()->where('jurnal_id', 'jrnl-barcode-list-1')->first();
    expect($product)->not()->toBeNull();
    expect($product?->barcode)->toBe('8990001112223');
});

it('imports available qty and unit buy price aliases into stock and purchase price fields', function (): void {
    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-alias-1',
                    'name' => 'Imported Alias Product',
                    'product_code' => 'ALIAS-001',
                    'available_qty' => 12,
                    'sell_price_per_unit' => 225000,
                    'unit_buy_price' => 175000,
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['created'])->toBe(1);
    expect($result['failed_count'])->toBe(0);

    $product = Product::query()->where('jurnal_id', 'jrnl-alias-1')->first();
    expect($product)->not()->toBeNull();
    expect($product?->stock)->toBe(12);
    expect(data_get($product?->inventory, 'total_stock'))->toBe(12);
    expect((float) data_get($product?->inventory, 'cost'))->toBe(175000.0);
    expect(data_get($product?->variant_pricing, '0.stock'))->toBe(12);
    expect((float) data_get($product?->variant_pricing, '0.purchase_price'))->toBe(175000.0);
    expect((float) data_get($product?->variant_pricing, '0.purchase_price_idr'))->toBe(175000.0);
});

it('fetches jurnal product detail when product list payload does not include barcode', function (): void {
    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-barcode-detail-1',
                    'name' => 'Imported Product Missing Barcode',
                    'product_code' => 'BARCODE-DETAIL-001',
                    'quantity_available' => 3,
                    'sell_price_per_unit' => 210000,
                    'buy_price_per_unit' => 150000,
                    'images' => [
                        [
                            'url' => '/images/products/barcode-detail-001.jpg',
                        ],
                    ],
                ],
            ],
            'total_pages' => 1,
        ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products/jrnl-barcode-detail-1')
        ->andReturn([
            'product' => [
                'barcode' => '8999990001112',
            ],
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['created'])->toBe(1);
    expect($result['failed_count'])->toBe(0);

    $product = Product::query()->where('jurnal_id', 'jrnl-barcode-detail-1')->first();
    expect($product)->not()->toBeNull();
    expect($product?->barcode)->toBe('8999990001112');
    expect(data_get($product?->photos, '0.url'))->toBe('https://api.mekari.com/images/products/barcode-detail-001.jpg');
});

it('falls back to existing jurnal metadata barcode when remote barcode is empty', function (): void {
    $product = Product::factory()->create([
        'jurnal_id' => 'jrnl-barcode-fallback-1',
        'name' => 'Barcode Fallback Product',
        'barcode' => null,
        'jurnal_metadata' => [
            'product' => [
                'barcode' => '8991112223334',
            ],
        ],
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-barcode-fallback-1',
                    'name' => 'Barcode Fallback Product',
                    'product_code' => 'BARCODE-FALLBACK-001',
                    'barcode' => '',
                    'quantity_available' => 3,
                    'sell_price_per_unit' => 100000,
                    'buy_price_per_unit' => 70000,
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['updated'])->toBe(1);
    expect($result['failed_count'])->toBe(0);
    expect($product->fresh()->barcode)->toBe('8991112223334');
});

it('fetches jurnal product detail when product list payload does not include image', function (): void {
    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-img-detail-1',
                    'name' => 'Imported Product With Detail Image',
                    'product_code' => 'IMG-DETAIL-001',
                    'quantity_available' => 4,
                    'sell_price_per_unit' => 450000,
                    'buy_price_per_unit' => 300000,
                ],
            ],
            'total_pages' => 1,
        ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products/jrnl-img-detail-1')
        ->andReturn([
            'product' => [
                'images' => [
                    [
                        'url' => '/images/products/img-detail-001.jpg',
                    ],
                ],
            ],
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['created'])->toBe(1);
    expect($result['failed_count'])->toBe(0);

    $product = Product::query()->where('jurnal_id', 'jrnl-img-detail-1')->first();
    expect($product)->not()->toBeNull();
    expect(data_get($product?->photos, '0.url'))->toBe('https://api.mekari.com/images/products/img-detail-001.jpg');
});

it('preserves admin marketplace state when pulling product from jurnal', function (): void {
    $product = Product::factory()->create([
        'jurnal_id' => 'jrnl-locked-1',
        'name' => 'Locked Local Product',
        'spu' => 'LOCK-001',
        'stock' => 8,
        'inventory' => [
            'price' => 999000,
            'cost' => 650000,
            'total_stock' => 8,
            'weight' => 777,
        ],
        'variant_pricing' => [
            [
                'sku' => 'LOCK-001-A',
                'label' => 'Default',
                'stock' => 8,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => ['Gudang Utama' => 8],
                'offline_price' => 999000,
                'entraverse_price' => 1049000,
                'tiktok_price' => 1099000,
                'shopee_price' => 1079000,
                'sku_seller' => 'SELLER-LOCK-001',
            ],
        ],
        'jurnal_metadata' => [
            'local_marketplace_state' => [
                'locked' => true,
                'source' => 'admin_edit',
            ],
        ],
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-locked-1',
                    'name' => 'Locked Local Product',
                    'product_code' => 'LOCK-001',
                    'quantity_available' => 30,
                    'sell_price_per_unit' => 250000,
                    'buy_price_per_unit' => 180000,
                    'weight' => 1200,
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['updated'])->toBe(1);

    $fresh = $product->fresh();

    expect(data_get($fresh?->inventory, 'price'))->toBe(999000);
    expect(data_get($fresh?->inventory, 'total_stock'))->toBe(30);
    expect((float) data_get($fresh?->inventory, 'jurnal_price'))->toBe(250000.0);
    expect(data_get($fresh?->inventory, 'jurnal_total_stock'))->toBe(30);
    expect(data_get($fresh?->variant_pricing, '0.stock'))->toBe(30);
    expect(data_get($fresh?->variant_pricing, '0.warehouse_stock.Gudang Utama'))->toBe(30);
    expect(data_get($fresh?->variant_pricing, '0.entraverse_price'))->toBe(1049000);
    expect(data_get($fresh?->variant_pricing, '0.tiktok_price'))->toBe(1099000);
    expect(data_get($fresh?->variant_pricing, '0.sku_seller'))->toBe('SELLER-LOCK-001');
    expect(data_get($fresh?->jurnal_metadata, 'last_pull_snapshot.preserved_local_marketplace_state'))->toBeTrue();
});

it('updates shared warranty variants with jurnal stock when local marketplace state is preserved', function (): void {
    $product = Product::factory()->create([
        'jurnal_id' => 'jrnl-warranty-1',
        'name' => 'Warranty Shared Stock Product',
        'spu' => 'EASFC25C-NS',
        'stock' => 0,
        'inventory' => [
            'price' => 563723,
            'cost' => 400000,
            'total_stock' => 0,
            'weight' => 200,
            'warehouse' => 'Gudang Utama',
        ],
        'variant_pricing' => [
            [
                'sku' => 'EASFC25C-NS-Garansi-Tanpa Garansi',
                'label' => 'Garansi: Tanpa Garansi',
                'stock' => 0,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => ['Gudang Utama' => 0],
                'options' => ['Garansi' => 'Tanpa Garansi'],
                'entraverse_price' => 600000,
            ],
            [
                'sku' => 'EASFC25C-NS-Garansi-Toko - 1 Tahun',
                'label' => 'Garansi: Toko - 1 Tahun',
                'stock' => 0,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => ['Gudang Utama' => 0],
                'options' => ['Garansi' => 'Toko - 1 Tahun'],
                'entraverse_price' => 650000,
            ],
        ],
        'jurnal_metadata' => [
            'local_marketplace_state' => [
                'locked' => true,
                'source' => 'admin_edit',
            ],
        ],
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-warranty-1',
                    'name' => 'Warranty Shared Stock Product',
                    'product_code' => 'EASFC25C-NS',
                    'quantity_available' => 2,
                    'sell_price_per_unit' => 563723,
                    'buy_price_per_unit' => 400000,
                    'weight' => 200,
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['updated'])->toBe(1);

    $fresh = $product->fresh();

    expect(data_get($fresh?->inventory, 'total_stock'))->toBe(2);
    expect(data_get($fresh?->variant_pricing, '0.stock'))->toBe(2);
    expect(data_get($fresh?->variant_pricing, '0.warehouse_stock.Gudang Utama'))->toBe(2);
    expect(data_get($fresh?->variant_pricing, '1.stock'))->toBe(2);
    expect(data_get($fresh?->variant_pricing, '1.warehouse_stock.Gudang Utama'))->toBe(2);
});

it('preserves local product photos when pulling jurnal data after admin media edits', function (): void {
    $product = Product::factory()->create([
        'jurnal_id' => 'jrnl-photo-lock-1',
        'name' => 'Locked Photo Product',
        'spu' => 'PHOTO-001',
        'photos' => [
            [
                'url' => '/storage/products/local-photo-001.jpg',
                'alt' => 'Local Photo',
                'is_primary' => true,
            ],
        ],
        'jurnal_metadata' => [
            'local_media_state' => [
                'locked' => true,
                'source' => 'admin_edit',
            ],
        ],
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products', [
            'query' => [
                'page' => 1,
                'per_page' => 1,
            ],
        ])
        ->andReturn([
            'products' => [
                [
                    'id' => 'jrnl-photo-lock-1',
                    'name' => 'Locked Photo Product',
                    'product_code' => 'PHOTO-001',
                    'quantity_available' => 7,
                    'sell_price_per_unit' => 500000,
                    'buy_price_per_unit' => 350000,
                    'images' => [
                        [
                            'url' => '/images/products/remote-photo-001.jpg',
                        ],
                    ],
                ],
            ],
            'total_pages' => 1,
        ]);

    $result = $this->service->importProductsFromJurnal([
        'page' => 1,
        'per_page' => 1,
    ], 1);

    expect($result['updated'])->toBe(1);

    $fresh = $product->fresh();

    expect(data_get($fresh?->photos, '0.url'))->toBe('/storage/products/local-photo-001.jpg');
    expect(data_get($fresh?->photos, '0.alt'))->toBe('Local Photo');
    expect(data_get($fresh?->photos, '1.url'))->toBe('https://api.mekari.com/images/products/remote-photo-001.jpg');
    expect(data_get($fresh?->jurnal_metadata, 'last_pull_snapshot.preserved_local_photo_state'))->toBeTrue();
});

it('syncs by updating existing remote product found by custom id', function (): void {
    Event::fake([ProductSyncedToJurnal::class]);

    $product = Product::factory()->create([
        'spu' => 'TEST-UPSERT-001',
        'jurnal_id' => null,
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products/TEST-UPSERT-001')
        ->andReturn([
            'product' => ['id' => 987654],
        ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with(
            'PATCH',
            '/public/jurnal/api/v1/products/987654',
            \Mockery::on(fn ($options): bool => isset($options['body']['product']) && is_array($options['body']['product']))
        )
        ->andReturn([
            'product' => ['id' => 987654],
        ]);

    $response = $this->service->syncProduct($product->fresh('category'));

    expect(data_get($response, 'product.id'))->toBe(987654);
    expect($product->fresh()->jurnal_id)->toBe('987654');
    Event::assertDispatched(ProductSyncedToJurnal::class);
});

it('syncs by creating product when custom id does not exist remotely', function (): void {
    Event::fake([ProductSyncedToJurnal::class]);

    $product = Product::factory()->create([
        'spu' => 'TEST-UPSERT-404',
        'jurnal_id' => null,
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('GET', '/public/jurnal/api/v1/products/TEST-UPSERT-404')
        ->andThrow(new MekariApiException('Not found', 404, ['error' => 'not_found']));

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with(
            'POST',
            '/public/jurnal/api/v1/products',
            \Mockery::on(fn ($options): bool => isset($options['body']['product']) && is_array($options['body']['product']))
        )
        ->andReturn([
            'product' => ['id' => 123123],
        ]);

    $response = $this->service->syncProduct($product->fresh('category'));

    expect(data_get($response, 'product.id'))->toBe(123123);
    expect($product->fresh()->jurnal_id)->toBe('123123');
    Event::assertDispatched(ProductSyncedToJurnal::class);
});

it('archives product in jurnal', function (): void {
    $product = Product::factory()->withJurnal()->create([
        'jurnal_id' => 'jurnal-archive-1',
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('POST', '/public/jurnal/api/v1/products/jurnal-archive-1/deactivate')
        ->andReturn(['success' => true]);

    $response = $this->service->archiveProduct($product);

    expect($response)->toBe(['success' => true]);
    expect(data_get($product->fresh()->mekari_status, 'sync_status'))->toBe('archived');
    expect(data_get($product->fresh()->mekari_status, 'last_action'))->toBe('archive');
});

it('unarchives product in jurnal', function (): void {
    $product = Product::factory()->withJurnal()->create([
        'jurnal_id' => 'jurnal-unarchive-1',
    ]);

    $this->mekariMock
        ->shouldReceive('request')
        ->once()
        ->with('POST', '/public/jurnal/api/v1/products/jurnal-unarchive-1/activate')
        ->andReturn(['success' => true]);

    $response = $this->service->unarchiveProduct($product);

    expect($response)->toBe(['success' => true]);
    expect(data_get($product->fresh()->mekari_status, 'sync_status'))->toBe('active');
    expect(data_get($product->fresh()->mekari_status, 'last_action'))->toBe('unarchive');
});
