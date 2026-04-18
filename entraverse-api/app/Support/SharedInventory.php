<?php

declare(strict_types=1);

namespace App\Support;

final class SharedInventory
{
    public const DEFAULT_GROUP_KEY = '__shared_inventory_default__';

    private const DEFAULT_WAREHOUSE = 'Gudang Utama';
    private const WARRANTY_VARIANT_NAME = 'garansi';

    /**
     * @param  array<string, mixed>  $variant
     */
    public static function groupKeyForVariant(array $variant): string
    {
        $options = $variant['options'] ?? $variant['variant_options'] ?? null;
        if (is_array($options)) {
            $entries = [];

            foreach ($options as $name => $value) {
                if (! is_string($name)) {
                    continue;
                }

                $normalizedName = self::normalizeText($name);
                $normalizedValue = self::normalizeText((string) $value);
                if ($normalizedName === '' || $normalizedValue === '') {
                    continue;
                }

                $entries[] = [$normalizedName, $normalizedValue];
            }

            $groupKey = self::buildGroupKey($entries);
            if ($groupKey !== self::DEFAULT_GROUP_KEY) {
                return $groupKey;
            }
        }

        return self::buildGroupKey(self::extractEntriesFromLabel(
            (string) ($variant['label'] ?? $variant['variant_name'] ?? $variant['variant_code'] ?? 'Default')
        ));
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    public static function synchronizeVariantRows(
        array $rows,
        int $fallbackTotalStock = 0,
        string $fallbackWarehouse = self::DEFAULT_WAREHOUSE
    ): array {
        if ($rows === []) {
            return [];
        }

        $normalizedRows = [];
        $groups = [];
        $fallbackWarehouse = trim($fallbackWarehouse) !== '' ? trim($fallbackWarehouse) : self::DEFAULT_WAREHOUSE;

        foreach ($rows as $index => $row) {
            $groupKey = self::groupKeyForVariant($row);
            $warehouseStock = self::normalizeWarehouseStock(
                $row['warehouse_stock'] ?? null,
                (string) ($row['warehouse'] ?? $fallbackWarehouse),
                (int) ($row['stock'] ?? 0)
            );

            $normalizedRows[$index] = [
                ...$row,
                'shared_inventory_key' => $groupKey,
                'warehouse' => (string) (array_key_first($warehouseStock) ?? $fallbackWarehouse),
                'warehouse_stock' => $warehouseStock,
                'stock' => (int) array_sum($warehouseStock),
            ];

            if (! isset($groups[$groupKey])) {
                $groups[$groupKey] = [
                    'indexes' => [],
                    'warehouse_stock' => [],
                ];
            }

            $groups[$groupKey]['indexes'][] = $index;

            foreach ($warehouseStock as $warehouse => $stock) {
                $current = (int) ($groups[$groupKey]['warehouse_stock'][$warehouse] ?? 0);
                $groups[$groupKey]['warehouse_stock'][$warehouse] = max($current, (int) $stock);
            }
        }

        $singleGroup = count($groups) === 1;

        foreach ($groups as $groupKey => $state) {
            $groupWarehouseStock = is_array($state['warehouse_stock'] ?? null) ? $state['warehouse_stock'] : [];
            $groupTotalStock = (int) array_sum($groupWarehouseStock);

            if ($groupWarehouseStock === [] || ($singleGroup && $groupTotalStock <= 0 && $fallbackTotalStock > 0)) {
                $groupWarehouseStock = [
                    $fallbackWarehouse => max(0, $fallbackTotalStock),
                ];
            }

            $groupStock = (int) array_sum($groupWarehouseStock);

            foreach ($state['indexes'] as $rowIndex) {
                $normalizedRows[$rowIndex]['shared_inventory_key'] = $groupKey;
                $normalizedRows[$rowIndex]['warehouse'] = (string) (array_key_first($groupWarehouseStock) ?? $fallbackWarehouse);
                $normalizedRows[$rowIndex]['warehouse_stock'] = $groupWarehouseStock;
                $normalizedRows[$rowIndex]['stock'] = $groupStock;
            }
        }

        return array_values($normalizedRows);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public static function totalStockFromRows(array $rows): int
    {
        $stockByGroup = [];

        foreach ($rows as $row) {
            $groupKey = is_string($row['shared_inventory_key'] ?? null)
                ? (string) $row['shared_inventory_key']
                : self::groupKeyForVariant($row);

            $stockByGroup[$groupKey] = max(
                (int) ($stockByGroup[$groupKey] ?? 0),
                (int) ($row['stock'] ?? 0)
            );
        }

        return array_sum($stockByGroup);
    }

    /**
     * @param  array<int, array{0: string, 1: string}>  $entries
     */
    private static function buildGroupKey(array $entries): string
    {
        $normalized = [];

        foreach ($entries as [$name, $value]) {
            $normalizedName = self::normalizeText($name);
            $normalizedValue = self::normalizeText($value);

            if ($normalizedName === '' || $normalizedValue === '' || $normalizedName === self::WARRANTY_VARIANT_NAME) {
                continue;
            }

            $normalized[] = [$normalizedName, $normalizedValue];
        }

        if ($normalized === []) {
            return self::DEFAULT_GROUP_KEY;
        }

        usort($normalized, static fn (array $left, array $right): int => strcmp($left[0], $right[0]));

        return implode('|', array_map(
            static fn (array $entry): string => $entry[0] . ':' . $entry[1],
            $normalized
        ));
    }

    /**
     * @return array<int, array{0: string, 1: string}>
     */
    private static function extractEntriesFromLabel(string $label): array
    {
        $normalizedLabel = trim($label);
        if ($normalizedLabel === '' || self::normalizeText($normalizedLabel) === 'default') {
            return [];
        }

        $segments = preg_split('/[\/|]+/', $normalizedLabel) ?: [];
        $entries = [];

        foreach ($segments as $segment) {
            $parts = explode(':', $segment, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $name = trim((string) ($parts[0] ?? ''));
            $value = trim((string) ($parts[1] ?? ''));
            if ($name === '' || $value === '') {
                continue;
            }

            $entries[] = [$name, $value];
        }

        return $entries;
    }

    /**
     * @return array<string, int>
     */
    private static function normalizeWarehouseStock(
        mixed $warehouseStock,
        string $fallbackWarehouse,
        int $fallbackStock
    ): array {
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
            $warehouse = trim($fallbackWarehouse) !== '' ? trim($fallbackWarehouse) : self::DEFAULT_WAREHOUSE;
            $normalized[$warehouse] = max(0, $fallbackStock);
        }

        return $normalized;
    }

    private static function normalizeText(string $value): string
    {
        return strtolower(trim((string) preg_replace('/\s+/', ' ', $value)));
    }
}
