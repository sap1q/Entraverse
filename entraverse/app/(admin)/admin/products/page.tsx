"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useProductSyncStatus } from "@/hooks/useProductSyncStatus";
import api, { isAxiosError } from "@/lib/axios";
import { patchProductStatus } from "@/lib/api/product";
import { resolveApiOriginUrl } from "@/lib/api-config";
import { sumSharedInventoryStockFromVariantRows } from "@/lib/sharedInventory";
import { formatDateTimeID } from "@/lib/utils/formatter";
import { useDebounce } from "@/src/hooks/useDebounce";
import ProductTable, { type ProductTableProduct } from "@/components/features/products/ProductTable";

type ProductVisibilityStatus = "active" | "inactive" | "draft";
type ProductStockStatus = "in_stock" | "out_of_stock" | "preorder";

type ApiVariantPricingRow = Record<string, unknown>;
type ApiPhoto = string | { url?: string | null; is_primary?: boolean | null } | null;

type ApiProduct = {
  id: string;
  name: string;
  slug?: string | null;
  brand?: string | null;
  spu?: string | null;
  status?: string | null;
  product_status?: string | null;
  stock_status?: string | null;
  is_featured?: boolean | null;
  jurnal_id?: string | null;
  jurnal_metadata?: unknown;
  mekari_status?: {
    sync_status?: string | null;
  } | null;
  main_image?: string | null;
  photos?: ApiPhoto[] | null;
  inventory?: {
    total_stock?: number;
  } | null;
  variant_pricing?: ApiVariantPricingRow[] | null;
};

type FetchErrorState = {
  message: string;
  debug: string;
};

type PaginationMeta = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
};

const MASTER_PRODUCT_PAGE_SIZE = 25;

const normalizeImageUrl = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(blob:|data:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return resolveApiOriginUrl(trimmed);
  return resolveApiOriginUrl(`/storage/products/${trimmed}`);
};

const resolvePrimaryPhoto = (product: ApiProduct): string => {
  const main = normalizeImageUrl(product.main_image);
  if (main) return main;

  const photos = Array.isArray(product.photos) ? product.photos : [];
  const normalizedPhotos = photos
    .map((entry) => {
      if (typeof entry === "string") {
        return { url: normalizeImageUrl(entry), isPrimary: false };
      }

      if (entry && typeof entry === "object") {
        return {
          url: normalizeImageUrl(entry.url),
          isPrimary: entry.is_primary === true,
        };
      }

      return { url: "", isPrimary: false };
    })
    .filter((entry) => entry.url.length > 0);

  const explicitPrimary = normalizedPhotos.find((entry) => entry.isPrimary);
  if (explicitPrimary) return explicitPrimary.url;

  return normalizedPhotos[0]?.url ?? "/product-placeholder.svg";
};

const isRequestCanceled = (error: unknown): boolean => {
  if (isAxiosError(error)) {
    return error.code === "ERR_CANCELED";
  }

  return error instanceof DOMException && error.name === "AbortError";
};

const parsePrice = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^\d]/g, "");
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasPositivePrice = (value: number | null | undefined): boolean =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const normalizeStatus = (status: string | null | undefined): ProductVisibilityStatus => {
  const normalized = String(status ?? "").trim().toLowerCase();
  if (normalized === "inactive") return "inactive";
  if (normalized === "draft" || normalized === "pending" || normalized === "pending_approval") return "draft";
  return "active";
};

const normalizeStockStatus = (stockStatus: string | null | undefined, stock: number): ProductStockStatus => {
  const normalized = String(stockStatus ?? "").trim().toLowerCase();
  if (normalized === "preorder") return "preorder";
  if (stock <= 0) return "out_of_stock";
  if (normalized === "out_of_stock") return "out_of_stock";
  if (normalized === "in_stock") return "in_stock";
  return stock > 0 ? "in_stock" : "out_of_stock";
};

const resolveJurnalArchived = (metadata: unknown): boolean => {
  if (!metadata || typeof metadata !== "object") return false;

  const source = metadata as Record<string, unknown>;
  const directProduct = source.product;
  if (directProduct && typeof directProduct === "object") {
    const value = (directProduct as Record<string, unknown>).archive;
    if (typeof value === "boolean") return value;
  }

  const nestedData = source.data;
  if (nestedData && typeof nestedData === "object") {
    const nestedProduct = (nestedData as Record<string, unknown>).product;
    if (nestedProduct && typeof nestedProduct === "object") {
      const value = (nestedProduct as Record<string, unknown>).archive;
      if (typeof value === "boolean") return value;
    }
  }

  const productList = source.products;
  if (Array.isArray(productList) && productList.length > 0) {
    const first = productList[0];
    if (first && typeof first === "object") {
      const value = (first as Record<string, unknown>).archive;
      if (typeof value === "boolean") return value;
    }
  }

  return false;
};

