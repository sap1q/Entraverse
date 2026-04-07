"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  ShieldCheck,
  Store,
  Unplug,
  X,
} from "lucide-react";
import {
  beginMarketplaceAuthorization,
  connectMarketplaceVariant,
  disconnectMarketplaceConnection,
  disconnectMarketplaceVariant,
  requestMarketplaceSync,
  type MarketplaceChannel,
} from "@/lib/api/marketplace-integrations";
import { useMarketplaceConnections } from "@/hooks/useMarketplaceConnections";
import { useProductSyncStatus } from "@/hooks/useProductSyncStatus";
import api, { isAxiosError } from "@/lib/axios";
import { resolveApiOriginUrl } from "@/lib/api-config";
import { formatDateTimeID } from "@/lib/utils/formatter";
import { useDebounce } from "@/src/hooks/useDebounce";

type MarketplaceTab = MarketplaceChannel;
type SyncStatus = "ACTIVATE" | "FAILED" | "PENDING";

type ApiVariantPricingRow = Record<string, unknown>;
type ApiPhoto = string | { url?: string | null; is_primary?: boolean | null } | null;
type ApiProduct = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  spu?: string | null;
  status?: string | null;
  jurnal_id?: string | null;
  mekari_status?: {
    sync_status?: string | null;
    last_sync?: string | null;
    mekari_id?: string | null;
    last_error?: string | null;
  } | null;
  main_image?: string | null;
  photos?: ApiPhoto[] | null;
  inventory?: {
    total_stock?: number;
  } | null;
  variant_pricing?: ApiVariantPricingRow[] | null;
};

type VariantRow = {
  id: string;
  apiVariantId: string;
  name: string;
  sellerSku: string;
  price: number;
  stock: number;
  tiktokPrice: number;
  shopeePrice: number;
  tiktokMapped: boolean;
  shopeeMapped: boolean;
  seededConnection: boolean;
};

type SpuRow = {
  id: string;
  photo: string;
  name: string;
  spu: string;
  brand: string;
  category: string;
  totalStock: number;
  status: SyncStatus;
  statusDetail: string | null;
  variants: VariantRow[];
};

type PaginationMeta = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
};

const MARKETPLACE_PAGE_SIZE = 25;

const currencyFormatter = new Intl.NumberFormat("id-ID");
const formatIdr = (value: number): string => `Rp ${currencyFormatter.format(Math.max(0, value))}`;
const getMarketplaceVariantPrice = (variant: VariantRow, channel: MarketplaceChannel): number =>
  channel === "tiktok" ? variant.tiktokPrice : variant.shopeePrice;

const parsePrice = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[^\d]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseStock = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

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

const resolveProductsEndpoint = (): string => {
  const base = String(api.defaults.baseURL ?? "").toLowerCase();
  return base.endsWith("/v1") || base.includes("/api/v1") ? "/products" : "/v1/products";
};

const extractProducts = (payload: unknown): ApiProduct[] => {
  if (Array.isArray(payload)) return payload as ApiProduct[];

  if (payload && typeof payload === "object") {
    const data = (payload as { data?: unknown }).data;

    if (Array.isArray(data)) return data as ApiProduct[];
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
    perPage: MARKETPLACE_PAGE_SIZE,
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
    perPage: Number(meta.per_page ?? MARKETPLACE_PAGE_SIZE),
    total: Number(meta.total ?? 0),
  };
};

