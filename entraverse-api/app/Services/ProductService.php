<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Repositories\ProductCatalogRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ProductService
{
    private const DEFAULT_WAREHOUSE = 'Gudang Utama';

    public function __construct(
        private readonly ProductCatalogRepository $catalog,
        private readonly ProductPricingService $pricing,
        private readonly ProductMediaService $media,
    ) {
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        return $this->catalog->paginate($filters);
    }

    /**
     * @return array{products: \Illuminate\Support\Collection<int, Product>, keywords: array<int, string>}
     */
    public function suggest(string $search, int $limit = 6): array
    {
        return $this->catalog->suggest($search, $limit);
    }

    public function findPublicByIdentifierOrSlug(string $identifier): ?Product
    {
        return $this->catalog->findPublicByIdentifierOrSlug($identifier);
    }

public function store(array $validated, array $images = [], array $variantImageFiles = []): Product
    {
        $payload = $this->buildPayload($validated, null, $images, $variantImageFiles);
        return Product::query()->create($payload);
    }

public function update(Product $product, array $validated, array $images = [], array $variantImageFiles = []): Product
    {
        $payload = $this->buildPayload($validated, $product, $images, $variantImageFiles);
        $product->update($payload);
        return $product->refresh();
    }

public function repriceProductsForCategory(Category $category): int
    {
        $categoryName = $this->cleanText((string) $category->name);
        $normalizedCategoryName = strtolower($categoryName);

        $products = Product::query()
            ->where(function (Builder $query) use ($category, $normalizedCategoryName): void {
                $query->where('category_id', $category->id);

                if ($normalizedCategoryName !== '') {
                    $query->orWhereRaw('LOWER(category) = ?', [$normalizedCategoryName]);
                }
            })
            ->get();

        $updatedCount = 0;

        foreach ($products as $product) {
            $recalculatedVariantPricing = $this->pricing->recalculateVariantPricing(
                is_array($product->variant_pricing) ? $product->variant_pricing : [],
                $category
            );

            $nextCategoryName = $categoryName !== '' ? $categoryName : (string) $product->category;
            $shouldUpdateProduct = $recalculatedVariantPricing !== (is_array($product->variant_pricing) ? $product->variant_pricing : [])
                || (string) ($product->category_id ?? '') !== (string) $category->id
                || (string) ($product->category ?? '') !== $nextCategoryName;

            if (! $shouldUpdateProduct) {
                continue;
            }

            $product->forceFill([
                'category_id' => (string) $category->id,
                'category' => $nextCategoryName,
                'variant_pricing' => $recalculatedVariantPricing,
            ])->save();

            $updatedCount++;
        }

        return $updatedCount;
    }

private function buildPayload(array $validated, ?Product $product, array $uploadedImages, array $variantImageFiles = []): array
    {
        $existingInventory = is_array($product?->inventory) ? $product->inventory : [];
        $existingJurnalMetadata = is_array($product?->jurnal_metadata) ? $product->jurnal_metadata : [];
        $requestedInventory = is_array($validated['inventory'] ?? null) ? $validated['inventory'] : [];
        $inventory = array_merge($existingInventory, $requestedInventory);

        if (array_key_exists('price', $validated)) {
            $inventory['price'] = (float) $validated['price'];
        }
        if (array_key_exists('weight', $validated)) {
            $inventory['weight'] = (int) $validated['weight'];
        }
        $inventory = $this->normalizeInventory($inventory);

        $uploadedVariantImageUrls = $this->media->resolveVariantImageUploads($variantImageFiles);
        $variantPricing = $this->normalizeVariantPricing(
            $validated['variant_pricing'] ?? ($product?->variant_pricing ?? []),
            $uploadedVariantImageUrls
        );

        $calculatedStock = $this->calculateTotalStock(
            $variantPricing,
            $validated['stock'] ?? null,
            $inventory['total_stock'] ?? null,
            $product?->stock
        );
        $inventory['total_stock'] = $calculatedStock;
        $categoryId = (string) ($validated['category_id'] ?? $product?->category_id ?? '');
        $categoryName = $this->cleanText((string) ($validated['category'] ?? $product?->category ?? ''));
        $category = $this->pricing->resolveCategoryForPricing($categoryId, $categoryName);
        $brandId = $this->cleanText((string) ($validated['brand_id'] ?? $product?->brand_id ?? ''));
        $brandName = $this->cleanText((string) ($validated['brand'] ?? $product?->brand ?? ''));
        [$brandId, $brandName] = $this->resolveBrandReference($brandId, $brandName);

        if ($categoryName === '' && $categoryId !== '') {
            $categoryName = (string) (Category::query()->where('id', $categoryId)->value('name') ?? '');
        }

        $variantPricing = $this->pricing->recalculateVariantPricing($variantPricing, $category);
        $hasExplicitStatusInput = array_key_exists('status', $validated) || array_key_exists('product_status', $validated);
        $status = $this->resolveStatusValue(
            $validated['status'] ?? null,
            $validated['product_status'] ?? null,
            $product?->status,
            $product?->product_status
        );
        $productStatus = $hasExplicitStatusInput
            ? $this->mapStatusToLegacyProductStatus($status)
            : (string) ($product?->product_status ?? $this->mapStatusToLegacyProductStatus($status));
        $stockStatus = $this->resolveStockStatusValue(
            $validated['stock_status'] ?? null,
            $calculatedStock,
            $product?->stock_status
        );
        $barcode = $this->cleanText((string) ($validated['barcode'] ?? $product?->barcode ?? ''));
        $barcode = $barcode !== '' ? $barcode : null;
        $isFeatured = array_key_exists('is_featured', $validated)
            ? (bool) $validated['is_featured']
            : (bool) ($product?->is_featured ?? false);
        $jurnalMetadata = $existingJurnalMetadata;

        if ($this->shouldLockMarketplaceState($validated)) {
            $jurnalMetadata['local_marketplace_state'] = [
                ...((is_array($existingJurnalMetadata['local_marketplace_state'] ?? null)
                    ? $existingJurnalMetadata['local_marketplace_state']
                    : [])),
                'locked' => true,
                'source' => 'admin_edit',
                'updated_at' => now()->toISOString(),
            ];
        }

        if ($this->shouldLockProductMediaState($validated, $uploadedImages, $variantImageFiles)) {
            $jurnalMetadata['local_media_state'] = [
                ...((is_array($existingJurnalMetadata['local_media_state'] ?? null)
                    ? $existingJurnalMetadata['local_media_state']
                    : [])),
                'locked' => true,
                'source' => 'admin_edit',
                'updated_at' => now()->toISOString(),
            ];
        }

        return [
            'name' => $this->cleanText((string) ($validated['name'] ?? $product?->name ?? '')),
            'category' => $categoryName,
            'category_id' => $categoryId !== '' ? $categoryId : null,
            'brand' => $brandName,
            'brand_id' => $brandId !== '' ? $brandId : null,
            'description' => $this->cleanDescription((string) ($validated['description'] ?? $product?->description ?? '')),
            'trade_in' => (bool) ($validated['trade_in'] ?? $product?->trade_in ?? false),
            'barcode' => $barcode,
            'inventory' => $inventory,
            'variants' => $this->normalizeVariantsWithDefaults($validated['variants'] ?? ($product?->variants ?? [])),
            'variant_pricing' => $variantPricing,
            'photos' => $this->media->resolvePhotos($validated['photos'] ?? null, $uploadedImages, $product?->photos ?? []),
            'spu' => $validated['spu'] ?? $product?->spu ?? $this->generateSpu((string) ($validated['brand'] ?? $product?->brand ?? 'ENTRAVERSE')),
            'jurnal_metadata' => $jurnalMetadata !== [] ? $jurnalMetadata : null,
            'product_status' => $productStatus,
            'status' => $status,
            'is_featured' => $isFeatured,
            'stock_status' => $stockStatus,
            'stock' => $calculatedStock,
        ];
    }

private function shouldLockMarketplaceState(array $validated): bool
    {
        if (array_key_exists('variant_pricing', $validated) || array_key_exists('variants', $validated)) {
            return true;
        }

        if (array_key_exists('price', $validated) || array_key_exists('weight', $validated)) {
            return true;
        }

        $inventory = is_array($validated['inventory'] ?? null) ? $validated['inventory'] : [];

        return array_key_exists('price', $inventory)
            || array_key_exists('weight', $inventory)
            || array_key_exists('total_stock', $inventory);
    }

private function shouldLockProductMediaState(array $validated, array $uploadedImages, array $variantImageFiles = []): bool
    {
        if (array_key_exists('photos', $validated) || $uploadedImages !== [] || $variantImageFiles !== []) {
            return true;
        }

        $variantPricing = is_array($validated['variant_pricing'] ?? null) ? $validated['variant_pricing'] : [];
        foreach ($variantPricing as $item) {
            if (! is_array($item)) {
                continue;
            }

            if (
                array_key_exists('variant_image', $item)
                || array_key_exists('shared_variant_image_key', $item)
                || array_key_exists('variant_image_key', $item)
            ) {
                return true;
            }
        }

        return false;
    }

private function normalizeVariantPricing(mixed $value, array $uploadedVariantImageUrls = []): array
    {
        if (! is_array($value)) {
            return [];
        }

        $normalized = [];
        foreach ($value as $item) {
            if (! is_array($item)) {
                continue;
            }

            $stock = max(0, (int) ($item['stock'] ?? 0));
            $warehouse = trim((string) ($item['warehouse'] ?? ''));
            $warehouse = $warehouse !== '' ? $warehouse : self::DEFAULT_WAREHOUSE;
            $warehouseStock = $this->normalizeWarehouseStock(
                $item['warehouse_stock'] ?? null,
                $warehouse,
                $stock
            );

            $item['warehouse_stock'] = $warehouseStock;
            $item['warehouse'] = (string) (array_key_first($warehouseStock) ?? $warehouse);
            $item['stock'] = (int) array_sum($warehouseStock);
            $item['purchase_price'] = (float) ($item['purchase_price'] ?? 0);
            $item['purchase_price_idr'] = (float) ($item['purchase_price_idr'] ?? 0);
            $item['margin_percent'] = (float) ($item['margin_percent'] ?? 0);

            $sharedVariantImageKey = $this->cleanText((string) ($item['shared_variant_image_key'] ?? $item['variant_image_key'] ?? ''));
            if ($sharedVariantImageKey !== '') {
                $item['shared_variant_image_key'] = $sharedVariantImageKey;
            }

            $variantImage = trim((string) ($item['variant_image'] ?? ''));
            if ($sharedVariantImageKey !== '' && array_key_exists($sharedVariantImageKey, $uploadedVariantImageUrls)) {
                $variantImage = $uploadedVariantImageUrls[$sharedVariantImageKey];
            }

            if ($this->media->isPersistableMediaPath($variantImage)) {
                $item['variant_image'] = $variantImage;
            } else {
                unset($item['variant_image']);
            }

            $normalized[] = $this->media->normalizeArray($item);
        }

        return $normalized;
    }

private function resolveBrandReference(string $brandId, string $brandName): array
    {
        $brand = null;

        if ($brandId !== '') {
            $brand = Brand::query()->find($brandId);
        }

        if (! $brand && $brandName !== '') {
            $normalized = strtolower($brandName);
            $brand = Brand::query()
                ->whereRaw('LOWER(name) = ?', [$normalized])
                ->orWhereRaw('LOWER(slug) = ?', [$normalized])
                ->first();
        }

        if ($brand) {
            return [(string) $brand->id, $this->cleanText((string) $brand->name)];
        }

        return ['', $brandName];
    }

private function normalizeWarehouseStock(mixed $warehouseStock, string $fallbackWarehouse, int $fallbackStock): array
    {
        $normalized = [];

        if (is_array($warehouseStock)) {
            foreach ($warehouseStock as $warehouse => $qty) {
                $warehouseName = trim(is_string($warehouse) ? $warehouse : '');
                if ($warehouseName === '') {
                    continue;
                }

                $normalized[$warehouseName] = max(0, (int) $qty);
            }
        }

        if ($normalized === []) {
            $normalized[$fallbackWarehouse] = max(0, $fallbackStock);
        }

        return $normalized;
    }

private function calculateTotalStock(array $variantPricing, mixed $fallbackStock, mixed $inventoryStock, mixed $currentStock): int
    {
        $fromVariants = (int) collect($variantPricing)->sum(fn (array $item) => (int) ($item['stock'] ?? 0));
        if ($fromVariants > 0 || ($variantPricing !== [] && $fromVariants === 0)) {
            return $fromVariants;
        }

        if ($fallbackStock !== null) {
            return max(0, (int) $fallbackStock);
        }

        if ($inventoryStock !== null) {
            return max(0, (int) $inventoryStock);
        }

        return max(0, (int) ($currentStock ?? 0));
    }

private function normalizeStatusFilter(string $status): ?string
    {
        return match ($status) {
            'active' => 'active',
            'inactive' => 'inactive',
            'draft', 'pending', 'pending_approval', 'archived' => 'draft',
            default => null,
        };
    }

private function normalizeBooleanFilter(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return ((int) $value) === 1;
        }

        $normalized = strtolower(trim((string) $value));
        return match ($normalized) {
            '1', 'true', 'yes', 'on' => true,
            '0', 'false', 'no', 'off' => false,
            default => null,
        };
    }

