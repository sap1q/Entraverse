"use client";

import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { productsApi } from "@/lib/api/products";
import { DEFAULT_PRODUCTS_PER_PAGE } from "@/lib/constants/filters";
import type { Product, ProductApiResponse, ProductFilters } from "@/types/product.types";

type UpdateFiltersInput = Record<
  string,
  string | number | Array<string | number> | undefined | null
>;

type UpdateFilterOptions = {
  resetPage?: boolean;
};

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  meta: ProductApiResponse["meta"] | null;
  filters: ProductFilters;
  updateFilters: (newFilters: UpdateFiltersInput, options?: UpdateFilterOptions) => void;
  clearFilters: () => void;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

interface ProductsProviderProps {
  children: ReactNode;
  forcedCategory?: string;
}

const DEFAULT_SORT: NonNullable<ProductFilters["sort_by"]> = "popular";
const ALLOWED_SORTS = new Set<NonNullable<ProductFilters["sort_by"]>>([
  "popular",
  "price_asc",
  "price_desc",
  "newest",
  "rating",
]);

const ProductsContext = createContext<UseProductsResult | null>(null);

const parsePositiveNumber = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const parseSortValue = (value: string | null): NonNullable<ProductFilters["sort_by"]> => {
  if (!value) return DEFAULT_SORT;
  if (ALLOWED_SORTS.has(value as NonNullable<ProductFilters["sort_by"]>)) {
    return value as NonNullable<ProductFilters["sort_by"]>;
  }

  return DEFAULT_SORT;
};

const parseBooleanFilter = (value: string | null): boolean => {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

const parseStringFilters = (
  searchParams: Pick<URLSearchParams, "getAll">,
  key: string
): string[] => {
  const values = searchParams
    .getAll(key)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(values));
};

const parseNumberFilters = (
  searchParams: Pick<URLSearchParams, "getAll">,
  key: string
): number[] => {
  const values = searchParams
    .getAll(key)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return Array.from(new Set(values));
};

