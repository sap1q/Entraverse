<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use App\Models\SalesOrder;
use App\Services\Mekari\Jurnal\JurnalInvoiceService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class WarehouseMovementReportService
{
    private const INVOICE_PAGE_SIZE = 100;
    private const MAX_INVOICE_PAGES = 6;
    private const REPORT_CACHE_TTL_SECONDS = 120;
    private const DEFAULT_UNIT = 'Unit';
    private const JURNAL_READY_STATES = [
        'activate',
        'active',
        'created',
        'imported_from_jurnal',
        'success',
        'synced',
        'updated',
    ];

    public function __construct(
        private readonly StockService $stockService,
        private readonly JurnalInvoiceService $jurnalInvoiceService,
    ) {
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{
     *   rows: array<int, array<string, mixed>>,
     *   meta: array<string, mixed>
     * }
     */
    public function build(array $filters = []): array
    {
        $normalizedFilters = [
            'start_date' => trim((string) ($filters['start_date'] ?? '')),
            'end_date' => trim((string) ($filters['end_date'] ?? '')),
            'search' => trim((string) ($filters['search'] ?? '')),
            'warehouse' => trim((string) ($filters['warehouse'] ?? '')),
        ];

        return Cache::remember(
            $this->reportCacheKey($normalizedFilters),
            now()->addSeconds(self::REPORT_CACHE_TTL_SECONDS),
            fn (): array => $this->buildFresh($normalizedFilters)
        );
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{
     *   rows: array<int, array<string, mixed>>,
     *   meta: array<string, mixed>
     * }
     */
    public function buildFallback(array $filters = []): array
    {
        $normalizedFilters = [
            'start_date' => trim((string) ($filters['start_date'] ?? '')),
            'end_date' => trim((string) ($filters['end_date'] ?? '')),
            'search' => trim((string) ($filters['search'] ?? '')),
            'warehouse' => trim((string) ($filters['warehouse'] ?? '')),
        ];

        return $this->buildFresh($normalizedFilters, true);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{
     *   rows: array<int, array<string, mixed>>,
     *   meta: array<string, mixed>
     * }
     */
    private function buildFresh(array $filters = [], bool $fallbackMode = false): array
    {
        $startDate = $this->resolveOptionalDateBoundary((string) ($filters['start_date'] ?? ''), false);
        $endDate = $this->resolveOptionalDateBoundary((string) ($filters['end_date'] ?? ''), true);

        $inventoryRows = $this->stockService->listAllInventoryRows([
            'search' => $filters['search'] ?? '',
            'warehouse' => $filters['warehouse'] ?? '',
        ]);

        $products = Product::query()
            ->select(['id', 'name', 'spu', 'jurnal_id', 'mekari_status'])
            ->whereIn('id', $inventoryRows->pluck('product_id')->filter()->unique()->values())
            ->get()
            ->keyBy(fn (Product $product): string => (string) $product->id);

        $invoicePayload = $fallbackMode
            ? ['invoices' => collect(), 'fetched_pages' => 0]
            : $this->fetchInvoices($startDate, $endDate);
        $qtyOutPayload = $fallbackMode
            ? [
                'quantities' => [],
                'units' => [],
                'matched_orders' => 0,
                'unmatched_invoices' => [],
            ]
            : $this->buildQtyOutMap($invoicePayload['invoices']);

        $rows = $this->buildRows($inventoryRows, $products, $qtyOutPayload);

        return [
            'rows' => $rows->all(),
            'meta' => [
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
                'invoice_count' => $invoicePayload['invoices']->count(),
                'invoice_pages_fetched' => $invoicePayload['fetched_pages'],
                'matched_sales_orders' => $qtyOutPayload['matched_orders'],
                'unmatched_invoice_count' => count($qtyOutPayload['unmatched_invoices']),
                'unmatched_invoices' => $qtyOutPayload['unmatched_invoices'],
                'using_fallback_data' => $fallbackMode,
            ],
        ];
    }

    /**
     * @param Collection<int, array<string, mixed>> $inventoryRows
     * @param Collection<string, Product> $products
     * @param array{
     *   quantities: array<string, int>,
     *   units: array<string, string>
     * } $qtyOutPayload
     * @return Collection<int, array<string, mixed>>
     */
    private function buildRows(Collection $inventoryRows, Collection $products, array $qtyOutPayload): Collection
    {
        return $inventoryRows
            ->filter(function (array $row) use ($products): bool {
                $product = $products->get((string) ($row['product_id'] ?? ''));

                return $product instanceof Product && $this->isJurnalProduct($product);
            })
            ->map(function (array $row) use ($qtyOutPayload): array {
                $warehouse = trim((string) ($row['warehouse'] ?? ''));
                $productId = (string) ($row['product_id'] ?? '');
                $movementKey = $this->movementKey($productId, $warehouse);
                $qtyOut = (int) ($qtyOutPayload['quantities'][$movementKey] ?? 0);
                $unit = trim((string) ($qtyOutPayload['units'][$movementKey] ?? self::DEFAULT_UNIT));

                return [
                    'key' => (string) ($row['id'] ?? $movementKey),
                    'product_id' => $productId,
                    'warehouse' => $warehouse !== '' ? $warehouse : '-',
                    'product' => (string) ($row['product_name'] ?? '-'),
                    'unit' => $unit !== '' ? $unit : self::DEFAULT_UNIT,
                    'opening_balance' => 0,
                    'qty_in' => 0,
                    'qty_out' => $qtyOut,
                    'ending_balance' => max(0, (int) ($row['current_stock'] ?? 0)),
                ];
            })
            ->sort(function (array $left, array $right): int {
                $warehouseCompare = strcasecmp((string) $left['warehouse'], (string) $right['warehouse']);
                if ($warehouseCompare !== 0) {
                    return $warehouseCompare;
                }

                return strcasecmp((string) $left['product'], (string) $right['product']);
            })
            ->values();
    }

    /**
     * @return array{invoices: Collection<int, array<string, mixed>>, fetched_pages: int}
     */
    private function fetchInvoices(?CarbonImmutable $startDate, ?CarbonImmutable $endDate): array
    {
        $page = 1;
        $fetchedPages = 0;
        $invoices = collect();

        while ($page <= self::MAX_INVOICE_PAGES) {
            $response = $this->jurnalInvoiceService->getInvoices([
                'page' => $page,
                'per_page' => self::INVOICE_PAGE_SIZE,
            ]);
            $fetchedPages++;

            $items = collect($this->extractInvoices($response))
                ->filter(fn ($invoice): bool => is_array($invoice))
                ->map(fn (array $invoice): array => $invoice)
                ->filter(function (array $invoice) use ($startDate, $endDate): bool {
                    $transactionDate = $this->resolveInvoiceDate($invoice);

                    if (! $transactionDate instanceof CarbonImmutable) {
                        return false;
                    }

                    if ($startDate instanceof CarbonImmutable && $transactionDate->lt($startDate)) {
                        return false;
                    }

                    if ($endDate instanceof CarbonImmutable && $transactionDate->gt($endDate)) {
                        return false;
                    }

                    return true;
                })
                ->values();

            $invoices = $invoices->concat($items);

            $lastPage = $this->extractLastPage($response);
            if ($page >= $lastPage) {
                break;
            }

            $page++;
        }

        return [
            'invoices' => $invoices->values(),
            'fetched_pages' => $fetchedPages,
        ];
    }

    /**
     * @param Collection<int, array<string, mixed>> $invoices
     * @return array{
     *   quantities: array<string, int>,
     *   units: array<string, string>,
     *   matched_orders: int,
     *   unmatched_invoices: array<int, array<string, string>>
     * }
     */
    private function buildQtyOutMap(Collection $invoices): array
    {
        $invoiceIds = [];
        $transactionNumbers = [];
        $invoicePayloadsByReference = [];
        $invoiceReferenceLookup = [];

        foreach ($invoices as $invoice) {
            $invoiceId = trim((string) Arr::get($invoice, 'id', ''));
            $transactionNo = trim((string) Arr::get($invoice, 'transaction_no', ''));
            $referenceKey = $this->canonicalInvoiceReferenceKey($invoiceId, $transactionNo);

            if ($referenceKey === null) {
                continue;
            }

            if ($invoiceId !== '') {
                $invoiceIds[] = $invoiceId;
            }

            if ($transactionNo !== '') {
                $transactionNumbers[] = $transactionNo;
            }

            $invoicePayloadsByReference[$referenceKey] = [
                'invoice_id' => $invoiceId,
                'transaction_no' => $transactionNo,
                'transaction_date' => $this->resolveInvoiceDate($invoice)?->toDateString() ?? '',
                'quantities' => [],
                'units' => [],
            ];

            if ($invoiceId !== '') {
                $invoiceReferenceLookup['invoice:' . $invoiceId] = $referenceKey;
            }

            if ($transactionNo !== '') {
                $invoiceReferenceLookup['transaction:' . $transactionNo] = $referenceKey;
            }

            $lineItems = Arr::get($invoice, 'transaction_lines_attributes', []);
            if (! is_array($lineItems)) {
                continue;
            }

            foreach ($lineItems as $lineItem) {
                if (! is_array($lineItem)) {
                    continue;
                }

                $spu = trim((string) (
                    Arr::get($lineItem, 'product.product_custom_id')
                    ?? Arr::get($lineItem, 'product.code')
                    ?? Arr::get($lineItem, 'custom_id')
                    ?? ''
                ));

                if ($spu === '') {
                    continue;
                }

                $invoicePayloadsByReference[$referenceKey]['quantities'][$spu] = (int) (($invoicePayloadsByReference[$referenceKey]['quantities'][$spu] ?? 0))
                    + max(0, (int) round((float) Arr::get($lineItem, 'quantity', 0)));

                $unitName = trim((string) Arr::get($lineItem, 'unit.name', ''));
                if ($unitName !== '') {
                    $invoicePayloadsByReference[$referenceKey]['units'][$spu] = $unitName;
                }
            }
        }

        if ($invoicePayloadsByReference === []) {
            return [
                'quantities' => [],
                'units' => [],
                'matched_orders' => 0,
                'unmatched_invoices' => [],
            ];
        }

        $orders = SalesOrder::query()
            ->with(['items.product:id,spu'])
            ->where('jurnal_sync_status', 'synced')
            ->where(function ($query) use ($transactionNumbers, $invoiceIds): void {
                if ($transactionNumbers !== []) {
                    $query->whereIn('order_number', $transactionNumbers);
                }

                if ($invoiceIds !== []) {
                    $query->orWhereIn('jurnal_invoice_id', $invoiceIds);
                }
            })
            ->get();

        $qtyOutMap = [];
        $unitMap = [];
        $matchedInvoiceReferences = [];

        foreach ($orders as $order) {
            $orderInvoiceId = trim((string) $order->jurnal_invoice_id);
            $transactionNo = trim((string) $order->order_number);
            $referenceKey = $orderInvoiceId !== '' ? ($invoiceReferenceLookup['invoice:' . $orderInvoiceId] ?? null) : null;
            $invoicePayload = $referenceKey !== null ? ($invoicePayloadsByReference[$referenceKey] ?? null) : null;

            if ($invoicePayload === null && $transactionNo !== '') {
                $referenceKey = $invoiceReferenceLookup['transaction:' . $transactionNo] ?? null;
                $invoicePayload = $referenceKey !== null ? ($invoicePayloadsByReference[$referenceKey] ?? null) : null;
            }

            if ($referenceKey !== null && $invoicePayload !== null) {
                $matchedInvoiceReferences[$referenceKey] = true;
            }

            $remainingBySpu = is_array($invoicePayload['quantities'] ?? null) ? $invoicePayload['quantities'] : [];
            $unitsBySpu = is_array($invoicePayload['units'] ?? null) ? $invoicePayload['units'] : [];
            $hasInvoiceLineMapping = $remainingBySpu !== [];

            $groupedItems = $order->items
                ->filter(fn ($item): bool => $item->product !== null)
                ->groupBy(fn ($item): string => trim((string) $item->product?->spu));

            foreach ($groupedItems as $spu => $items) {
                if (! $items instanceof Collection || $items->isEmpty()) {
                    continue;
                }

                $unitName = trim((string) ($unitsBySpu[$spu] ?? self::DEFAULT_UNIT));
                $remaining = $hasInvoiceLineMapping
                    ? max(0, (int) ($remainingBySpu[$spu] ?? 0))
                    : (int) $items->sum(fn ($item): int => (int) $item->quantity);

                foreach ($items as $item) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $itemQuantity = max(0, (int) $item->quantity);
                    $allocated = $hasInvoiceLineMapping ? min($itemQuantity, $remaining) : $itemQuantity;

                    if ($allocated <= 0) {
                        continue;
                    }

                    $warehouse = trim((string) $item->warehouse);
                    $productId = (string) $item->product_id;
                    $movementKey = $this->movementKey($productId, $warehouse);

                    $qtyOutMap[$movementKey] = (int) ($qtyOutMap[$movementKey] ?? 0) + $allocated;
                    if ($unitName !== '') {
                        $unitMap[$movementKey] = $unitName;
                    }

                    $remaining -= $allocated;
                }
            }
        }

        $unmatchedInvoices = collect($invoicePayloadsByReference)
            ->reject(fn (array $invoice, string $referenceKey): bool => isset($matchedInvoiceReferences[$referenceKey]))
            ->map(fn (array $invoice): array => [
                'invoice_id' => trim((string) ($invoice['invoice_id'] ?? '')),
                'transaction_no' => trim((string) ($invoice['transaction_no'] ?? '')),
                'transaction_date' => trim((string) ($invoice['transaction_date'] ?? '')),
            ])
            ->sort(function (array $left, array $right): int {
                return strcmp((string) $left['transaction_date'], (string) $right['transaction_date']);
            })
            ->values()
            ->all();

        return [
            'quantities' => $qtyOutMap,
            'units' => $unitMap,
            'matched_orders' => $orders->count(),
            'unmatched_invoices' => $unmatchedInvoices,
        ];
    }

    /**
     * @param array<string, mixed> $response
     * @return array<int, array<string, mixed>>
     */
    private function extractInvoices(array $response): array
    {
        $candidates = [
            Arr::get($response, 'sales_invoices'),
            Arr::get($response, 'invoices'),
            Arr::get($response, 'data'),
            Arr::get($response, 'data.data'),
        ];

        foreach ($candidates as $candidate) {
            if (is_array($candidate)) {
                return array_values(array_filter($candidate, 'is_array'));
            }
        }

        if (Arr::has($response, 'transaction_lines_attributes')) {
            return [$response];
        }

        return [];
    }

    /**
     * @param array<string, mixed> $response
     */
    private function extractLastPage(array $response): int
    {
        return max(1, (int) (
            Arr::get($response, 'total_pages')
            ?? Arr::get($response, 'meta.total_pages')
            ?? Arr::get($response, 'meta.last_page')
            ?? Arr::get($response, 'pagination.total_pages')
            ?? Arr::get($response, 'pagination.last_page')
            ?? 1
        ));
    }

    /**
     * @param array<string, mixed> $invoice
     */
    private function resolveInvoiceDate(array $invoice): ?CarbonImmutable
    {
        $candidates = [
            Arr::get($invoice, 'transaction_date'),
            Arr::get($invoice, 'created_at'),
            Arr::get($invoice, 'updated_at'),
        ];

        foreach ($candidates as $candidate) {
            $value = trim((string) $candidate);
            if ($value === '') {
                continue;
            }

            try {
                if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $value) === 1) {
                    return CarbonImmutable::createFromFormat('d/m/Y', $value)->startOfDay();
                }

                return CarbonImmutable::parse($value)->startOfDay();
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
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

    private function isJurnalProduct(Product $product): bool
    {
        $syncStatus = strtolower(trim((string) Arr::get($product->mekari_status, 'sync_status', '')));

        return filled($product->jurnal_id) || in_array($syncStatus, self::JURNAL_READY_STATES, true);
    }

    private function canonicalInvoiceReferenceKey(string $invoiceId, string $transactionNo): ?string
    {
        $normalizedInvoiceId = trim($invoiceId);
        if ($normalizedInvoiceId !== '') {
            return 'invoice:' . $normalizedInvoiceId;
        }

        $normalizedTransactionNo = trim($transactionNo);
        if ($normalizedTransactionNo !== '') {
            return 'transaction:' . $normalizedTransactionNo;
        }

        return null;
    }

    /**
     * @param array<string, string> $filters
     */
    private function reportCacheKey(array $filters): string
    {
        return 'reports:warehouse-movement:' . md5(json_encode($filters, JSON_THROW_ON_ERROR));
    }

    private function movementKey(string $productId, string $warehouse): string
    {
        $normalizedWarehouse = trim($warehouse) !== '' ? trim($warehouse) : '-';

        return sprintf('%s|%s', $productId, $normalizedWarehouse);
    }
}