private function mapLegacyProductStatusToStatus(string $legacyStatus): string
    {
        return match (strtolower(trim($legacyStatus))) {
            'active' => 'active',
            'inactive' => 'inactive',
            default => 'draft',
        };
    }

private function mapStatusToLegacyProductStatus(string $status): string
    {
        return match (strtolower(trim($status))) {
            'active' => 'active',
            'inactive' => 'inactive',
            default => 'pending_approval',
        };
    }

private function resolveStatusValue(
        mixed $statusInput,
        mixed $legacyStatusInput,
        mixed $existingStatus,
        mixed $existingLegacyStatus
    ): string {
        $normalizedStatus = $this->normalizeStatusFilter(strtolower(trim((string) $statusInput)));
        if ($normalizedStatus !== null) {
            return $normalizedStatus;
        }

        $normalizedLegacy = strtolower(trim((string) $legacyStatusInput));
        if ($normalizedLegacy !== '') {
            return $this->mapLegacyProductStatusToStatus($normalizedLegacy);
        }

        $currentStatus = $this->normalizeStatusFilter(strtolower(trim((string) $existingStatus)));
        if ($currentStatus !== null) {
            return $currentStatus;
        }

        $legacyStatus = strtolower(trim((string) $existingLegacyStatus));
        if ($legacyStatus !== '') {
            return $this->mapLegacyProductStatusToStatus($legacyStatus);
        }

        return 'active';
    }