const useProductsState = (forcedCategory?: string): UseProductsResult => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<ProductApiResponse["meta"] | null>(null);
  const requestVersionRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const buildFilters = useCallback((): ProductFilters => {
    const filters: ProductFilters = {
      page: parsePositiveNumber(searchParams.get("page"), 1),
      per_page: parsePositiveNumber(searchParams.get("per_page"), DEFAULT_PRODUCTS_PER_PAGE),
      sort_by: parseSortValue(searchParams.get("sort") ?? searchParams.get("sort_by")),
    };

    const categories = parseStringFilters(searchParams, "category");
    if (forcedCategory && !categories.includes(forcedCategory)) {
      categories.push(forcedCategory);
    }
    if (categories.length > 0) filters.categories = categories;

    const brands = parseStringFilters(searchParams, "brand");
    if (brands.length > 0) filters.brands = brands;

    const ratings = parseNumberFilters(searchParams, "rating");
    if (ratings.length > 0) filters.ratings = ratings;

    const priceMin = searchParams.get("price_min");
    if (priceMin !== null && priceMin.trim() !== "") {
      const parsedPriceMin = Number(priceMin);
      if (Number.isFinite(parsedPriceMin) && parsedPriceMin >= 0) {
        filters.price_min = parsedPriceMin;
      }
    }

    const priceMax = searchParams.get("price_max");
    if (priceMax !== null && priceMax.trim() !== "") {
      const parsedPriceMax = Number(priceMax);
      if (Number.isFinite(parsedPriceMax) && parsedPriceMax >= 0) {
        filters.price_max = parsedPriceMax;
      }
    }

    const search = searchParams.get("search");
    if (search && search.trim()) {
      filters.search = search.trim();
    }

    if (parseBooleanFilter(searchParams.get("trade_in"))) {
      filters.trade_in = true;
    }

    return filters;
  }, [searchParams, forcedCategory]);

  const filters = useMemo(() => buildFilters(), [buildFilters]);

  const fetchProducts = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;

    loadMoreInFlightRef.current = false;
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    try {
      const response = await productsApi.getProducts(filters);
      if (requestVersion !== requestVersionRef.current) return;

      if (!response.success) {
        setProducts([]);
        setMeta(null);
        setCurrentPage(1);
        setHasMore(false);
        setError("Gagal memuat daftar produk.");
        return;
      }

      setProducts(response.data);
      setMeta(response.meta);
      const resolvedCurrentPage = Math.max(1, Number(response.meta.current_page || filters.page || 1));
      const resolvedLastPage = Math.max(resolvedCurrentPage, Number(response.meta.last_page || 1));
      setCurrentPage(resolvedCurrentPage);
      setHasMore(resolvedCurrentPage < resolvedLastPage);
    } catch (fetchError) {
      if (requestVersion !== requestVersionRef.current) return;
      console.error(fetchError);
      setProducts([]);
      setMeta(null);
      setCurrentPage(1);
      setHasMore(false);
      setError("Gagal memuat produk. Silakan coba lagi.");
    } finally {
      if (requestVersion !== requestVersionRef.current) return;
      setLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || loadMoreInFlightRef.current) {
      return;
    }

    const requestVersion = requestVersionRef.current;
    const nextPage = currentPage + 1;

    loadMoreInFlightRef.current = true;
    setLoadingMore(true);

    try {
      const response = await productsApi.loadMoreProducts({
        ...filters,
        page: nextPage,
      });
      if (requestVersion !== requestVersionRef.current) return;

      if (!response.success) {
        setHasMore(false);
        setError("Gagal memuat produk tambahan.");
        return;
      }

      setProducts((previous) => {
        const existing = new Set(previous.map((item) => item.id));
        const appended = response.data.filter((item) => !existing.has(item.id));
        return [...previous, ...appended];
      });
      setMeta(response.meta);

      const resolvedCurrentPage = Math.max(1, Number(response.meta.current_page || nextPage));
      const resolvedLastPage = Math.max(resolvedCurrentPage, Number(response.meta.last_page || resolvedCurrentPage));
      setCurrentPage(resolvedCurrentPage);
      setHasMore(resolvedCurrentPage < resolvedLastPage);
    } catch (fetchError) {
      if (requestVersion !== requestVersionRef.current) return;
      console.error(fetchError);
      setError("Gagal memuat produk tambahan. Silakan scroll lagi untuk mencoba ulang.");
    } finally {
      loadMoreInFlightRef.current = false;
      if (requestVersion !== requestVersionRef.current) return;
      setLoadingMore(false);
    }
  }, [currentPage, filters, hasMore, loading, loadingMore]);

  const updateFilters = useCallback(
    (newFilters: UpdateFiltersInput, options?: UpdateFilterOptions) => {
      const params = new URLSearchParams(searchParams.toString());
      const shouldResetPage = options?.resetPage ?? true;

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
          return;
        }

        if (Array.isArray(value)) {
          params.delete(key);
          value
            .map((item) => String(item).trim())
            .filter((item) => item.length > 0)
            .forEach((item) => params.append(key, item));
          return;
        }

        params.set(key, String(value));
      });

      if (forcedCategory) {
        const mergedCategories = Array.from(new Set([...params.getAll("category"), forcedCategory]));
        params.delete("category");
        mergedCategories.forEach((category) => params.append("category", category));
      }

      if (shouldResetPage && !Object.prototype.hasOwnProperty.call(newFilters, "page")) {
        params.set("page", "1");
      }

      const query = params.toString();
      router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
    },
    [forcedCategory, pathname, router, searchParams]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();

    if (forcedCategory) {
      params.append("category", forcedCategory);
    }

    const query = params.toString();
    router.push(query.length > 0 ? `${pathname}?${query}` : pathname);
  }, [forcedCategory, pathname, router]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    error,
    meta,
    filters,
    updateFilters,
    clearFilters,
    loadMore,
    refetch: fetchProducts,
  };
};

export const useProducts = (forcedCategory?: string): UseProductsResult => {
  return useProductsState(forcedCategory);
};

export const ProductsProvider = ({ children, forcedCategory }: ProductsProviderProps) => {
  const value = useProductsState(forcedCategory);
  return createElement(ProductsContext.Provider, { value }, children);
};

export const useProductsContext = (): UseProductsResult => {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error("useProductsContext must be used inside ProductsProvider.");
  }

  return context;
};
