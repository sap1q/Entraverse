<?php
declare(strict_types=1);
namespace App\Services;
use App\Models\Product;
use App\Support\SharedInventory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
class OrderItemPreparer
{
public function prepare(array $itemsPayload, bool $lockProducts = true): array
    {
        $preparedItems = [];
        $purchaseItems = [];
        $tradeInItems = [];
        $subtotal = 0.0;
        $totalWeight = 0;

        foreach ($itemsPayload as $row) {
            if (! is_array($row)) {
                continue;
            }

            $productId = trim((string) ($row['product_id'] ?? ''));
            $quantity = max(1, (int) ($row['quantity'] ?? 1));
            $variantSku = trim((string) ($row['variant_sku'] ?? ''));
            $selectedVariants = is_array($row['variants'] ?? null) ? $row['variants'] : [];
            $tradeInTransactionId = trim((string) ($row['trade_in_transaction_id'] ?? ''));
            $tradeInEnabled = (bool) ($row['trade_in_enabled'] ?? false) || $tradeInTransactionId !== '';

            /** @var Product|null $product */
            $productQuery = Product::query();
            if ($lockProducts) {
                $productQuery->lockForUpdate();
            }

            $product = $productQuery->find($productId);

            if (! $product || ! $product->isPubliclyVisible()) {
                throw ValidationException::withMessages([
                    'items' => ["Produk {$productId} tidak ditemukan atau tidak aktif."],
                ]);
            }

            $variant = $this->resolveVariantRow($product, $variantSku, $selectedVariants);
            if ($variant === null) {
                throw ValidationException::withMessages([
                    'items' => ["Varian produk {$product->name} tidak ditemukan."],
                ]);
            }

            $availableStock = (int) ($variant['stock'] ?? 0);
            if (! $tradeInEnabled && $availableStock < $quantity) {
                throw ValidationException::withMessages([
                    'items' => ["Stok tidak cukup untuk {$product->name}."],
                ]);
            }

            $warehouse = $this->resolveWarehouse($variant, $product);
            $landedCost = $this->calculateLandedCost($variant);
            $resolvedSku = $this->resolveSku($product, $variant);
            $itemWeight = $tradeInEnabled ? null : $this->resolveWeightInGram($variant, $product);

            if (! $tradeInEnabled && $itemWeight === null) {
                throw ValidationException::withMessages([
                    'items' => [sprintf(
                        'Berat produk %s belum dikonfigurasi. Lengkapi berat produk sebelum menghitung ongkir.',
                        $this->describeCheckoutItem($product, $variant)
                    )],
                ]);
            }

            $preparedItem = [
                'product_id' => (string) $product->id,
                'product_name' => (string) $product->name,
                'variant_name' => (string) ($variant['label'] ?? $variant['variant_name'] ?? 'Default'),
                'variant_sku' => $resolvedSku,
                'warehouse' => $warehouse,
                'quantity' => $quantity,
                'unit_price' => $tradeInEnabled ? 0.0 : $this->resolveUnitPrice($variant, $product),
                'landed_cost' => $landedCost,
                'line_total' => $tradeInEnabled ? 0.0 : ($this->resolveUnitPrice($variant, $product) * $quantity),
                'metadata' => [
                    'selected_variants' => $selectedVariants,
                    'item_weight' => $itemWeight,
                    'stock_before_checkout' => $availableStock,
                    'trade_in_enabled' => $tradeInEnabled,
                    'trade_in_transaction_id' => $tradeInTransactionId !== '' ? $tradeInTransactionId : null,
                    'entry_kind' => $tradeInEnabled ? 'trade_in' : 'purchase',
                ],
            ];

            $preparedItems[] = $preparedItem;

            if ($tradeInEnabled) {
                $tradeInItems[] = $preparedItem;
                continue;
            }

            $purchaseItems[] = $preparedItem;
            $subtotal += (float) $preparedItem['line_total'];
            $totalWeight += ((int) $itemWeight * $quantity);
        }

        if ($preparedItems === []) {
            throw ValidationException::withMessages([
                'items' => ['Item checkout tidak valid.'],
            ]);
        }

        $packagingWeight = $purchaseItems === [] ? 0 : $this->resolvePackagingWeightInGram();

        return [
            'subtotal' => $subtotal,
            'item_weight' => $purchaseItems === [] ? 0 : max(1, $totalWeight),
            'packaging_weight' => $packagingWeight,
            'weight' => $purchaseItems === [] ? 0 : max(1, $totalWeight + $packagingWeight),
            'items' => $preparedItems,
            'purchase_items' => $purchaseItems,
            'trade_in_items' => $tradeInItems,
        ];
    }
public function resolveWarehouse(array $variant, Product $product): string
    {
        $candidate = trim((string) ($variant['warehouse'] ?? ''));
        if ($candidate !== '') {
            return $candidate;
        }

        $inventory = is_array($product->inventory) ? $product->inventory : [];
        $fallback = trim((string) ($inventory['warehouse'] ?? ''));

        return $fallback !== '' ? $fallback : 'Gudang Utama';
    }

public function resolveUnitPrice(array $variant, Product $product, bool $preferOffline = false): float
    {
        $candidates = $preferOffline
            ? [
                (float) ($variant['offline_price'] ?? 0),
                (float) ($variant['entraverse_price'] ?? 0),
                (float) ($variant['price'] ?? 0),
                (float) Arr::get($product->inventory, 'price', 0),
            ]
            : [
                (float) ($variant['entraverse_price'] ?? 0),
                (float) ($variant['offline_price'] ?? 0),
                (float) ($variant['price'] ?? 0),
                (float) Arr::get($product->inventory, 'price', 0),
            ];

        foreach ($candidates as $candidate) {
            if ($candidate > 0) {
                return $candidate;
            }
        }

        return 0.0;
    }

public function calculateLandedCost(array $variant): float
    {
        $purchasePriceIdr = (float) ($variant['purchase_price_idr'] ?? 0);
        if ($purchasePriceIdr > 0) {
            return $purchasePriceIdr;
        }

        $purchasePrice = (float) ($variant['purchase_price'] ?? 0);
        $exchangeRate = (float) ($variant['exchange_rate'] ?? $variant['exchange_value'] ?? 0);
        $arrivalCost = (float) ($variant['arrival_cost'] ?? 0);
        $currency = strtoupper(trim((string) ($variant['currency'] ?? '')));
        $currencySurcharge = in_array($currency, ['USD', 'SGD'], true) ? 50.0 : 0.0;
        $adjustedExchangeRate = $exchangeRate + $currencySurcharge;

        return max(0.0, ($purchasePrice * $adjustedExchangeRate) + $arrivalCost);
    }

public function resolveWeightInGram(array $variant, Product $product): ?int
    {
        $candidates = [
            (float) ($variant['item_weight'] ?? 0),
            (float) Arr::get($variant, 'weight', 0),
            (float) Arr::get($product->inventory, 'weight', 0),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate > 0) {
                return (int) max(1, round($candidate));
            }
        }

