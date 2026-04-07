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
        ->assertJsonPath('data.main_image', route('products.image', ['path' => 'products/legacy-product.jpg']))
        ->assertJsonPath('data.photos.0.url', route('products.image', ['path' => 'products/legacy-product.jpg']));
});

test('public product image endpoint serves stored product files', function (): void {
    Storage::fake('public');
    $file = UploadedFile::fake()->image('product-image.jpg', 800, 600);
    Storage::disk('public')->putFileAs('products', $file, 'product-image.jpg');

    $response = $this->get('/api/v1/products/image/products/product-image.jpg');

    $response->assertOk();
});
