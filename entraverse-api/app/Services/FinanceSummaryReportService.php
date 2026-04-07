<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SalesOrder;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class FinanceSummaryReportService
{
    private const REPORT_CACHE_TTL_SECONDS = 120;
    private const SUCCESSFUL_PAYMENT_STATUSES = ['settlement', 'capture', 'paid'];
    private const EXCLUDED_ORDER_STATUSES = ['dibatalkan', 'cancelled', 'canceled'];

    /**
     * @param array<string, mixed> $filters
     * @return array{
     *   metrics: array<string, float>,
     *   meta: array<string, mixed>
     * }
     */
    public function build(array $filters = []): array
    {
        $normalizedFilters = [
            'start_date' => trim((string) ($filters['start_date'] ?? '')),
            'end_date' => trim((string) ($filters['end_date'] ?? '')),
        ];

        return Cache::remember(
            $this->reportCacheKey($normalizedFilters),
            now()->addSeconds(self::REPORT_CACHE_TTL_SECONDS),
            fn (): array => $this->buildFresh($normalizedFilters)
        );
    }

    /**
     * @param array<string, string> $filters
     * @return array{
     *   metrics: array<string, float>,
     *   meta: array<string, mixed>
     * }
     */
    private function buildFresh(array $filters): array
    {
        $startDate = $this->resolveOptionalDateBoundary($filters['start_date'] ?? '', false);
        $endDate = $this->resolveOptionalDateBoundary($filters['end_date'] ?? '', true);

        $orders = SalesOrder::query()
            ->with(['items:id,sales_order_id,quantity,landed_cost,line_total'])
            ->whereNotIn('status', self::EXCLUDED_ORDER_STATUSES)
            ->where(function (Builder $query): void {
                $query
                    ->whereIn('payment_status', self::SUCCESSFUL_PAYMENT_STATUSES)
                    ->orWhereNotNull('settled_at');
            })
            ->when($startDate instanceof CarbonImmutable, function (Builder $query) use ($startDate): void {
                $query->where(function (Builder $scopedQuery) use ($startDate): void {
                    $scopedQuery
                        ->where('settled_at', '>=', $startDate)
                        ->orWhere(function (Builder $fallbackQuery) use ($startDate): void {
                            $fallbackQuery
                                ->whereNull('settled_at')
                                ->where('created_at', '>=', $startDate);
                        });
                });
            })
            ->when($endDate instanceof CarbonImmutable, function (Builder $query) use ($endDate): void {
                $query->where(function (Builder $scopedQuery) use ($endDate): void {
                    $scopedQuery
                        ->where('settled_at', '<=', $endDate)
                        ->orWhere(function (Builder $fallbackQuery) use ($endDate): void {
                            $fallbackQuery
                                ->whereNull('settled_at')
                                ->where('created_at', '<=', $endDate);
                        });
                });
            })
            ->get();

        $revenue = (float) $orders->sum(fn (SalesOrder $order): float => (float) ($order->total_amount ?? 0));
        $cogs = (float) $orders->sum(
            fn (SalesOrder $order): float => (float) $order->items->sum(
                fn ($item): float => max(0, (float) ($item->landed_cost ?? 0)) * max(0, (int) ($item->quantity ?? 0))
            )
        );
        $grossProfit = $revenue - $cogs;
        $operatingExpense = 0.0;
        $netIncome = $grossProfit - $operatingExpense;
        $syncedOrderCount = $orders->filter(
            fn (SalesOrder $order): bool => strtolower(trim((string) ($order->jurnal_sync_status ?? ''))) === 'synced'
        )->count();

        return [
            'metrics' => [
                'revenue' => round($revenue, 2),
                'cogs' => round($cogs, 2),
                'gross_profit' => round($grossProfit, 2),
                'operating_expense' => round($operatingExpense, 2),
                'net_income' => round($netIncome, 2),
            ],
            'meta' => [
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
                'order_count' => $orders->count(),
                'synced_order_count' => $syncedOrderCount,
                'last_sync_at' => now()->toISOString(),
            ],
        ];
    }

    private function resolveOptionalDateBoundary(string $value, bool $endOfDay): ?CarbonImmutable
    {
        if (trim($value) === '') {
            return null;
        }

        try {
            $date = CarbonImmutable::parse($value);
        } catch (\Throwable) {
            return null;
        }

        return $endOfDay ? $date->endOfDay() : $date->startOfDay();
    }

    /**
     * @param array<string, string> $filters
     */
    private function reportCacheKey(array $filters): string
    {
        return 'reports:finance-summary:' . md5(json_encode($filters, JSON_THROW_ON_ERROR));
    }
}