const mapProductToSpuRow = (product: ApiProduct): SpuRow => {
  const variantRows = Array.isArray(product.variant_pricing) ? product.variant_pricing : [];
  const variants: VariantRow[] = variantRows.map((row, index) => {
    const label = String(row.label ?? row.variant_name ?? row.name ?? "Default Variant");
    const sku = String(row.sku_seller ?? row.sku ?? row.variant_code ?? `${product.spu ?? "SPU"}-${index + 1}`);
    const apiVariantId = String(row.id ?? row.uuid ?? row.variant_id ?? row.sku_seller ?? row.sku ?? `${product.id}-${index + 1}`);
    const price = parsePrice(row.entraverse_price ?? row.offline_price ?? row.price);
    const stock = parseStock(row.stock);
    const tiktokPrice = parsePrice(row.tiktok_price);
    const shopeePrice = parsePrice(row.shopee_price);
    const mapping = row.marketplace_mapping && typeof row.marketplace_mapping === "object"
      ? (row.marketplace_mapping as { tiktok?: { id?: string | null } | null; shopee?: { id?: string | null } | null })
      : null;
    const tiktokMapped = Boolean(mapping?.tiktok?.id) || (sku.trim().length > 0 && tiktokPrice > 0);
    const shopeeMapped = Boolean(mapping?.shopee?.id) || (sku.trim().length > 0 && shopeePrice > 0);
    const seededConnection = tiktokMapped || shopeeMapped;

    return {
      id: `${product.id}:${apiVariantId}:${index}`,
      apiVariantId,
      name: label,
      sellerSku: sku,
      price,
      stock,
      tiktokPrice,
      shopeePrice,
      tiktokMapped,
      shopeeMapped,
      seededConnection,
    };
  });

  const totalStockFromVariants = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const totalStock = product.inventory?.total_stock ?? totalStockFromVariants;
  const syncState = String(product.mekari_status?.sync_status ?? "").toLowerCase();

  const successfulSyncStates = new Set([
    "activate",
    "success",
    "synced",
    "imported_from_jurnal",
    "created",
    "updated",
    "active",
  ]);
  const failedSyncStates = new Set(["failed", "error"]);

  let syncStatus: SyncStatus = "PENDING";
  if (failedSyncStates.has(syncState)) {
    syncStatus = "FAILED";
  } else if (successfulSyncStates.has(syncState)) {
    syncStatus = "ACTIVATE";
  }

  return {
    id: product.id,
    photo: resolvePrimaryPhoto(product),
    name: product.name,
    spu: product.spu ?? "-",
    brand: product.brand ?? "-",
    category: product.category ?? "-",
    totalStock,
    status: syncStatus,
    statusDetail: syncStatus === "FAILED" ? String(product.mekari_status?.last_error ?? "").trim() || null : null,
    variants,
  };
};

const statusClassMap: Record<SyncStatus, string> = {
  ACTIVATE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-amber-200 bg-amber-50 text-amber-700",
  PENDING: "border-blue-200 bg-blue-50 text-blue-700",
};

const integrationStatusLabelMap = {
  connected: "Tersambung",
  disconnected: "Belum Tersambung",
  pending: "Menunggu Otorisasi",
  expired: "Perlu Re-Otorisasi",
  error: "Butuh Review",
} as const;

const integrationStatusClassMap = {
  connected: "border-emerald-300 bg-emerald-100 text-emerald-800",
  disconnected: "border-slate-300 bg-slate-100 text-slate-700",
  pending: "border-blue-300 bg-blue-100 text-blue-800",
  expired: "border-amber-300 bg-amber-100 text-amber-800",
  error: "border-rose-300 bg-rose-100 text-rose-800",
} as const;

