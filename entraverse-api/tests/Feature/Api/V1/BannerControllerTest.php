<?php

declare(strict_types=1);

use App\Models\Admin;
use App\Models\Banner;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function (): void {
    $this->admin = Admin::factory()->superAdmin()->create();
});

test('admin can upload banner without exact legacy dimensions', function (): void {
    Sanctum::actingAs($this->admin, ['*']);
    Storage::fake('public');

    $response = $this->post('/api/v1/admin/banners', [
        'title' => 'Promo Lebaran',
        'alt_text' => 'Banner promo Lebaran',
        'is_active' => '1',
        'image' => UploadedFile::fake()->image('promo-banner.jpg', 1600, 900),
    ], [
        'Accept' => 'application/json',
    ]);

    $response
        ->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.title', 'Promo Lebaran');

    $imagePath = (string) $response->json('data.image_path');
    $imageUrl = (string) $response->json('data.image_url');

    expect($imagePath)->toStartWith('banners/');
    expect($imageUrl)->toContain('/api/v1/banners/image/banners/');

    Storage::disk('public')->assertExists($imagePath);
});

test('active banner response rewrites image url to the public banner image endpoint', function (): void {
    Banner::query()->create([
        'id' => (string) Str::uuid(),
        'title' => 'Banner Existing',
        'alt_text' => 'Preview banner existing',
        'image_path' => 'banners/existing-banner.jpg',
        'image_url' => 'http://localhost:8000/storage/banners/existing-banner.jpg',
        'link_url' => null,
        'order' => 1,
        'is_active' => true,
    ]);

    $response = $this->getJson('/api/v1/banners/active');

    $response
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath(
            'data.0.image_url',
            route('banners.image', ['path' => 'banners/existing-banner.jpg'])
        );
});

test('public banner image endpoint serves stored banner files', function (): void {
    Storage::fake('public');
    $file = UploadedFile::fake()->image('existing-banner.jpg', 1200, 600);
    Storage::disk('public')->putFileAs('banners', $file, 'existing-banner.jpg');

    $response = $this->get('/api/v1/banners/image/banners/existing-banner.jpg');

    $response->assertOk();
});
