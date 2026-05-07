<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Category;

class ProductPricingService
{
    public const DEFAULT_WARRANTY_VARIANT_NAME = 'Garansi';
    public const DEFAULT_WARRANTY_OPTIONS = ['Tanpa Garansi', 'Toko - 1 Tahun'];
    public const WARRANTY_COST_LABEL = 'biaya program garansi';
    public const WARRANTY_PROFIT_LABEL = 'keuntungan program garansi';

public function resolveCategoryForPricing(string $categoryId, string $categoryName): ?Category
    {
        if ($categoryId !== '') {
            return Category::query()->find($categoryId)
                ?? Category::query()->withTrashed()->find($categoryId);
        }

        if ($categoryName === '') {
            return null;
        }

        return Category::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($categoryName)])
            ->first();
    }

public function recalculateVariantPricing(array $variantPricing, ?Category $category): array
    {
        if ($variantPricing === []) {
            return [];
        }

        if (! $category) {
            return $variantPricing;
        }

        $minMarginPercent = max(0, $this->toFloat($category->margin_percent ?? $category->min_margin));
        $fees = is_array($category->fees) ? $category->fees : [];
        $warrantyConfig = $this->extractWarrantyConfig($category->program_garansi);
        $tokopediaChannel = $this->resolveFeeChannel($fees, ['tokopedia', 'tokopedia_tiktok', 'marketplace']);
        $shopeeChannel = $this->resolveFeeChannel($fees, ['shopee']);
        $entraverseChannel = $this->resolveFeeChannel($fees, ['entraverse']);

        if (($entraverseChannel['components'] ?? []) === []) {
            $entraverseChannel = ['components' => []];
        }

        return array_map(function (array $item) use (
            $minMarginPercent,
            $tokopediaChannel,
            $shopeeChannel,
            $entraverseChannel,
            $warrantyConfig
        ): array {
            $purchasePrice = max(0, $this->toFloat($item['purchase_price'] ?? 0));
            $exchangeValue = max(0, $this->toFloat($item['exchange_value'] ?? ($item['exchange_rate'] ?? 0)));
            $arrivalCost = max(0, $this->toFloat($item['arrival_cost'] ?? 0));
            $fixedCost = max(0, $this->toFloat($item['shipping_cost'] ?? 0));
            $marginPercent = $minMarginPercent;
            $purchasePriceIdr = round(($purchasePrice * $exchangeValue) + $arrivalCost);

            $warrantyOption = $this->extractWarrantyOption($item);
            $entraverseFee = $this->calculateFeeTotals($entraverseChannel, $purchasePriceIdr);
            $tokopediaFee = $this->calculateFeeTotals($tokopediaChannel, $purchasePriceIdr);
            $shopeeFee = $this->calculateFeeTotals($shopeeChannel, $purchasePriceIdr);

            $offlineBase = $this->calculateSellingPrice($purchasePriceIdr, 0, $marginPercent / 100, 0);
            $entraverseBase = $this->calculateSellingPrice(
                $purchasePriceIdr,
                $entraverseFee['fixed_total'],
                $marginPercent / 100,
                $entraverseFee['percent_total'],
            );
            $tokopediaBase = $this->calculateSellingPrice(
                $purchasePriceIdr,
                $tokopediaFee['fixed_total'],
                $marginPercent / 100,
                $tokopediaFee['percent_total'],
            );
            $shopeeBase = $this->calculateSellingPrice(
                $purchasePriceIdr,
                $shopeeFee['fixed_total'],
                $marginPercent / 100,
                $shopeeFee['percent_total'],
            );

            $offlineWithWarranty = $this->applyWarrantyMultiplier($warrantyOption, $offlineBase);
            $entraverseWithWarranty = $this->applyWarrantyMultiplier($warrantyOption, $entraverseBase);
            $tokopediaWithWarranty = $this->applyWarrantyMultiplier($warrantyOption, $tokopediaBase);
            $shopeeWithWarranty = $this->applyWarrantyMultiplier($warrantyOption, $shopeeBase);

            $item['exchange_rate'] = (float) round($exchangeValue, 4);
            $item['arrival_cost'] = (float) round($arrivalCost);
            $item['shipping_cost'] = (float) round($fixedCost);
            $item['margin_percent'] = (float) round($marginPercent, 4);
            $item['purchase_price_idr'] = (float) round($purchasePriceIdr);
            $item['offline_price'] = (float) $this->applyNearestPriceRounding($offlineWithWarranty);
            $item['entraverse_price'] = (float) $this->applyCeilPriceRounding($entraverseWithWarranty);
            $item['tokopedia_price'] = (float) $this->applyNearestPriceRounding($tokopediaWithWarranty);
            $item['tiktok_price'] = (float) $this->applyNearestPriceRounding($tokopediaWithWarranty);
            $item['shopee_price'] = (float) $this->applyNearestPriceRounding($shopeeWithWarranty);
            $item['tokopedia_fee'] = (float) $tokopediaFee['percent_display'];
            $item['tiktok_fee'] = (float) $tokopediaFee['percent_display'];
            $item['shopee_fee'] = (float) $shopeeFee['percent_display'];

            return $item;
        }, $variantPricing);
    }

