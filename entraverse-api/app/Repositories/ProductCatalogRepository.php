<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductCatalogRepository
{
    private const ACTIVATED_SYNC_STATUSES = [
        'activate',
        'active',
        'success',
        'synced',
        'imported_from_jurnal',
        'created',
        'updated',
    ];

    private ?bool $postgresTrigramAvailable = null;

public function paginate(array $filters): LengthAwarePaginator
    {
        $perPage = max(1, min((int) ($filters['per_page'] ?? 12), 100));
        $query = $this->buildCatalogQuery($filters);
        $this->applyCatalogSorting($query, $filters);

        return $query
            ->paginate($perPage)
            ->appends($filters);
    }

public function suggest(string $search, int $limit = 6): array
    {
        $normalizedSearch = $this->normalizeSearchText($search);
        if ($normalizedSearch === '') {
            return [
                'products' => collect(),
                'keywords' => [],
            ];
        }

        $query = $this->buildCatalogQuery([
            'apply_visible' => true,
            'status' => Product::STATUS_ACTIVE,
            'search' => $normalizedSearch,
        ]);

        $this->applyCatalogSorting($query, [
            'search' => $normalizedSearch,
            'sort_by' => 'relevance',
        ]);

        $products = $query
            ->limit(max(1, min($limit, 10)))
            ->get();

        return [
            'products' => $products,
            'keywords' => $this->buildSuggestedKeywords($products, $normalizedSearch),
        ];
    }

public function findPublicByIdentifierOrSlug(string $identifier): ?Product
    {
        $trimmedIdentifier = trim($identifier);
        if ($trimmedIdentifier === '') {
            return null;
        }

        $catalogQuery = $this->newCatalogQuery()->visible();

        if (Str::isUuid($trimmedIdentifier)) {
            return $catalogQuery->whereKey($trimmedIdentifier)->first();
        }

        $normalizedSlug = Str::slug($trimmedIdentifier);
        if ($normalizedSlug === '') {
            return null;
        }

        $searchSeed = str_replace('-', ' ', $normalizedSlug);
        $tokens = collect(explode('-', $normalizedSlug))
            ->map(fn (string $token): string => trim($token))
            ->filter(fn (string $token): bool => $token !== '' && strlen($token) >= 2)
            ->unique()
            ->values();

        $candidates = $this->newCatalogQuery()
            ->visible()
            ->where(function (Builder $query) use ($searchSeed, $tokens): void {
                if ($searchSeed !== '') {
                    $query->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($searchSeed) . '%']);
                }

                foreach ($tokens as $token) {
                    $query->orWhereRaw('LOWER(name) LIKE ?', ['%' . strtolower($token) . '%']);
                }
            })
            ->limit(50)
            ->get();

        $exactCandidate = $candidates->first(
            fn (Product $product): bool => Str::slug((string) $product->name) === $normalizedSlug
        );
        if ($exactCandidate) {
            return $exactCandidate;
        }

        return $catalogQuery
            ->get()
            ->first(fn (Product $product): bool => Str::slug((string) $product->name) === $normalizedSlug);
    }