export default function MarketplaceProdukPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { metrics: syncMetrics, loading: syncMetricsLoading } = useProductSyncStatus();
  const {
    connections,
    supported: marketplaceSupported,
    message: marketplaceConnectionMessage,
    loading: marketplaceConnectionsLoading,
    error: marketplaceConnectionsError,
    refresh: refreshMarketplaceConnections,
  } = useMarketplaceConnections();
  const [marketplaceTab, setMarketplaceTab] = useState<MarketplaceTab>("tiktok");
  const [products, setProducts] = useState<SpuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedProduct, setSelectedProduct] = useState<SpuRow | null>(null);
  const [connectedVariants, setConnectedVariants] = useState<Record<string, boolean>>({});
  const [busyChannel, setBusyChannel] = useState<MarketplaceChannel | null>(null);
  const [busyVariantKey, setBusyVariantKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<"all" | "review" | "unmapped">("all");
  const [reloadTick, setReloadTick] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [perPage, setPerPage] = useState(MARKETPLACE_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<"product_title" | "total_stock">("product_title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [connectMenuOpen, setConnectMenuOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    active: boolean;
    title: string;
    message: string;
    processed: number;
    total: number;
  }>({
    active: false,
    title: "",
    message: "",
    processed: 0,
    total: 0,
  });
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchData = async () => {
      setLoading(true);

      try {
        const response = await api.get(resolveProductsEndpoint(), {
          params: {
            per_page: MARKETPLACE_PAGE_SIZE,
            page: currentPage,
            search: debouncedSearch || undefined,
            brand: selectedBrand !== "all" ? selectedBrand : undefined,
            exclude_failed_sync: false,
          },
          signal: controller.signal,
        });
        const items = extractProducts(response.data).map(mapProductToSpuRow);
        const meta = extractPaginationMeta(response.data);
        if (!mounted) return;
        setError(null);
        setProducts(items);
        setCurrentPage(Math.max(1, meta.currentPage));
        setLastPage(Math.max(1, meta.lastPage));
        setPerPage(Math.max(1, meta.perPage));
        setTotalProducts(Math.max(0, meta.total));
      } catch (err) {
        if (!mounted) return;
        if (isAxiosError(err) && err.code === "ERR_CANCELED") return;
        setError(
          (isAxiosError(err) && typeof err.response?.data?.message === "string" && err.response.data.message) ||
            (err instanceof Error ? err.message : "Gagal memuat data marketplace produk.")
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [currentPage, debouncedSearch, selectedBrand, reloadTick]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedBrand]);

  useEffect(() => {
    const connectionStatus = searchParams.get("connection_status");
    const marketplace = searchParams.get("marketplace");
    const message = searchParams.get("message");

    if (!connectionStatus || !marketplace) {
      return;
    }

    if (connectionStatus === "connected") {
      setActionMessage(
        message ?? `${marketplace === "tiktok" ? "TikTok Shop" : "Shopee"} berhasil tersambung ke Entraverse.`
      );
      setActionError(null);
    } else {
      setActionError(
        message ?? `Koneksi ${marketplace === "tiktok" ? "TikTok Shop" : "Shopee"} gagal diselesaikan.`
      );
      setActionMessage(null);
    }
  }, [searchParams]);

  const refreshProducts = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  const focusTableSection = useCallback((nextFilter: "all" | "review" | "unmapped") => {
    setQuickFilter(nextFilter);

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById("marketplace-problem-list")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const totalVariants = useMemo(
    () => products.reduce((sum, item) => sum + item.variants.length, 0),
    [products]
  );
  const brandOptions = useMemo(() => {
    const values = Array.from(new Set(products.map((item) => item.brand).filter((value) => value && value !== "-")));
    return values.sort((a, b) => a.localeCompare(b));
  }, [products]);
  const visibleProducts = useMemo(() => {
    const next = [...products];
    next.sort((left, right) => {
      const modifier = sortDirection === "asc" ? 1 : -1;

      if (sortBy === "total_stock") {
        return (left.totalStock - right.totalStock) * modifier;
      }

      return left.name.localeCompare(right.name, "id") * modifier;
    });
    return next;
  }, [products, sortBy, sortDirection]);
  const outboundSyncLabel = syncMetrics.latestOutboundPush ? formatDateTimeID(syncMetrics.latestOutboundPush) : "Belum ada data";
  const activeConnection = connections[marketplaceTab];
  const selectedChannelLabel = marketplaceTab === "tiktok" ? "TikTok Shop" : "Shopee";
  const productNeedsReview = useCallback((product: SpuRow) => product.status === "FAILED" || Boolean(product.statusDetail), []);
  const productNeedsMapping = useCallback(
    (product: SpuRow, channel: MarketplaceChannel) =>
      product.variants.some((variant) =>
        channel === "tiktok" ? !variant.tiktokMapped || !variant.sellerSku : !variant.shopeeMapped || !variant.sellerSku
      ),
    []
  );
  const filteredProducts = useMemo(() => {
    if (quickFilter === "review") {
      return visibleProducts.filter(productNeedsReview);
    }

    if (quickFilter === "unmapped") {
      return visibleProducts.filter((product) => productNeedsMapping(product, marketplaceTab));
    }

    return visibleProducts;
  }, [marketplaceTab, productNeedsMapping, productNeedsReview, quickFilter, visibleProducts]);
  const reviewProductCount = useMemo(() => visibleProducts.filter(productNeedsReview).length, [productNeedsReview, visibleProducts]);
  const unmappedProductCount = useMemo(
    () => visibleProducts.filter((product) => productNeedsMapping(product, marketplaceTab)).length,
    [marketplaceTab, productNeedsMapping, visibleProducts]
  );
  const visibleStart = totalProducts > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const visibleEnd = filteredProducts.length > 0 ? Math.min(totalProducts, visibleStart + filteredProducts.length - 1) : 0;
  const activeConnectionStatusLabel = integrationStatusLabelMap[activeConnection.status];
  const activeConnectionStatusClass = integrationStatusClassMap[activeConnection.status];
  const activeSyncLabel = activeConnection.lastOutboundSyncAt
    ? formatDateTimeID(activeConnection.lastOutboundSyncAt)
    : "Belum ada data";
  const channelHealth = useMemo(() => {
    return (["tiktok", "shopee"] as MarketplaceChannel[]).reduce<Record<MarketplaceChannel, {
      needsReview: number;
      needsMapping: number;
      attentionCount: number;
      lastSyncState: "success" | "failed" | "idle";
    }>>(
      (accumulator, channel) => {
        const needsReview = visibleProducts.filter(productNeedsReview).length;
        const needsMapping = visibleProducts.filter((product) => productNeedsMapping(product, channel)).length;
        const connection = connections[channel];
        const lastSyncState = connection.lastError ? "failed" : connection.lastOutboundSyncAt ? "success" : "idle";

        accumulator[channel] = {
          needsReview,
          needsMapping,
          attentionCount: needsReview + needsMapping + (connection.lastError ? 1 : 0),
          lastSyncState,
        };

        return accumulator;
      },
      {
        tiktok: { needsReview: 0, needsMapping: 0, attentionCount: 0, lastSyncState: "idle" },
        shopee: { needsReview: 0, needsMapping: 0, attentionCount: 0, lastSyncState: "idle" },
      }
    );
  }, [connections, productNeedsMapping, productNeedsReview, visibleProducts]);

  useEffect(() => {
    if (!connectMenuOpen || typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.closest("[data-connect-dropdown]")) {
        return;
      }

      setConnectMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [connectMenuOpen]);

  useEffect(() => {
    setConnectMenuOpen(false);
    setSelectedProduct(null);
  }, [marketplaceTab]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const nextSelectedProduct = products.find((product) => product.id === selectedProduct.id) ?? null;
    setSelectedProduct(nextSelectedProduct);
  }, [products, selectedProduct]);

  useEffect(() => {
    if (!syncProgress.active || syncProgress.total === 0 || syncProgress.processed < syncProgress.total) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSyncProgress((current) => ({ ...current, active: false }));
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [syncProgress]);

  const buildConnectionKey = useCallback(
    (variantId: string) => `${marketplaceTab}:${variantId}`,
    [marketplaceTab]
  );
  const isVariantConnected = useCallback(
    (variant: VariantRow) => {
      const override = connectedVariants[buildConnectionKey(variant.id)];
      if (typeof override === "boolean") {
        return override;
      }

      if (marketplaceTab === "tiktok") {
        return variant.tiktokMapped;
      }

      return variant.shopeeMapped;
    },
    [buildConnectionKey, connectedVariants, marketplaceTab]
  );

  const handleAuthorizeMarketplace = useCallback(
    async (channel: MarketplaceChannel) => {
      setBusyChannel(channel);
      setActionError(null);
      setActionMessage(null);

      try {
        const result = await beginMarketplaceAuthorization(channel, pathname || "/admin/marketplace-produk");
        if (result.authorizationUrl && typeof window !== "undefined") {
          window.location.href = result.authorizationUrl;
          return;
        }

        setActionMessage(
          result.message ??
            `Permintaan otorisasi ${channel === "tiktok" ? "TikTok Shop" : "Shopee"} sudah dikirim ke backend.`
        );
        refreshMarketplaceConnections();
      } catch (error) {
        const message =
          (isAxiosError(error) &&
            typeof error.response?.data?.message === "string" &&
            error.response.data.message) ||
          (error instanceof Error ? error.message : "Gagal memulai koneksi marketplace.");
        setActionError(message);
      } finally {
        setBusyChannel(null);
      }
    },
    [pathname, refreshMarketplaceConnections]
  );

  const handleDisconnectMarketplace = useCallback(
    async (channel: MarketplaceChannel) => {
      setBusyChannel(channel);
      setActionError(null);
      setActionMessage(null);

      try {
        const message = await disconnectMarketplaceConnection(channel);
        setActionMessage(message ?? `Koneksi ${channel === "tiktok" ? "TikTok Shop" : "Shopee"} berhasil diputus.`);
        refreshMarketplaceConnections();
      } catch (error) {
        const message =
          (isAxiosError(error) &&
            typeof error.response?.data?.message === "string" &&
            error.response.data.message) ||
          (error instanceof Error ? error.message : "Gagal memutus koneksi marketplace.");
        setActionError(message);
      } finally {
        setBusyChannel(null);
      }
    },
    [refreshMarketplaceConnections]
  );

  const handleSyncMarketplace = useCallback(
    async (channel: MarketplaceChannel) => {
      setBusyChannel(channel);
      setActionError(null);
      setActionMessage(null);
      setSyncProgress({
        active: true,
        title: "Menyinkronkan produk...",
        message: `Memulai sinkronisasi ${channel === "tiktok" ? "TikTok Shop" : "Shopee"}`,
        processed: 0,
        total: 0,
      });

      try {
        const message = await requestMarketplaceSync(channel, "all");
        setActionMessage(message ?? `Sinkronisasi ${channel === "tiktok" ? "TikTok Shop" : "Shopee"} sudah dijalankan.`);
        refreshMarketplaceConnections();
        refreshProducts();
        setSyncProgress({
          active: true,
          title: "Sinkronisasi selesai",
          message: message ?? `Sinkronisasi ${channel === "tiktok" ? "TikTok Shop" : "Shopee"} selesai dijalankan.`,
          processed: 1,
          total: 1,
        });
      } catch (error) {
        const message =
          (isAxiosError(error) &&
            typeof error.response?.data?.message === "string" &&
            error.response.data.message) ||
          (error instanceof Error ? error.message : "Gagal menjalankan sinkronisasi marketplace.");
        setActionError(message);
        setSyncProgress({
          active: true,
          title: "Sinkronisasi gagal",
          message,
          processed: 0,
          total: 1,
        });
      } finally {
        setBusyChannel(null);
      }
    },
    [refreshMarketplaceConnections, refreshProducts]
  );

  const handleConnectVariant = useCallback(
    async (productId: string, variant: VariantRow) => {
      const connectionKey = buildConnectionKey(variant.id);
      setBusyVariantKey(connectionKey);
      setActionError(null);
      setActionMessage(null);

      try {
        const message = await connectMarketplaceVariant(marketplaceTab, {
          productId,
          variantId: variant.apiVariantId,
          sellerSku: variant.sellerSku || undefined,
        });
        setConnectedVariants((prev) => ({
          ...prev,
          [connectionKey]: true,
        }));
        setActionMessage(message ?? `Varian ${variant.name} berhasil dimapping ke ${selectedChannelLabel}.`);
        refreshMarketplaceConnections();
      } catch (error) {
        const message =
          (isAxiosError(error) &&
            typeof error.response?.data?.message === "string" &&
            error.response.data.message) ||
          (error instanceof Error ? error.message : "Gagal menghubungkan varian ke marketplace.");
        setActionError(message);
      } finally {
        setBusyVariantKey(null);
      }
    },
    [buildConnectionKey, marketplaceTab, refreshMarketplaceConnections, selectedChannelLabel]
  );

  const handleSort = useCallback((nextSortBy: "product_title" | "total_stock") => {
    setSortBy((currentSortBy) => {
      if (currentSortBy === nextSortBy) {
        setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return currentSortBy;
      }

      setSortDirection("asc");
      return nextSortBy;
    });
  }, []);

  const handleDisconnectVariant = useCallback(
    async (productId: string, variant: VariantRow) => {
      const connectionKey = buildConnectionKey(variant.id);
      setBusyVariantKey(connectionKey);
      setActionError(null);
      setActionMessage(null);

      try {
        const message = await disconnectMarketplaceVariant(marketplaceTab, {
          productId,
          variantId: variant.apiVariantId,
        });
        setConnectedVariants((prev) => ({
          ...prev,
          [connectionKey]: false,
        }));
        setActionMessage(message ?? `Mapping varian ${variant.name} di ${selectedChannelLabel} berhasil dilepas.`);
        refreshMarketplaceConnections();
      } catch (error) {
        const message =
          (isAxiosError(error) &&
            typeof error.response?.data?.message === "string" &&
            error.response.data.message) ||
          (error instanceof Error ? error.message : "Gagal melepas mapping varian dari marketplace.");
        setActionError(message);
      } finally {
        setBusyVariantKey(null);
      }
    },
    [buildConnectionKey, marketplaceTab, refreshMarketplaceConnections, selectedChannelLabel]
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section id="marketplace-problem-list" className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-slate-800">Marketplace Produk</h1>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["tiktok", "shopee"] as MarketplaceChannel[]).map((channel) => {
            const label = channel === "tiktok" ? "TikTok Shop" : "Shopee";
            const attentionCount = channelHealth[channel].attentionCount;

            return (
              <button
                key={channel}
                type="button"
                onClick={() => setMarketplaceTab(channel)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  marketplaceTab === channel
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Store className="h-4 w-4" />
                {label}
                {attentionCount > 0 ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {attentionCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3">
          {[marketplaceTab].map((channel) => {
            const connection = connections[channel];
            const isBusy = busyChannel === channel;
            const label = channel === "tiktok" ? "TikTok Shop" : "Shopee";
            const statusLabel = integrationStatusLabelMap[connection.status];
            const statusClass = integrationStatusClassMap[connection.status];
            const health = channelHealth[channel];
            const outboundLabel = connection.lastOutboundSyncAt
              ? formatDateTimeID(connection.lastOutboundSyncAt)
              : "Belum ada data";

            return (
              <article
                key={channel}
                className={`rounded-2xl border p-4 transition ${
                  marketplaceTab === channel ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600">
                        <Store className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-900">{label}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              health.lastSyncState === "success"
                                ? "bg-emerald-50 text-emerald-700"
                                : health.lastSyncState === "failed"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {health.lastSyncState === "success" ? "Sync Sukses" : health.lastSyncState === "failed" ? "Sync Gagal" : "Belum Ada Push"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Shop ID</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{connection.shopId ?? "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Seller ID</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{connection.sellerId ?? "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Last Push</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{outboundLabel}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Attention</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {health.needsMapping} mapping • {health.needsReview} review
                        </p>
                      </div>
                    </div>
                    {connection.lastError ? (
                      <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {connection.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAuthorizeMarketplace(channel)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {connection.connected ? "Re-Otorisasi" : "Hubungkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncMarketplace(channel)}
                      disabled={isBusy || !connection.connected}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                      Sync Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDisconnectMarketplace(channel)}
                      disabled={isBusy || !connection.connected}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                      Putuskan
                    </button>
                    {connection.authorizationUrl ? (
                      <a
                        href={connection.authorizationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Buka Otorisasi
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {marketplaceConnectionMessage ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {marketplaceConnectionMessage}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        {actionError || marketplaceConnectionsError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError ?? marketplaceConnectionsError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Last Outbound Push</p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {syncMetricsLoading ? "Memuat..." : outboundSyncLabel}
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Sync Activate</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {syncMetricsLoading ? "..." : syncMetrics.activeMarketplaceSyncCount}
            </p>
          </article>
          <button
            type="button"
            onClick={() => focusTableSection("review")}
            className={`rounded-2xl border p-4 text-left transition ${
              quickFilter === "review"
                ? "border-amber-300 bg-amber-100/80"
                : "border-amber-100 bg-amber-50/70 hover:border-amber-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Butuh Review</p>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {syncMetricsLoading ? "..." : syncMetrics.failedMarketplaceSyncCount}
            </p>
          </button>
          <button
            type="button"
            onClick={() => focusTableSection("unmapped")}
            className={`rounded-2xl border p-4 text-left transition ${
              quickFilter === "unmapped"
                ? "border-slate-300 bg-slate-100"
                : "border-slate-200 bg-slate-50/80 hover:border-slate-300"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">SKU Belum Termapping</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {syncMetricsLoading ? "..." : syncMetrics.unmappedSkuCount}
            </p>
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800">Daftar Produk {selectedChannelLabel}</h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {filteredProducts.length} produk ({totalVariants} varian termuat)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "all", label: "Semua", count: products.length },
                { key: "unmapped", label: "Belum Termapping", count: unmappedProductCount },
                { key: "review", label: "Butuh Review", count: reviewProductCount },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setQuickFilter(option.key as "all" | "review" | "unmapped")}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    quickFilter === option.key
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      quickFilter === option.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSort("product_title")}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  sortBy === "product_title"
                    ? "border-slate-300 bg-slate-100 text-slate-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Nama Produk
                {sortBy === "product_title" ? (sortDirection === "asc" ? "ASC" : "DESC") : null}
              </button>
              <button
                type="button"
                onClick={() => handleSort("total_stock")}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                  sortBy === "total_stock"
                    ? "border-slate-300 bg-slate-100 text-slate-700"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                Total Stok
                {sortBy === "total_stock" ? (sortDirection === "asc" ? "ASC" : "DESC") : null}
              </button>
            </div>
            <label className="flex min-w-[260px] items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4 text-blue-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama produk, SPU, SKU"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                aria-label="Cari marketplace produk"
              />
            </label>
            <select
              value={selectedBrand}
              onChange={(event) => setSelectedBrand(event.target.value)}
              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              aria-label="Filter brand"
            >
              <option value="all">Semua Brand</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            <div className="hidden">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${activeConnectionStatusClass}`}>
                  {activeConnectionStatusLabel}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {selectedChannelLabel}
                  {activeConnection.shopName ? ` · ${activeConnection.shopName}` : ""}
                </span>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                <p>Shop ID: <span className="font-medium text-slate-700">{activeConnection.shopId ?? "-"}</span></p>
                <p>Seller ID: <span className="font-medium text-slate-700">{activeConnection.sellerId ?? "-"}</span></p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDisconnectMarketplace(marketplaceTab)}
                  disabled={busyChannel === marketplaceTab || !activeConnection.connected}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyChannel === marketplaceTab ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                  Putuskan
                </button>
                {activeConnection.authorizationUrl ? (
                  <a
                    href={activeConnection.authorizationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Buka Otorisasi
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {!marketplaceSupported && !marketplaceConnectionsLoading ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Endpoint integrasi marketplace belum terdeteksi dari backend.
          </div>
        ) : null}

        {marketplaceConnectionMessage ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {marketplaceConnectionMessage}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {actionMessage}
          </div>
        ) : null}

        {actionError || marketplaceConnectionsError || error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError ?? marketplaceConnectionsError ?? error}
          </div>
        ) : null}

        {activeConnection.lastError ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {activeConnection.lastError}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th colSpan={4} className="border-b border-gray-100 px-3 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_140px_150px_150px] items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="text-left">Produk</span>
                    <span className="text-center">Total Stok</span>
                    <span className="text-center">Sync Status</span>
                    <span className="text-right">Aksi</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`marketplace-skeleton-${index}`}>
                    <td className="border-b border-gray-100 px-3 py-4">
                      <div className="h-12 w-64 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4">
                      <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 text-right">
                      <div className="ml-auto h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-slate-500">
                    Tidak ada produk marketplace yang cocok dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isExpanded = expanded[product.id] === true;
                  return (
                    <tr key={product.id}>
                      <td colSpan={4} className="border-b border-gray-100 px-0 py-0">
                        <div className="px-3 py-4">
                          <div className="grid grid-cols-[minmax(0,1fr)_140px_150px_150px] items-center gap-3">
                            <div className="flex items-start gap-3">
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={product.photo || "/product-placeholder.svg"}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    if (event.currentTarget.dataset.fallbackApplied === "1") return;
                                    event.currentTarget.dataset.fallbackApplied = "1";
                                    event.currentTarget.src = "/product-placeholder.svg";
                                  }}
                                />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                                <p className="text-xs text-slate-500">SPU: {product.spu}</p>
                                <p className="text-xs text-slate-500">
                                  Brand: {product.brand} | Kategori: {product.category}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Jumlah varian: {product.variants.length}</p>
                              </div>
                            </div>

                            <div className="text-center text-sm font-semibold text-slate-700">{product.totalStock}</div>

                            <div className="flex flex-col items-center">
                              <span
                                title={product.statusDetail ?? undefined}
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassMap[product.status]}`}
                              >
                                {product.status}
                              </span>
                              {product.status === "FAILED" && product.statusDetail ? (
                                <p className="mt-1 max-w-[220px] truncate text-center text-[11px] text-amber-700" title={product.statusDetail}>
                                  {product.statusDetail}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedProduct(product)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                              >
                                Detail
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded((prev) => ({
                                    ...prev,
                                    [product.id]: !prev[product.id],
                                  }))
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                {isExpanded ? "Tutup" : "Varian"}
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded ? (
                          <div className="border-t border-gray-100 bg-slate-50/70 px-3 py-3">
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="bg-slate-50">
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      SKU / Variant Name
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Seller SKU
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Harga (IDR)
                                    </th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Stok
                                    </th>
                                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {product.variants.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} className="px-3 py-3 text-xs text-slate-500">
                                        Belum ada varian untuk produk ini.
                                      </td>
                                    </tr>
                                  ) : (
                                    product.variants.map((variant) => (
                                      <tr key={variant.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2.5 text-xs text-slate-700">{variant.name}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-500">{variant.sellerSku}</td>
                                        <td className="px-3 py-2.5">
                                          <span className="inline-flex rounded-3xl border border-blue-100 bg-blue-50/50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                            {formatIdr(variant.price)}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">{variant.stock}</td>
                                        <td className="px-3 py-2.5 text-right">
                                          <div className="inline-flex items-center gap-1.5">
                                            <Link
                                              href={`/admin/master-produk/${product.id}/edit`}
                                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                              aria-label={`Edit produk ${product.name}`}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Link>
                                            <button
                                              type="button"
                                              onClick={() => handleConnectVariant(product.id, variant)}
                                              disabled={
                                                busyVariantKey === buildConnectionKey(variant.id) ||
                                                !activeConnection.connected ||
                                                !variant.sellerSku
                                              }
                                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:bg-slate-50 ${
                                                isVariantConnected(variant)
                                                  ? "border-blue-200 bg-blue-50 text-blue-600"
                                                  : "border-slate-200 text-slate-600"
                                              } disabled:cursor-not-allowed disabled:opacity-60`}
                                              aria-label={`Connect variant ${variant.name}`}
                                              title={
                                                !activeConnection.connected
                                                  ? `${selectedChannelLabel} belum tersambung`
                                                  : !variant.sellerSku
                                                    ? "Seller SKU wajib diisi sebelum mapping"
                                                    : `Hubungkan ke ${selectedChannelLabel}`
                                              }
                                            >
                                              {busyVariantKey === buildConnectionKey(variant.id) ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <Link2 className="h-3.5 w-3.5" />
                                              )}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDisconnectVariant(product.id, variant)}
                                              disabled={
                                                busyVariantKey === buildConnectionKey(variant.id) ||
                                                !activeConnection.connected ||
                                                !isVariantConnected(variant)
                                              }
                                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:bg-slate-50 ${
                                                isVariantConnected(variant)
                                                  ? "border-slate-200 text-slate-500"
                                                  : "border-rose-200 bg-rose-50 text-rose-600"
                                              } disabled:cursor-not-allowed disabled:opacity-60`}
                                              aria-label={`Disconnect variant ${variant.name}`}
                                              title={`Lepas mapping dari ${selectedChannelLabel}`}
                                            >
                                              {busyVariantKey === buildConnectionKey(variant.id) ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <Link2Off className="h-3.5 w-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <p>
              {quickFilter === "all"
                ? `Menampilkan ${visibleStart}-${visibleEnd} dari ${totalProducts} produk. ${perPage} produk per halaman.`
                : `Menampilkan ${filteredProducts.length} produk pada halaman ${currentPage} dari filter aktif.`}
            </p>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={loading || currentPage <= 1}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Sebelumnya
              </button>
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                Halaman {currentPage} / {lastPage}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
                disabled={loading || currentPage >= lastPage}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Selanjutnya
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </section>

      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
          <button
            type="button"
            aria-label="Tutup detail produk"
            className="flex-1 cursor-default"
            onClick={() => setSelectedProduct(null)}
          />
          <aside className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    {selectedChannelLabel}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassMap[selectedProduct.status]}`}>
                    {selectedProduct.status}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${activeConnectionStatusClass}`}>
                    {activeConnectionStatusLabel}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{selectedProduct.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  SPU {selectedProduct.spu} • {selectedProduct.brand} • {selectedProduct.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                <div className="h-[120px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProduct.photo || "/product-placeholder.svg"}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      if (event.currentTarget.dataset.fallbackApplied === "1") return;
                      event.currentTarget.dataset.fallbackApplied = "1";
                      event.currentTarget.src = "/product-placeholder.svg";
                    }}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total Stok</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedProduct.totalStock}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Jumlah Varian</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{selectedProduct.variants.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Shop ID</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{activeConnection.shopId ?? "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Last Push</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{activeSyncLabel}</p>
                  </div>
                </div>
              </div>

              {selectedProduct.statusDetail ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {selectedProduct.statusDetail}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h4 className="text-sm font-semibold text-slate-800">Daftar Varian</h4>
                </div>
                <div className="divide-y divide-slate-200">
                  {selectedProduct.variants.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500">Belum ada varian untuk produk ini.</div>
                  ) : (
                    selectedProduct.variants.map((variant) => {
                      const variantConnected = isVariantConnected(variant);
                      const variantPrice = getMarketplaceVariantPrice(variant, marketplaceTab);

                      return (
                        <div key={variant.id} className="space-y-3 px-4 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{variant.name}</p>
                              <p className="mt-1 text-xs text-slate-500">Seller SKU: {variant.sellerSku || "-"}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                variantConnected
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-500"
                              }`}>
                                {variantConnected ? "Mapped" : "Belum Mapped"}
                              </span>
                              <Link
                                href={`/admin/master-produk/${selectedProduct.id}/edit`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                                aria-label={`Edit produk ${selectedProduct.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Harga Master</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{formatIdr(variant.price)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Harga {selectedChannelLabel}</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{variantPrice > 0 ? formatIdr(variantPrice) : "-"}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Stok</p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">{variant.stock}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConnectVariant(selectedProduct.id, variant)}
                              disabled={
                                busyVariantKey === buildConnectionKey(variant.id) ||
                                !activeConnection.connected ||
                                !variant.sellerSku
                              }
                              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                variantConnected
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {busyVariantKey === buildConnectionKey(variant.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Link2 className="h-3.5 w-3.5" />
                              )}
                              Hubungkan
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDisconnectVariant(selectedProduct.id, variant)}
                              disabled={
                                busyVariantKey === buildConnectionKey(variant.id) ||
                                !activeConnection.connected ||
                                !variantConnected
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyVariantKey === buildConnectionKey(variant.id) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Link2Off className="h-3.5 w-3.5" />
                              )}
                              Lepas
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