private function resolveFeeChannel(array $fees, array $keys): array
    {
        $fallback = null;

        foreach ($keys as $key) {
            $candidate = $fees[$key] ?? null;
            if (is_array($candidate)) {
                $fallback ??= $candidate;
                if ($this->hasFeeComponents($candidate)) {
                    return $candidate;
                }
            }
        }

        return $fallback ?? ['components' => []];
    }

private function hasFeeComponents(array $channel): bool
    {
        $components = $channel['components'] ?? null;
        if (! is_array($components)) {
            return false;
        }

        foreach ($components as $component) {
            if (! is_array($component)) {
                continue;
            }

            $label = trim((string) ($component['label'] ?? ''));
            $valueType = strtolower(trim((string) ($component['valueType'] ?? 'percent')));
            $isAmount = $valueType === 'amount' || $valueType === 'rp';
            $value = $isAmount
                ? $this->parseRupiahAmount($component['value'] ?? 0)
                : max(0, $this->toFloat($component['value'] ?? 0));
            $min = $this->parseRupiahAmount($component['min'] ?? 0);
            $max = $this->parseRupiahAmount($component['max'] ?? 0);

            if ($label !== '' || $value > 0 || $min > 0 || $max > 0) {
                return true;
            }
        }

        return false;
    }

private function resolveFeeSummaryPercent(array $channel): float
    {
        $summary = is_array($channel['summary'] ?? null) ? $channel['summary'] : [];
        $candidates = [
            $channel['percent'] ?? null,
            $channel['rate'] ?? null,
            $channel['percentage'] ?? null,
            $channel['total_percent'] ?? null,
            $channel['totalPercent'] ?? null,
            $channel['summary'] ?? null,
            $summary['percent'] ?? null,
            $summary['rate'] ?? null,
            $summary['percentage'] ?? null,
            $summary['total_percent'] ?? null,
            $summary['totalPercent'] ?? null,
            $summary['value'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_numeric($candidate) || is_string($candidate)) {
                $resolved = max(0, $this->toFloat($candidate));
                if ($resolved > 0) {
                    return $resolved;
                }
            }
        }

        return 0.0;
    }