private function resolveStockStatusValue(mixed $input, int $calculatedStock, mixed $existingStockStatus): string
    {
        $normalizedInput = strtolower(trim((string) $input));
        if (in_array($normalizedInput, ['in_stock', 'out_of_stock', 'preorder'], true)) {
            return $normalizedInput;
        }

        $normalizedExisting = strtolower(trim((string) $existingStockStatus));
        if ($normalizedInput === '' && in_array($normalizedExisting, ['in_stock', 'out_of_stock', 'preorder'], true)) {
            return $normalizedExisting;
        }

        return $calculatedStock <= 0 ? 'out_of_stock' : 'in_stock';
    }

private function normalizeInventory(array $inventory): array
    {
        $dimensions = is_array($inventory['dimensions_cm'] ?? null) ? $inventory['dimensions_cm'] : [];

        $inventory['dimensions_cm'] = [
            'length' => max(0, (float) ($dimensions['length'] ?? 0)),
            'width' => max(0, (float) ($dimensions['width'] ?? 0)),
            'height' => max(0, (float) ($dimensions['height'] ?? 0)),
        ];

        $inventory['volume_m3'] = max(0, (float) ($inventory['volume_m3'] ?? 0));

        if (array_key_exists('weight', $inventory)) {
            $inventory['weight'] = max(0, (int) $inventory['weight']);
        }

        if (array_key_exists('total_stock', $inventory)) {
            $inventory['total_stock'] = max(0, (int) $inventory['total_stock']);
        }

        if (array_key_exists('price', $inventory)) {
            $inventory['price'] = max(0, (float) $inventory['price']);
        }

        return $inventory;
    }

