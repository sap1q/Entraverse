<?php

declare(strict_types=1);

use App\Models\Admin;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->admin = Admin::factory()->superAdmin()->create();
});

test('inventory index includes available stock stats and row totals', function (): void {
    Sanctum::actingAs($this->admin, ['*']);

    Product::factory()->create([
        'name' => 'Meta Quest 3',
        'spu' => 'MQ3-512GB',
        'stock' => 9,
        'inventory' => [
            'price' => 15000000,
            'total_stock' => 9,
            'weight' => 1200,
        ],
        'variant_pricing' => [
            [
                'sku' => 'MQ3-512GB',
                'label' => 'Default',
                'stock' => 9,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => [
                    'Gudang Utama' => 4,
                    'Gudang Display' => 5,
                ],
            ],
        ],
    ]);

    $response = $this->getJson('/api/v1/admin/stocks');

    $response
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('stats.total_sku', 1)
        ->assertJsonPath('stats.available_stock', 9)
        ->assertJsonPath('data.0.current_stock', 4)
        ->assertJsonPath('data.0.available_stock', 9);
});

test('inventory safe filter only includes stock above five', function (): void {
    Sanctum::actingAs($this->admin, ['*']);

    Product::factory()->create([
        'name' => 'Safe Stock Product',
        'spu' => 'SAFE-001',
        'stock' => 6,
        'inventory' => [
            'price' => 1000000,
            'total_stock' => 6,
            'weight' => 1000,
        ],
        'variant_pricing' => [
            [
                'sku' => 'SAFE-001',
                'label' => 'Default',
                'stock' => 6,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => [
                    'Gudang Utama' => 6,
                ],
            ],
        ],
    ]);

    Product::factory()->create([
        'name' => 'Low Stock Product',
        'spu' => 'LOW-001',
        'stock' => 5,
        'inventory' => [
            'price' => 900000,
            'total_stock' => 5,
            'weight' => 900,
        ],
        'variant_pricing' => [
            [
                'sku' => 'LOW-001',
                'label' => 'Default',
                'stock' => 5,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => [
                    'Gudang Utama' => 5,
                ],
            ],
        ],
    ]);

    $response = $this->getJson('/api/v1/admin/stocks?status=safe');

    $response
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.sku', 'SAFE-001')
        ->assertJsonPath('data.0.status', 'safe');
});

test('inventory uses shared stock fallback for warranty-only variants imported from jurnal', function (): void {
    Sanctum::actingAs($this->admin, ['*']);

    Product::factory()->create([
        'name' => 'EA Sport FC 25 Cartridge - Nintendo Switch',
        'spu' => 'EASFC25C-NS',
        'stock' => 2,
        'inventory' => [
            'price' => 563723,
            'total_stock' => 2,
            'weight' => 200,
            'warehouse' => 'Gudang Utama',
        ],
        'variant_pricing' => [
            [
                'sku' => 'EASFC25C-NS-Garansi-Tanpa Garansi',
                'label' => 'Garansi: Tanpa Garansi',
                'stock' => 0,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => [
                    'Gudang Utama' => 0,
                ],
                'options' => [
                    'Garansi' => 'Tanpa Garansi',
                ],
            ],
            [
                'sku' => 'EASFC25C-NS-Garansi-Toko - 1 Tahun',
                'label' => 'Garansi: Toko - 1 Tahun',
                'stock' => 0,
                'warehouse' => 'Gudang Utama',
                'warehouse_stock' => [
                    'Gudang Utama' => 0,
                ],
                'options' => [
                    'Garansi' => 'Toko - 1 Tahun',
                ],
            ],
        ],
    ]);

    $response = $this->getJson('/api/v1/admin/stocks?search=EASFC25C-NS');

    $response
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('stats.available_stock', 2)
        ->assertJsonPath('data.0.current_stock', 2)
        ->assertJsonPath('data.0.available_stock', 2)
        ->assertJsonPath('data.1.current_stock', 2)
        ->assertJsonPath('data.1.available_stock', 2);
});