private function calculateFeeTotals(array $channel, float $purchasePriceIdr): array
    {
        $components = is_array($channel['components'] ?? null) ? $channel['components'] : [];
        $safePurchasePrice = max(0, $purchasePriceIdr);
        $fixedTotal = 0.0;
        $percentTotal = 0.0;

        if ($components === []) {
            $summaryPercent = $this->resolveFeeSummaryPercent($channel);

            return [
                'fixed_total' => 0.0,
                'percent_total' => $summaryPercent / 100,
                'percent_display' => $summaryPercent,
            ];
        }

        foreach ($components as $component) {
            if (! is_array($component)) {
                continue;
            }

            $valueType = strtolower(trim((string) ($component['valueType'] ?? 'percent')));
            $isAmount = $valueType === 'amount' || $valueType === 'rp';
            $value = $isAmount
                ? $this->parseRupiahAmount($component['value'] ?? 0)
                : max(0, $this->toFloat($component['value'] ?? 0));
            $minValue = $this->parseRupiahAmount($component['min'] ?? 0);
            $maxValue = $this->parseRupiahAmount($component['max'] ?? 0);

            if ($isAmount) {
                $fee = $value;

                if ($minValue > 0) {
                    $fee = max($fee, $minValue);
                }
                if ($maxValue > 0) {
                    $fee = min($fee, $maxValue);
                }

                $fixedTotal += max(0, $fee);
                continue;
            }

            $effectiveRate = $value / 100;

            if ($safePurchasePrice > 0) {
                if ($maxValue > 0) {
                    $effectiveRate = min($effectiveRate, $maxValue / $safePurchasePrice);
                }
                if ($minValue > 0) {
                    $effectiveRate = max($effectiveRate, $minValue / $safePurchasePrice);
                }
            }

            $percentTotal += max(0, $effectiveRate);
        }

        return [
            'fixed_total' => round($fixedTotal),
            'percent_total' => round($percentTotal, 6),
            'percent_display' => round($percentTotal * 100, 4),
        ];
    }

private function calculateSellingPrice(
        float $purchasePriceIdr,
        float $fixedFeeAmount,
        float $marginRate,
        float $platformFeePercent,
    ): float {
        $safePurchasePrice = max(0, $purchasePriceIdr);
        $safeFixedFee = max(0, $fixedFeeAmount);
        $denominator = 1 - max(0, $marginRate) - max(0, $platformFeePercent);

        if ($denominator <= 0) {
            return $safePurchasePrice + $safeFixedFee;
        }

        return ($safePurchasePrice + $safeFixedFee) / $denominator;
    }