private function normalizeVariantsWithDefaults(mixed $value): array
    {
        $variants = $this->media->normalizeArray($value);
        $rows = [];

        foreach ($variants as $variant) {
            if (! is_array($variant)) {
                continue;
            }

            $name = $this->cleanText((string) ($variant['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $options = [];
            $rawOptions = is_array($variant['options'] ?? null) ? $variant['options'] : [];
            foreach ($rawOptions as $option) {
                $cleanOption = $this->cleanText((string) $option);
                if ($cleanOption !== '') {
                    $options[] = $cleanOption;
                }
            }

            $rows[] = [
                'name' => $name,
                'options' => array_values(array_unique($options)),
            ];
        }

        $warrantyIndex = null;
        foreach ($rows as $index => $variant) {
            if (strtolower((string) ($variant['name'] ?? '')) === strtolower(ProductPricingService::DEFAULT_WARRANTY_VARIANT_NAME)) {
                $warrantyIndex = $index;
                break;
            }
        }

        if ($warrantyIndex === null) {
            $rows[] = [
                'name' => ProductPricingService::DEFAULT_WARRANTY_VARIANT_NAME,
                'options' => ProductPricingService::DEFAULT_WARRANTY_OPTIONS,
            ];
        } else {
            $existingOptions = is_array($rows[$warrantyIndex]['options'] ?? null) ? $rows[$warrantyIndex]['options'] : [];
            $rows[$warrantyIndex]['name'] = ProductPricingService::DEFAULT_WARRANTY_VARIANT_NAME;
            $rows[$warrantyIndex]['options'] = array_values(array_unique([
                ...ProductPricingService::DEFAULT_WARRANTY_OPTIONS,
                ...$existingOptions,
            ]));
        }

        return $rows;
    }

private function cleanText(string $value): string
    {
        return trim(strip_tags($value));
    }

private function cleanDescription(string $value): ?string
    {
        $normalizedInput = $this->normalizeDescriptionInput($value);
        if ($normalizedInput === '') {
            return null;
        }

        $withoutDangerousTags = preg_replace(
            '/<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)[^>]*>.*?<\/\1>/is',
            '',
            $normalizedInput
        );

        $safeHtml = preg_replace(
            '/\son\w+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i',
            '',
            $withoutDangerousTags ?? $normalizedInput
        );

        $safeHtml = preg_replace(
            '/\s(href|src)\s*=\s*("|\')\s*javascript:[^"\']*("|\')/i',
            '',
            $safeHtml ?? ''
        );

        $allowedTags = '<p><br><strong><b><em><i><u><ul><ol><li><h2><h3><blockquote>';
        $sanitized = strip_tags($safeHtml ?? '', $allowedTags);
        $sanitized = preg_replace('/<p>\s*<\/p>/i', '<p><br></p>', $sanitized ?? '');
        $sanitized = preg_replace('/<p>\s*&nbsp;\s*<\/p>/i', '<p><br></p>', $sanitized ?? '');
        $sanitized = preg_replace('/<p>\s*-\s*<\/p>/i', '<p><br></p>', $sanitized ?? '');
        $sanitized = preg_replace('/(<br\s*\/?>\s*){3,}/i', '<br><br>', $sanitized ?? '');
        $sanitized = preg_replace('/<\/(p|li|blockquote|h[1-6])>\s*</i', '</$1>' . PHP_EOL . '<', $sanitized ?? '');
        $sanitized = trim((string) $sanitized);

        return $sanitized !== '' ? $sanitized : null;
    }

private function normalizeDescriptionInput(string $value): string
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", trim($value));
        if ($normalized === '') {
            return '';
        }

        if (preg_match('/<\/?[a-z][\s\S]*>/i', $normalized) === 1) {
            return $normalized;
        }

        $lines = preg_split('/\n/', $normalized) ?: [];
        $result = [];
        $buffer = [];

        $flushBuffer = function () use (&$buffer, &$result): void {
            $chunk = trim(implode("\n", $buffer));
            if ($chunk !== '') {
                $escaped = htmlspecialchars($chunk, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
                $result[] = '<p>' . str_replace("\n", '<br>', $escaped) . '</p>';
            }

            $buffer = [];
        };

        foreach ($lines as $line) {
            $chunk = trim((string) $line);

            if ($this->isDescriptionSpacerMarker($chunk)) {
                $flushBuffer();
                $result[] = '<p><br></p>';
                continue;
            }

            if ($chunk === '') {
                $flushBuffer();
                continue;
            }

            $buffer[] = (string) $line;
        }

        $flushBuffer();
        return implode(PHP_EOL, $result);
    }

private function isDescriptionSpacerMarker(string $value): bool
    {
        return preg_match('/^-$/', trim($value)) === 1;
    }

private function generateSpu(string $brand): string
    {
        $prefix = strtoupper(Str::of($brand)->replaceMatches('/[^A-Za-z0-9]+/', '-')->trim('-')->value());
        $prefix = $prefix !== '' ? $prefix : 'ENTRAVERSE';

        do {
            $candidate = sprintf('%s-%s', $prefix, Str::upper(Str::random(8)));
        } while (Product::query()->where('spu', $candidate)->exists());

        return $candidate;
    }
}
