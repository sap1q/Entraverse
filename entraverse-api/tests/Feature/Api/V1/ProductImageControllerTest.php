<?php

declare(strict_types=1);

use App\Models\Admin;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->admin = Admin::factory()->superAdmin()->create();
});

test('admin can save product with uploaded image and receives product image endpoint url', function (): void {
    Sanctum::actingAs($this->admin, ['*']);
    Storage::fake('public');

    $response = $this->post('/api/v1/admin/products', [
        'name' => 'Produk Preview',
        'category' => 'Kacamata',
        'brand' => 'Entraverse',
        'images' => [
            UploadedFile::fake()->image('produk-preview.jpg', 1200, 800),
        ],
    ], [
        'Accept' => 'application/json',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.name', 'Produk Preview')
        ->assertJsonPath('data.photos.0.is_primary', true);

    $photoUrl = (string) $response->json('data.photos.0.url');
    $mainImage = (string) $response->json('data.main_image');

    expect($photoUrl)->toContain('/api/v1/products/image/products/');
    expect($mainImage)->toBe($photoUrl);

    $storedPhotoPath = (string) data_get(Product::query()->first()?->photos, '0.url', '');
    expect($storedPhotoPath)->toStartWith('/storage/products/');
});

test('product resource rewrites legacy storage product urls to the product image endpoint', function (): void {
    $product = Product::factory()->create([
        'photos' => [
            [
                'url' => '/storage/products/legacy-product.jpg',
                'is_primary' => true,
            ],
        ],
    ]);

    $response = $this->getJson("/api/v1/products/{$product->id}");

    $response
        ->assertOk()
        ->assertJsonPath('data.main_image', route('v1.products.image', ['path' => 'products/legacy-product.jpg']))
        ->assertJsonPath('data.photos.0.url', route('v1.products.image', ['path' => 'products/legacy-product.jpg']));
});

test('product resource keeps external product image urls unchanged', function (): void {
    $product = Product::factory()->create([
        'photos' => [
            [
                'url' => 'https://api.mekari.com/images/products/quest-3.jpg',
                'is_primary' => true,
            ],
        ],
    ]);

    $response = $this->getJson("/api/v1/products/{$product->id}");

    $response
        ->assertOk()
        ->assertJsonPath('data.main_image', 'https://api.mekari.com/images/products/quest-3.jpg')
        ->assertJsonPath('data.photos.0.url', 'https://api.mekari.com/images/products/quest-3.jpg');
});

test('admin product update locks local media state for future jurnal pulls', function (): void {
    Sanctum::actingAs($this->admin, ['*']);

    $product = Product::factory()->create([
        'photos' => [
            [
                'url' => '/storage/products/original-product.jpg',
                'is_primary' => true,
            ],
        ],
        'jurnal_metadata' => [
            'product' => [
                'id' => 'jrnl-photo-lock-1',
            ],
        ],
    ]);

    $response = $this->putJson("/api/v1/admin/products/{$product->id}", [
        'name' => $product->name,
        'category' => $product->category,
        'brand' => $product->brand,
        'photos' => [
            '/storage/products/original-product.jpg',
        ],
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('data.photos.0.url', route('v1.products.image', ['path' => 'products/original-product.jpg']))
        ->assertJsonPath('data.jurnal_metadata.local_media_state.locked', true)
        ->assertJsonPath('data.jurnal_metadata.local_media_state.source', 'admin_edit');
});

test('admin can save shared variant image uploads and receives normalized urls', function (): void {
    Sanctum::actingAs($this->admin, ['*']);
    Storage::fake('public');

    $response = $this->post('/api/v1/admin/products', [
        'name' => 'Produk Varian',
        'category' => 'Kacamata',
        'brand' => 'Entraverse',
        'variant_pricing' => json_encode([
            [
                'label' => 'Garansi: Tanpa Garansi / Memori: 128 GB',
                'options' => [
                    'Garansi' => 'Tanpa Garansi',
                    'Memori' => '128 GB',
                ],
                'shared_variant_image_key' => 'memory:128-gb',
                'stock' => 2,
            ],
            [
                'label' => 'Garansi: Toko - 1 Tahun / Memori: 128 GB',
                'options' => [
                    'Garansi' => 'Toko - 1 Tahun',
                    'Memori' => '128 GB',
                ],
                'shared_variant_image_key' => 'memory:128-gb',
                'stock' => 1,
            ],
        ]),
        'variant_image_file__memory:128-gb' => UploadedFile::fake()->image('variant-memory-128.jpg', 1200, 800),
    ], [
        'Accept' => 'application/json',
    ]);

    $response
        ->assertCreated()
        ->assertJsonCount(2, 'data.variant_pricing')
        ->assertJsonPath('data.variant_pricing.0.shared_variant_image_key', 'memory:128-gb')
        ->assertJsonPath('data.variant_pricing.1.shared_variant_image_key', 'memory:128-gb');

    $variantImageUrlA = (string) $response->json('data.variant_pricing.0.variant_image');
    $variantImageUrlB = (string) $response->json('data.variant_pricing.1.variant_image');

    expect($variantImageUrlA)->toContain('/api/v1/products/image/products/variants/');
    expect($variantImageUrlB)->toBe($variantImageUrlA);

    $storedVariantPricing = Product::query()->first()?->variant_pricing ?? [];
    $storedVariantImageA = (string) data_get($storedVariantPricing, '0.variant_image', '');
    $storedVariantImageB = (string) data_get($storedVariantPricing, '1.variant_image', '');

    expect($storedVariantImageA)->toStartWith('/storage/products/variants/');
    expect($storedVariantImageB)->toBe($storedVariantImageA);
});

test('public product image endpoint serves stored product files', function (): void {
    Storage::fake('public');
    $file = UploadedFile::fake()->image('product-image.jpg', 800, 600);
    Storage::disk('public')->putFileAs('products', $file, 'product-image.jpg');

    $response = $this->get('/api/v1/products/image/products/product-image.jpg');

    $response->assertOk();
});