const resolveJurnalReady = (product: ApiProduct): boolean => {
  const syncState = String(product.mekari_status?.sync_status ?? "")
    .trim()
    .toLowerCase();

  return (
    Boolean(product.jurnal_id) ||
    new Set(["activate", "active", "created", "imported_from_jurnal", "success", "synced", "updated"]).has(syncState)
  );
};

const mapApiProduct = (product: ApiProduct): ProductTableProduct => {
  const variantRows = Array.isArray(product.variant_pricing) ? product.variant_pricing : [];

  const normalizedVariants = variantRows.map((variant) => {
    const skuValue = variant.sku ?? variant.variant_code ?? product.spu ?? "UNKNOWN-SKU";
    const labelValue = variant.label ?? variant.variant_name ?? variant.code ?? "Default";

    return {
      sku: String(skuValue),
      label: String(labelValue),
      stock: Number(variant.stock ?? 0),
      offlinePrice: parsePrice(variant.offline_price),
      entraversePrice: parsePrice(variant.entraverse_price ?? variant.price),
      tiktokPrice: parsePrice(variant.tiktok_price),
      tokopediaPrice: parsePrice(variant.tokopedia_price),
      shopeePrice: parsePrice(variant.shopee_price),
    };
  });

  const groupedTotalStock = sumSharedInventoryStockFromVariantRows(variantRows);
  const totalStock =
    variantRows.length > 0
      ? groupedTotalStock
      : (product.inventory?.total_stock ?? normalizedVariants.reduce((sum, item) => sum + item.stock, 0));
  const status = normalizeStatus(product.status ?? product.product_status);
  const jurnalReady = resolveJurnalReady(product);

  return {
    id: product.id,
    name: product.name,
    slug: String(product.slug ?? product.name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-"),
    brand: product.brand ?? null,
    spu: product.spu ?? "N/A",
    jurnal_id: product.jurnal_id ?? null,
    jurnal_archived: resolveJurnalArchived(product.jurnal_metadata),
    inventory: {
      total_stock: totalStock,
    },
    photo: resolvePrimaryPhoto(product),
    status,
    stock_status: normalizeStockStatus(product.stock_status, totalStock),
    is_featured: Boolean(product.is_featured),
    marketplaceSync: {
      tokopedia: jurnalReady && normalizedVariants.some((variant) => hasPositivePrice(variant.tokopediaPrice)),
      tiktok: jurnalReady && normalizedVariants.some((variant) => hasPositivePrice(variant.tiktokPrice)),
      shopee: jurnalReady && normalizedVariants.some((variant) => hasPositivePrice(variant.shopeePrice)),
    },
    variant_pricing: normalizedVariants,
  };
};

const resolveProductsEndpoint = (): string => "/v1/admin/products";

const extractProductsFromPayload = (payload: unknown): ApiProduct[] => {
  if (Array.isArray(payload)) {
    return payload as ApiProduct[];
  }

  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;

    if (Array.isArray(data)) {
      return data as ApiProduct[];
    }

    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: ApiProduct[] }).data;
    }
  }

  return [];
};

const extractPaginationMeta = (payload: unknown): PaginationMeta => {
  const fallback: PaginationMeta = {
    currentPage: 1,
    lastPage: 1,
    perPage: MASTER_PRODUCT_PAGE_SIZE,
    total: 0,
  };

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const source = payload as {
    meta?: {
      current_page?: number;
      last_page?: number;
      per_page?: number;
      total?: number;
    };
  };

  const meta = source.meta;
  if (!meta) {
    return fallback;
  }

  return {
    currentPage: Number(meta.current_page ?? 1),
    lastPage: Number(meta.last_page ?? 1),
    perPage: Number(meta.per_page ?? MASTER_PRODUCT_PAGE_SIZE),
    total: Number(meta.total ?? 0),
  };
};