private function buildCatalogQuery(array $filters): Builder
    {
        $driver = DB::connection()->getDriverName();
        $rawStatus = strtolower(trim((string) ($filters['status'] ?? $filters['product_status'] ?? '')));
        $status = $this->normalizeStatusFilter($rawStatus);
        $rawFeatured = $filters['featured'] ?? $filters['is_featured'] ?? null;
        $isFeatured = $this->normalizeBooleanFilter($rawFeatured);
        $rawTradeIn = $filters['trade_in'] ?? $filters['tradeIn'] ?? null;
        $isTradeIn = $this->normalizeBooleanFilter($rawTradeIn);
        $stockStatus = strtolower(trim((string) ($filters['stock_status'] ?? '')));
        $applyVisible = filter_var($filters['apply_visible'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $excludeFailedSync = filter_var($filters['exclude_failed_sync'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $onlySyncActivated = filter_var($filters['only_sync_activated'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return $this->newCatalogQuery()
            ->when($applyVisible, fn (Builder $query) => $query->visible())
            ->when($status !== null, fn (Builder $query) => $query->whereRaw('LOWER(COALESCE(status, product_status)) = ?', [$status]))
            ->when($isFeatured !== null, fn (Builder $query) => $query->where('is_featured', $isFeatured))
            ->when($isTradeIn !== null, fn (Builder $query) => $query->where('trade_in', $isTradeIn))
            ->when($stockStatus !== '', fn (Builder $query) => $query->where('stock_status', $stockStatus))
            ->when($filters['category_id'] ?? null, fn (Builder $query, string $categoryId) => $query->where('category_id', $categoryId))
            ->when($filters['brand_id'] ?? null, fn (Builder $query, string $brandId) => $query->where('brand_id', $brandId))
            ->when($filters['brand'] ?? null, fn (Builder $query, string $brand) => $query->where('brand', $brand))
            ->when($filters['brands'] ?? null, fn (Builder $query, mixed $brands) => $this->applyBrandFilter($query, $brands))
            ->when($filters['category'] ?? null, fn (Builder $query, mixed $category) => $this->applyCategoryFilter($query, $category))
            ->when($filters['categories'] ?? null, fn (Builder $query, mixed $categories) => $this->applyCategoryFilter($query, $categories))
            ->when(array_key_exists('price_min', $filters) && $filters['price_min'] !== null && $filters['price_min'] !== '', function (Builder $query) use ($driver, $filters) {
                $query->whereRaw($this->resolveInventoryPriceExpression($driver) . ' >= ?', [(float) $filters['price_min']]);
            })
            ->when(array_key_exists('price_max', $filters) && $filters['price_max'] !== null && $filters['price_max'] !== '', function (Builder $query) use ($driver, $filters) {
                $query->whereRaw($this->resolveInventoryPriceExpression($driver) . ' <= ?', [(float) $filters['price_max']]);
            })
            ->when($onlySyncActivated, function (Builder $query) use ($driver) {
                $query->whereIn(
                    DB::raw($this->resolveMekariSyncStatusExpression($driver)),
                    self::ACTIVATED_SYNC_STATUSES
                );
            })
            ->when($excludeFailedSync, function (Builder $query) use ($driver) {
                $query->whereRaw($this->resolveMekariSyncStatusExpression($driver) . " <> 'failed'");
            });
    }

private function newCatalogQuery(): Builder
    {
        return Product::query()
            ->select('products.*')
            ->with([
                'category:id,name',
                'brandModel:id,name,slug,logo,is_active',
            ]);
    }

private function applyCatalogSorting(Builder $query, array $filters): void
    {
        $search = $this->normalizeSearchText((string) ($filters['search'] ?? ''));
        $sortBy = strtolower(trim((string) ($filters['sort_by'] ?? 'popular')));
        $driver = DB::connection()->getDriverName();

        if ($search !== '') {
            $this->applySearchConditions($query, $search, $driver);
            $query->orderByDesc('search_relevance');
        }

        match ($sortBy) {
            'price_asc' => $query->orderByRaw($this->resolveInventoryPriceExpression($driver) . ' asc'),
            'price_desc' => $query->orderByRaw($this->resolveInventoryPriceExpression($driver) . ' desc'),
            'newest' => $query->latest(),
            default => $query->orderByDesc('is_featured')->latest(),
        };
    }

private function applyBrandFilter(Builder $query, mixed $brands): void
    {
        $brandTokens = collect(explode(',', (string) $brands))
            ->map(fn ($token) => trim((string) $token))
            ->filter()
            ->values();

        if ($brandTokens->isEmpty()) {
            return;
        }

        $brandIdTokens = $brandTokens
            ->filter(fn (string $token) => Str::isUuid($token))
            ->values();
        $normalized = $brandTokens->map(fn (string $token) => strtolower($token))->all();

        $query->where(function (Builder $nested) use ($brandIdTokens, $normalized) {
            if ($brandIdTokens->isNotEmpty()) {
                $nested
                    ->whereIn('brand_id', $brandIdTokens->all())
                    ->orWhereIn(DB::raw('LOWER(brand)'), $normalized);
            } else {
                $nested->whereIn(DB::raw('LOWER(brand)'), $normalized);
            }

            $nested->orWhereHas('brandModel', function (Builder $brandQuery) use ($normalized) {
                $brandQuery
                    ->whereIn(DB::raw('LOWER(slug)'), $normalized)
                    ->orWhereIn(DB::raw('LOWER(name)'), $normalized);
            });
        });
    }

private function applyCategoryFilter(Builder $query, mixed $categories): void
    {
        $categoryTokens = collect(explode(',', (string) $categories))
            ->map(fn ($token) => trim((string) $token))
            ->filter()
            ->values();

        if ($categoryTokens->isEmpty()) {
            return;
        }

        $categoryIdTokens = $categoryTokens
            ->filter(fn (string $token) => Str::isUuid($token))
            ->values();
        $normalized = $categoryTokens
            ->flatMap(function (string $token): array {
                $lowered = strtolower($token);
                $spaced = preg_replace('/[-_]+/', ' ', $lowered) ?? $lowered;
                $spaced = preg_replace('/\s+/', ' ', trim($spaced)) ?? trim($lowered);

                return array_values(array_unique([
                    $lowered,
                    $spaced,
                ]));
            })
            ->filter()
            ->values()
            ->all();

        $query->where(function (Builder $nested) use ($categoryIdTokens, $normalized) {
            if ($categoryIdTokens->isNotEmpty()) {
                $nested
                    ->whereIn('category_id', $categoryIdTokens->all())
                    ->orWhereIn(DB::raw('LOWER(category)'), $normalized);
            } else {
                $nested->whereIn(DB::raw('LOWER(category)'), $normalized);
            }

            $nested->orWhereHas('category', function (Builder $categoryQuery) use ($categoryIdTokens, $normalized) {
                if ($categoryIdTokens->isNotEmpty()) {
                    $categoryQuery
                        ->whereIn('id', $categoryIdTokens->all())
                        ->orWhereIn(DB::raw('LOWER(name)'), $normalized);

                    return;
                }

                $categoryQuery->whereIn(DB::raw('LOWER(name)'), $normalized);
            });
        });
    }

private function applySearchConditions(Builder $query, string $search, string $driver): void
    {
        if ($driver === 'pgsql') {
            $this->applyPostgresSearchConditions($query, $search);
            return;
        }

        $keyword = '%' . strtolower($search) . '%';
        $prefixKeyword = strtolower($search) . '%';

        $query
            ->selectRaw(
                "(CASE
                    WHEN LOWER(products.name) = ? THEN 100
                    WHEN LOWER(products.name) LIKE ? THEN 80
                    WHEN LOWER(COALESCE(products.spu, '')) = ? THEN 70
                    WHEN LOWER(products.name) LIKE ? THEN 40
                    WHEN LOWER(COALESCE(products.brand, '')) LIKE ? THEN 25
                    WHEN LOWER(COALESCE(products.category, '')) LIKE ? THEN 20
                    ELSE 0
                END) as search_relevance",
                [
                    strtolower($search),
                    $prefixKeyword,
                    strtolower($search),
                    $keyword,
                    $keyword,
                    $keyword,
                ]
            )
            ->where(function (Builder $nested) use ($keyword) {
                $nested
                    ->whereRaw('LOWER(products.name) LIKE ?', [$keyword])
                    ->orWhereRaw('LOWER(COALESCE(products.brand, \'\')) LIKE ?', [$keyword])
                    ->orWhereRaw('LOWER(COALESCE(products.category, \'\')) LIKE ?', [$keyword])
                    ->orWhereRaw('LOWER(COALESCE(products.spu, \'\')) LIKE ?', [$keyword])
                    ->orWhereRaw('LOWER(COALESCE(products.description, \'\')) LIKE ?', [$keyword]);
            });
    }

private function applyPostgresSearchConditions(Builder $query, string $search): void
    {
        $hasTrigram = $this->supportsPostgresTrigram();
        $exactKeyword = strtolower($search);
        $prefixKeyword = $exactKeyword . '%';
        $containsKeyword = '%' . str_replace(' ', '%', $exactKeyword) . '%';
        $searchDocument = $this->resolvePostgresSearchDocumentExpression();
        $tsQuery = $this->buildPostgresTsQuery($search);

        $relevanceSql = "(CASE
                WHEN LOWER(products.name) = ? THEN 140
                WHEN LOWER(products.name) LIKE ? THEN 110
                WHEN LOWER(COALESCE(products.spu, '')) = ? THEN 95
                WHEN LOWER(COALESCE(products.category, '')) = ? THEN 75
                WHEN LOWER(products.name) LIKE ? THEN 55
                WHEN LOWER(COALESCE(products.brand, '')) LIKE ? THEN 35
                WHEN LOWER(COALESCE(products.category, '')) LIKE ? THEN 25
                ELSE 0
            END"
            . ($hasTrigram
                ? "
            + (GREATEST(similarity(LOWER(products.name), ?), 0) * 30)
            + (GREATEST(similarity(LOWER(COALESCE(products.spu, '')), ?), 0) * 20)
            + (GREATEST(similarity(LOWER(COALESCE(products.brand, '')), ?), 0) * 12)
            + (GREATEST(similarity(LOWER(COALESCE(products.category, '')), ?), 0) * 10)"
                : '')
            . ($tsQuery !== null
                ? " + (CASE
                    WHEN {$searchDocument} @@ to_tsquery('simple', ?) THEN ts_rank_cd({$searchDocument}, to_tsquery('simple', ?)) * 60
                    ELSE 0
                END)"
                : '')
            . ') as search_relevance';

        $bindings = [
            $exactKeyword,
            $prefixKeyword,
            $exactKeyword,
            $exactKeyword,
            $containsKeyword,
            $containsKeyword,
            $containsKeyword,
        ];

        if ($hasTrigram) {
            $bindings[] = $exactKeyword;
            $bindings[] = $exactKeyword;
            $bindings[] = $exactKeyword;
            $bindings[] = $exactKeyword;
        }

        if ($tsQuery !== null) {
            $bindings[] = $tsQuery;
            $bindings[] = $tsQuery;
        }

        $query->selectRaw($relevanceSql, $bindings)
            ->where(function (Builder $nested) use ($containsKeyword, $exactKeyword, $searchDocument, $tsQuery, $hasTrigram) {
                if ($tsQuery !== null) {
                    $nested->whereRaw("{$searchDocument} @@ to_tsquery('simple', ?)", [$tsQuery]);
                }

                $nested
                    ->orWhereRaw('LOWER(products.name) LIKE ?', [$containsKeyword])
                    ->orWhereRaw('LOWER(COALESCE(products.brand, \'\')) LIKE ?', [$containsKeyword])
                    ->orWhereRaw('LOWER(COALESCE(products.category, \'\')) LIKE ?', [$containsKeyword])
                    ->orWhereRaw('LOWER(COALESCE(products.spu, \'\')) LIKE ?', [$containsKeyword])
                    ->orWhereRaw('LOWER(COALESCE(products.description, \'\')) LIKE ?', [$containsKeyword]);

                if ($hasTrigram) {
                    $nested
                        ->orWhereRaw('similarity(LOWER(products.name), ?) >= 0.14', [$exactKeyword])
                        ->orWhereRaw('similarity(LOWER(COALESCE(products.spu, \'\')), ?) >= 0.14', [$exactKeyword]);
                }
            });
    }

private function supportsPostgresTrigram(): bool
    {
        if ($this->postgresTrigramAvailable !== null) {
            return $this->postgresTrigramAvailable;
        }

        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->postgresTrigramAvailable = false;
            return false;
        }

        try {
            $result = DB::selectOne("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS available");
            $this->postgresTrigramAvailable = (bool) ($result->available ?? false);
        } catch (\Throwable) {
            $this->postgresTrigramAvailable = false;
        }

        return $this->postgresTrigramAvailable;
    }

private function resolveInventoryPriceExpression(string $driver): string
    {
        if ($driver === 'pgsql') {
            return "COALESCE(NULLIF(products.inventory->>'price', ''), '0')::numeric";
        }

        if ($driver === 'sqlite') {
            return "CAST(COALESCE(json_extract(products.inventory, '$.price'), '0') AS REAL)";
        }

        return "CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(products.inventory, '$.price')), '0') AS DECIMAL(15,2))";
    }

private function resolveMekariSyncStatusExpression(string $driver): string
    {
        if ($driver === 'pgsql') {
            return "LOWER(COALESCE(mekari_status->>'sync_status', ''))";
        }

        if ($driver === 'sqlite') {
            return "LOWER(COALESCE(json_extract(mekari_status, '$.sync_status'), ''))";
        }

        return "LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(mekari_status, '$.sync_status')), ''))";
    }

private function resolvePostgresSearchDocumentExpression(): string
    {
        return "to_tsvector('simple', trim(both ' ' from concat_ws(' ', COALESCE(products.name, ''), COALESCE(products.spu, ''), COALESCE(products.brand, ''), COALESCE(products.category, ''), COALESCE(products.description, ''))))";
    }

private function buildPostgresTsQuery(string $search): ?string
    {
        $terms = collect(preg_split('/\s+/', strtolower($search)) ?: [])
            ->map(fn (string $term) => preg_replace('/[^[:alnum:]]+/u', '', $term) ?? '')
            ->filter(fn (string $term) => $term !== '')
            ->take(8)
            ->values();

        if ($terms->isEmpty()) {
            return null;
        }

        return $terms
            ->map(fn (string $term) => "{$term}:*")
            ->implode(' & ');
    }

private function normalizeSearchText(string $search): string
    {
        return preg_replace('/\s+/', ' ', strtolower(trim($search))) ?? '';
    }

private function buildSuggestedKeywords(Collection $products, string $search): array
    {
        $searchTerms = collect(preg_split('/\s+/', strtolower($search)) ?: [])
            ->filter()
            ->values();

        $keywords = $products
            ->flatMap(function (Product $product): array {
                $items = [];

                $brand = trim((string) ($product->brand ?? ''));
                $category = trim((string) ($product->category ?? ''));
                $name = trim((string) ($product->name ?? ''));

                if ($brand !== '') {
                    $items[] = $brand;
                }

                if ($category !== '') {
                    $items[] = $category;
                }

                if ($name !== '') {
                    $nameParts = preg_split('/\s+/', $name) ?: [];
                    $items[] = implode(' ', array_slice($nameParts, 0, min(2, count($nameParts))));
                }

                return $items;
            })
            ->map(fn (string $keyword) => trim(preg_replace('/\s+/', ' ', $keyword) ?? ''))
            ->filter(fn (string $keyword) => $keyword !== '')
            ->reject(function (string $keyword) use ($search, $searchTerms): bool {
                $normalized = strtolower($keyword);
                return $normalized === strtolower($search)
                    || $searchTerms->contains($normalized)
                    || str_contains(strtolower($search), $normalized);
            })
            ->unique(fn (string $keyword) => strtolower($keyword))
            ->take(6)
            ->values();

        return $keywords->all();
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
}