private function parseRupiahAmount(mixed $value): float
    {
        if (is_int($value) || is_float($value)) {
            return (float) round(max(0, $value));
        }

        if (! is_string($value)) {
            return 0.0;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';
        if ($digits === '') {
            return 0.0;
        }

        return (float) round((float) $digits);
    }

private function applyNearestPriceRounding(float $value): float
    {
        $safeValue = max(0, $value);
        [$step, $psychologicalCut] = $this->resolvePriceRoundingBucket($safeValue);

        return max(0, (round($safeValue / $step) * $step) - $psychologicalCut);
    }

private function applyCeilPriceRounding(float $value): float
    {
        $safeValue = max(0, $value);
        [$step, $psychologicalCut] = $this->resolvePriceRoundingBucket($safeValue);

        return max(0, (ceil($safeValue / $step) * $step) - $psychologicalCut);
    }

private function resolvePriceRoundingBucket(float $value): array
    {
        $safeValue = max(0, $value);

        if ($safeValue >= 500000) {
            return [50000.0, 1000.0];
        }

        if ($safeValue >= 250000) {
            return [10000.0, 1000.0];
        }

        if ($safeValue >= 100000) {
            return [5000.0, 1000.0];
        }

        return [1000.0, 100.0];
    }

private function defaultWarrantyPricingComponent(): array
    {
        return [
            'valueType' => 'percent',
            'value' => 0.0,
        ];
    }

private function defaultWarrantyConfig(): array
    {
        return [
            'components' => [],
            'pricing' => [
                'cost' => $this->defaultWarrantyPricingComponent(),
                'profit' => $this->defaultWarrantyPricingComponent(),
            ],
        ];
    }

private function parseWarrantyPricingComponent(mixed $payload, array $fallback = []): array
    {
        $fallbackType = strtolower(trim((string) ($fallback['valueType'] ?? 'percent')));
        $fallbackValueType = in_array($fallbackType, ['amount', 'rp', 'rupiah'], true) ? 'amount' : 'percent';
        $fallbackValue = $fallbackValueType === 'amount'
            ? $this->parseRupiahAmount($fallback['value'] ?? 0)
            : max(0, $this->toFloat($fallback['value'] ?? 0));

        if (! is_array($payload)) {
            return [
                'valueType' => $fallbackValueType,
                'value' => $fallbackValue,
            ];
        }

        $rawType = strtolower(trim((string) ($payload['valueType'] ?? $fallbackValueType)));
        $valueType = in_array($rawType, ['amount', 'rp', 'rupiah'], true) ? 'amount' : 'percent';

        return [
            'valueType' => $valueType,
            'value' => $valueType === 'amount'
                ? $this->parseRupiahAmount($payload['value'] ?? $fallbackValue)
                : max(0, $this->toFloat($payload['value'] ?? $fallbackValue)),
        ];
    }

private function setWarrantyPricingFromRecord(array $source, array &$pricing): void
    {
        $read = function (array $aliases) use ($source): mixed {
            foreach ($aliases as $alias) {
                if (array_key_exists($alias, $source)) {
                    return $source[$alias];
                }
            }

            return null;
        };

        $costPayload = $read(['cost', 'biaya', 'biaya_program_garansi', 'cost_component']);
        if (! is_null($costPayload)) {
            $pricing['cost'] = $this->parseWarrantyPricingComponent($costPayload, $pricing['cost'] ?? []);
        }

        $profitPayload = $read(['profit', 'keuntungan', 'keuntungan_program_garansi', 'profit_component']);
        if (! is_null($profitPayload)) {
            $pricing['profit'] = $this->parseWarrantyPricingComponent($profitPayload, $pricing['profit'] ?? []);
        }
    }

private function setWarrantyPricingFromLabel(string $label, array $component, array &$pricing): bool
    {
        $normalizedLabel = $this->normalizeLabel($label);

        if ($normalizedLabel === self::WARRANTY_COST_LABEL) {
            $pricing['cost'] = $this->parseWarrantyPricingComponent($component, $pricing['cost'] ?? []);
            return true;
        }

        if ($normalizedLabel === self::WARRANTY_PROFIT_LABEL) {
            $pricing['profit'] = $this->parseWarrantyPricingComponent($component, $pricing['profit'] ?? []);
            return true;
        }

        return false;
    }

private function appendWarrantyComponent(array &$components, array $component): void
    {
        $label = $this->normalizeLabel((string) ($component['label'] ?? ''));
        if ($label === '') {
            return;
        }

        $dedupeKey = strtolower($label);
        foreach ($components as $existing) {
            if (($existing['key'] ?? '') === $dedupeKey) {
                return;
            }
        }

        $rawType = strtolower(trim((string) ($component['valueType'] ?? 'percent')));
        $valueType = in_array($rawType, ['amount', 'rp', 'rupiah'], true) ? 'amount' : 'percent';
        $components[] = [
            'key' => $dedupeKey,
            'label' => $label,
            'valueType' => $valueType,
            'value' => $valueType === 'amount'
                ? $this->parseRupiahAmount($component['value'] ?? 0)
                : max(0, $this->toFloat($component['value'] ?? 0)),
        ];
    }

private function extractWarrantyConfig(mixed $programGaransi): array
    {
        $config = $this->defaultWarrantyConfig();
        $components = &$config['components'];
        $pricing = &$config['pricing'];

        $parseComponent = function (mixed $row) use (&$components, &$pricing): void {
            if (is_string($row)) {
                $label = $this->normalizeLabel($row);
                if ($label !== '') {
                    $this->appendWarrantyComponent($components, [
                        'label' => $label,
                        'valueType' => 'percent',
                        'value' => 0,
                    ]);
                }
                return;
            }

            if (! is_array($row)) {
                return;
            }

            $component = [
                'label' => (string) ($row['label'] ?? $row['name'] ?? ''),
                'valueType' => (string) ($row['valueType'] ?? 'percent'),
                'value' => $row['value'] ?? 0,
            ];

            if ($this->setWarrantyPricingFromLabel((string) $component['label'], $component, $pricing)) {
                return;
            }

            $this->appendWarrantyComponent($components, $component);
        };

        if (is_array($programGaransi)) {
            if (array_is_list($programGaransi)) {
                foreach ($programGaransi as $row) {
                    $parseComponent($row);
                }
                return $config;
            }

            if (is_array($programGaransi['pricing'] ?? null)) {
                $this->setWarrantyPricingFromRecord($programGaransi['pricing'], $pricing);
            }
            $this->setWarrantyPricingFromRecord($programGaransi, $pricing);

            $nested = $programGaransi['components'] ?? null;
            if (is_array($nested)) {
                foreach ($nested as $row) {
                    $parseComponent($row);
                }
            } else {
                $parseComponent($programGaransi);
            }

            return $config;
        }

        if (! is_string($programGaransi) || trim($programGaransi) === '') {
            return $config;
        }

        $decoded = json_decode($programGaransi, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $this->extractWarrantyConfig($decoded);
        }

        $labels = preg_split('/[\r\n,]+/', $programGaransi) ?: [];
        foreach ($labels as $label) {
            $parseComponent($label);
        }

        return $config;
    }

private function extractWarrantyOption(array $item): string
    {
        $options = $item['options'] ?? null;
        if (is_array($options)) {
            foreach ($options as $key => $value) {
                if ($this->normalizeLabel((string) $key) === 'garansi') {
                    return $this->normalizeLabel((string) $value);
                }
            }
        }

        $label = trim((string) ($item['label'] ?? ''));
        if ($label !== '' && preg_match('/garansi\s*:\s*([^\/|]+)/i', $label, $matches) === 1) {
            return $this->normalizeLabel((string) ($matches[1] ?? ''));
        }

        return '';
    }

private function hasWarrantyPricing(array $pricing): bool
    {
        $costValue = max(0, $this->toFloat($pricing['cost']['value'] ?? 0));
        $profitValue = max(0, $this->toFloat($pricing['profit']['value'] ?? 0));

        if ($costValue > 0) {
            return true;
        }

        $profitValueType = strtolower(trim((string) ($pricing['profit']['valueType'] ?? 'percent')));
        return in_array($profitValueType, ['amount', 'rp', 'rupiah'], true) && $profitValue > 0;
    }

private function calculateWarrantyValue(float $baseRecommended, array $component, ?float $percentBase = null): float
    {
        $valueType = strtolower(trim((string) ($component['valueType'] ?? 'percent')));
        if (in_array($valueType, ['amount', 'rp', 'rupiah'], true)) {
            return round($this->parseRupiahAmount($component['value'] ?? 0));
        }

        $percent = max(0, $this->toFloat($component['value'] ?? 0));
        $base = max(0, $percentBase ?? $baseRecommended);
        return round($base * ($percent / 100));
    }

private function applyWarrantyMultiplier(string $warrantyOption, float $baseRecommended): float
    {
        if ($warrantyOption === '' || str_contains($warrantyOption, 'tanpa')) {
            return $baseRecommended;
        }

        if (preg_match('/(^|[^0-9])1\s*tahun/u', $warrantyOption) === 1 || str_contains($warrantyOption, '1th') || str_contains($warrantyOption, '1 th')) {
            return $baseRecommended * 1.06;
        }

        return $baseRecommended;
    }

private function normalizeLabel(string $value): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? ''));
    }

private function toFloat(mixed $value): float
    {
        if (is_float($value) || is_int($value)) {
            return (float) $value;
        }

        if (! is_string($value)) {
            return 0.0;
        }

        $normalized = preg_replace('/[^0-9,.\-]/', '', trim($value)) ?? '';
        if ($normalized === '' || $normalized === '-' || $normalized === '.' || $normalized === ',') {
            return 0.0;
        }

        if (str_contains($normalized, ',') && str_contains($normalized, '.')) {
            $lastComma = strrpos($normalized, ',');
            $lastDot = strrpos($normalized, '.');
            if ($lastComma !== false && $lastDot !== false && $lastComma > $lastDot) {
                $normalized = str_replace('.', '', $normalized);
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        } elseif (str_contains($normalized, ',') && ! str_contains($normalized, '.')) {
            $normalized = str_replace(',', '.', $normalized);
        } elseif (substr_count($normalized, '.') > 1) {
            $normalized = str_replace('.', '', $normalized);
        }

        return is_numeric($normalized) ? (float) $normalized : 0.0;
    }
}