const buildFetchErrorState = (error: unknown): FetchErrorState => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const url = String(error.config?.url ?? resolveProductsEndpoint());
    const baseURL = String(error.config?.baseURL ?? api.defaults.baseURL ?? "N/A");
    const method = String(error.config?.method ?? "GET").toUpperCase();

    if (status === 401) {
      return {
        message: "Sesi login berakhir. Silakan login kembali.",
        debug: `${method} ${baseURL}${url} -> 401`,
      };
    }

    if (status === 404) {
      return {
        message: "Endpoint produk tidak ditemukan.",
        debug: `${method} ${baseURL}${url} -> 404`,
      };
    }

    if (error.code === "ECONNABORTED") {
      return {
        message: "Permintaan timeout. Respons server terlalu lama.",
        debug: `${method} ${baseURL}${url} -> ECONNABORTED`,
      };
    }

    if (error.code === "ERR_NETWORK") {
      return {
        message: "Network error. Pastikan API Laravel aktif dan CORS mengizinkan origin frontend.",
        debug: `${method} ${baseURL}${url} -> ERR_NETWORK`,
      };
    }

    const apiMessage =
      (typeof error.response?.data?.message === "string" && error.response.data.message) ||
      error.message ||
      "Gagal memuat data produk.";

    return {
      message: apiMessage,
      debug: `${method} ${baseURL}${url} -> ${status ?? "NO_STATUS"}`,
    };
  }

  return {
    message: "Terjadi kesalahan yang tidak diketahui saat memuat produk.",
    debug: "UNKNOWN_ERROR",
  };
};