        return null;
    }

public function describeCheckoutItem(Product $product, array $variant): string
    {
        $variantLabel = trim((string) ($variant['label'] ?? $variant['variant_name'] ?? ''));
        if ($variantLabel !== '' && ! in_array(Str::lower($variantLabel), ['default', 'default variant'], true)) {
            return sprintf('%s (%s)', (string) $product->name, $variantLabel);
        }

        return (string) $product->name;
    }

public function resolvePackagingWeightInGram(): int
    {
        return max(0, (int) config('services.rajaongkir.packaging_weight_grams', 0));
    }

public function isStrictShippingMode(): bool
    {
        return (bool) config('services.rajaongkir.strict_mode', false);
    }

public function resolveSku(Product $product, array $variant): string
    {
        $candidates = [
            $variant['sku'] ?? null,
            $variant['sku_seller'] ?? null,
            $variant['variant_code'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (! is_string($candidate)) {
                continue;
            }

            $trimmed = trim($candidate);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        $spu = trim((string) ($product->spu ?? ''));
        if ($spu !== '') {
            return $spu;
        }

        return sprintf('SKU-%s', (string) $product->id);
    }

public function normalizeVariantOptionMap(array $variant): array
    {
        $options = $variant['options'] ?? $variant['variant_options'] ?? [];
        if (! is_array($options)) {
            return [];
        }

        $normalized = [];
        foreach ($options as $name => $value) {
            if (! is_string($name) || ! is_string($value)) {
                continue;
            }

            $normalizedName = Str::lower(trim($name));
            $normalizedValue = Str::lower(trim($value));
            if ($normalizedName === '' || $normalizedValue === '') {
                continue;
            }

            $normalized[$normalizedName] = $normalizedValue;
        }

        return $normalized;
    }

public function resolveVariantRow(Product $product, string $variantSku, array $selectedVariants): ?array
    {
        $variantRows = $this->extractVariantRows($product);
        if ($variantRows === []) {
            return null;
        }

        if ($variantSku !== '') {
            foreach ($variantRows as $variant) {
                if (strcasecmp($this->resolveSku($product, $variant), $variantSku) === 0) {
                    return $variant;
                }
            }
        }

        $normalizedSelection = [];
        foreach ($selectedVariants as $name => $value) {
            if (! is_string($name) || ! is_string($value)) {
                continue;
            }

            $normalizedName = Str::lower(trim($name));
            $normalizedValue = Str::lower(trim($value));
            if ($normalizedName === '' || $normalizedValue === '') {
                continue;
            }

            $normalizedSelection[$normalizedName] = $normalizedValue;
        }

        if ($normalizedSelection !== []) {
            foreach ($variantRows as $variant) {
                $options = $this->normalizeVariantOptionMap($variant);
                if ($options === []) {
                    continue;
                }

                $matches = true;
                foreach ($normalizedSelection as $name => $value) {
                    if (($options[$name] ?? null) !== $value) {
                        $matches = false;
                        break;
                    }
                }

                if ($matches) {
                    return $variant;
                }
            }
        }

        return $variantRows[0];
    }

public function extractVariantRows(Product $product): array
    {
        $variantPricing = is_array($product->variant_pricing) ? $product->variant_pricing : [];
        $rows = [];

        foreach ($variantPricing as $entry) {
            if (! is_array($entry)) {
                continue;
            }

            if (isset($entry['items']) && is_array($entry['items'])) {
                foreach ($entry['items'] as $item) {
                    if (! is_array($item)) {
                        continue;
                    }

                    $normalized = $item;
                    if (! isset($normalized['currency']) && isset($entry['currency'])) {
                        $normalized['currency'] = $entry['currency'];
                    }

                    $rows[] = $normalized;
                }

                continue;
            }

            $rows[] = $entry;
        }

        if ($rows === []) {
            $inventory = is_array($product->inventory) ? $product->inventory : [];
            $rows[] = [
                'label' => 'Default',
                'stock' => (int) ($inventory['total_stock'] ?? $product->stock ?? 0),
                'sku' => $product->spu ?: sprintf('SKU-%s', $product->id),
                'warehouse' => $inventory['warehouse'] ?? 'Gudang Utama',
                'warehouse_stock' => [
                    ($inventory['warehouse'] ?? 'Gudang Utama') => (int) ($inventory['total_stock'] ?? $product->stock ?? 0),
                ],
            ];
        }

        $normalizedRows = array_values(array_map(function (array $row) use ($product): array {
            $normalized = $row;
            $warehouse = $this->resolveWarehouse($normalized, $product);
            $normalized['warehouse'] = $warehouse;
            $normalized['warehouse_stock'] = $this->normalizeWarehouseStock(
                $normalized['warehouse_stock'] ?? null,
                $warehouse,
                (int) ($normalized['stock'] ?? 0)
            );
            $normalized['stock'] = (int) collect($normalized['warehouse_stock'])->sum();
            $normalized['label'] = (string) ($normalized['label'] ?? $normalized['variant_name'] ?? 'Default');

            return $normalized;
        }, $rows));

        $inventory = is_array($product->inventory) ? $product->inventory : [];
        $fallbackWarehouse = trim((string) ($inventory['warehouse'] ?? ''));
        $fallbackStock = (int) ($inventory['total_stock'] ?? $product->stock ?? 0);

        return SharedInventory::synchronizeVariantRows(
            $normalizedRows,
            $fallbackStock,
            $fallbackWarehouse !== '' ? $fallbackWarehouse : 'Gudang Utama'
        );
    }

public function normalizeWarehouseStock(
        mixed $warehouseStock,
        string $fallbackWarehouse,
        int $fallbackStock
    ): array {
        $normalized = [];

        if (is_array($warehouseStock)) {
            foreach ($warehouseStock as $warehouse => $qty) {
                if (! is_string($warehouse)) {
                    continue;
                }

                $warehouseName = trim($warehouse);
                if ($warehouseName === '') {
                    continue;
                }

                $normalized[$warehouseName] = max(0, (int) $qty);
            }
        }

        if ($normalized === []) {
            $warehouse = trim($fallbackWarehouse) !== '' ? trim($fallbackWarehouse) : 'Gudang Utama';
            $normalized[$warehouse] = max(0, $fallbackStock);
        }

        return $normalized;
    }
}