export default function MasterProdukPage() {
  const { metrics: syncMetrics, loading: syncMetricsLoading } = useProductSyncStatus();
  const [products, setProducts] = useState<ProductTableProduct[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductVisibilityStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<FetchErrorState | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [perPage, setPerPage] = useState(MASTER_PRODUCT_PAGE_SIZE);
  const [mappingJurnal, setMappingJurnal] = useState(false);
  const [mappingMessage, setMappingMessage] = useState<string | null>(null);
  const [quickStatusMessage, setQuickStatusMessage] = useState<string | null>(null);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Record<string, boolean>>({});
  const [updatingFeaturedIds, setUpdatingFeaturedIds] = useState<Record<string, boolean>>({});
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const controller = new AbortController();
    let stillMounted = true;

    const fetchProducts = async () => {
      setIsLoading(true);
      setErrorState(null);
      try {
        const response = await api.get(resolveProductsEndpoint(), {
          params: {
            search: debouncedSearch || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            page: currentPage,
            per_page: MASTER_PRODUCT_PAGE_SIZE,
          },
          signal: controller.signal,
        });

        const items = extractProductsFromPayload(response.data);
        const meta = extractPaginationMeta(response.data);

        if (!stillMounted) return;
        setProducts(items.map(mapApiProduct));
        setCurrentPage(Math.max(1, meta.currentPage));
        setLastPage(Math.max(1, meta.lastPage));
        setPerPage(Math.max(1, meta.perPage));
        setTotalProducts(Math.max(0, meta.total));
      } catch (error) {
        if (isRequestCanceled(error)) return;

        const nextErrorState = buildFetchErrorState(error);

        if (process.env.NODE_ENV === "development") {
          if (isAxiosError(error)) {
            console.error("[Products Fetch Error]", {
              message: nextErrorState.message,
              status: error.response?.status,
              url: error.config?.url,
              baseURL: error.config?.baseURL,
              params: error.config?.params,
              code: error.code,
              data: error.response?.data,
            });
          } else {
            console.error("[Products Fetch Error]", error);
          }
        }
        if (!stillMounted) return;
        setProducts([]);
        setTotalProducts(0);
        setLastPage(1);
        setErrorState(nextErrorState);
      } finally {
        if (stillMounted) setIsLoading(false);
      }
    };

    void fetchProducts();

    return () => {
      stillMounted = false;
      controller.abort();
    };
  }, [currentPage, debouncedSearch, reloadTick, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  const refreshProducts = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  const mergeUpdatedProduct = useCallback((payload: Record<string, unknown> | null) => {
    if (!payload || typeof payload !== "object") return;
    const mapped = mapApiProduct(payload as unknown as ApiProduct);
    setProducts((prev) => prev.map((item) => (item.id === mapped.id ? { ...item, ...mapped } : item)));
  }, []);

  const handleToggleFeatured = useCallback(
    async (product: ProductTableProduct) => {
      const nextValue = !product.is_featured;
      const previous = product;
      setQuickStatusMessage(null);

      setUpdatingFeaturedIds((prev) => ({ ...prev, [product.id]: true }));
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, is_featured: nextValue } : item
        )
      );

      try {
        const updated = await patchProductStatus(product.id, { is_featured: nextValue });
        mergeUpdatedProduct(updated);
      } catch (error) {
        setProducts((prev) => prev.map((item) => (item.id === product.id ? previous : item)));
        setQuickStatusMessage(
          error instanceof Error ? error.message : "Gagal memperbarui status featured."
        );
      } finally {
        setUpdatingFeaturedIds((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
      }
    },
    [mergeUpdatedProduct]
  );

  const handleToggleStatus = useCallback(
    async (product: ProductTableProduct) => {
      const nextStatus: ProductVisibilityStatus = product.status === "active" ? "inactive" : "active";
      const previous = product;
      setQuickStatusMessage(null);

      setUpdatingStatusIds((prev) => ({ ...prev, [product.id]: true }));
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, status: nextStatus } : item
        )
      );

      try {
        const updated = await patchProductStatus(product.id, { status: nextStatus });
        mergeUpdatedProduct(updated);
      } catch (error) {
        setProducts((prev) => prev.map((item) => (item.id === product.id ? previous : item)));
        setQuickStatusMessage(
          error instanceof Error ? error.message : "Gagal memperbarui status produk."
        );
      } finally {
        setUpdatingStatusIds((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
      }
    },
    [mergeUpdatedProduct]
  );

  const handleMapJurnalProducts = useCallback(async () => {
    setMappingJurnal(true);
    setMappingMessage(null);

    try {
      const response = await api.post("/v1/integrations/jurnal/products/import", {
        page: 1,
        per_page: 50,
        max_pages: 3,
        include_archive: true,
      });

      const result = response.data?.data as
        | {
            created?: number;
            updated?: number;
            failed_count?: number;
            imported_count?: number;
          }
        | undefined;

      setMappingMessage(
        `Import Jurnal selesai. Imported: ${result?.imported_count ?? 0}, Created: ${result?.created ?? 0}, Updated: ${result?.updated ?? 0}, Failed: ${result?.failed_count ?? 0}.`
      );
      refreshProducts();
    } catch (error) {
      if (isAxiosError(error)) {
        setMappingMessage(error.response?.data?.message ?? "Gagal menarik produk dari Jurnal.");
      } else {
        setMappingMessage("Gagal menarik produk dari Jurnal.");
      }
    } finally {
      setMappingJurnal(false);
    }
  }, [refreshProducts]);

  const inboundSyncLabel = syncMetrics.latestInboundSync ? formatDateTimeID(syncMetrics.latestInboundSync) : "Belum ada data";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Master Produk</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMapJurnalProducts}
              disabled={mappingJurnal}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              {mappingJurnal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronsUpDown className="h-4 w-4" />}
              {mappingJurnal ? "Menarik dari Jurnal..." : "Tarik dari Jurnal"}
            </button>
            <Link
              href="/admin/master-produk/tambah"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              + Tambah produk
            </Link>
          </div>
        </div>

        {mappingMessage ? (
          <p className="mt-3 text-xs text-slate-600">{mappingMessage}</p>
        ) : null}
        {quickStatusMessage ? (
          <p className="mt-2 text-xs text-rose-600">{quickStatusMessage}</p>
        ) : null}

        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Last Inbound Sync</p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {syncMetricsLoading ? "Memuat..." : inboundSyncLabel}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Master Products Loaded</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {syncMetricsLoading ? "..." : syncMetrics.masterProductCount}
            </p>
          </article>
        </div>

      </section>

      <ProductTable
        products={products}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refreshProducts}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => setStatusFilter(value)}
        onToggleFeatured={handleToggleFeatured}
        onToggleStatus={handleToggleStatus}
        updatingFeaturedIds={updatingFeaturedIds}
        updatingStatusIds={updatingStatusIds}
        pagination={{
          currentPage,
          lastPage,
          perPage,
          total: totalProducts,
          onPageChange: setCurrentPage,
        }}
      />

      {errorState ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-rose-800">Error loading products</h2>
          <p className="mt-1 text-sm text-rose-700">{errorState.message}</p>
          <p className="mt-2 text-xs text-rose-600">
            Debug: {errorState.debug} | Endpoint: {resolveProductsEndpoint()} | Base URL:{" "}
            {String(api.defaults.baseURL ?? "N/A")}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={refreshProducts}
              className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Coba lagi
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
