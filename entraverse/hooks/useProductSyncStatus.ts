"use client";

import { useCallback, useEffect, useState } from "react";
import api, { isAxiosError } from "@/lib/axios";

type JsonRecord = Record<string, unknown>;

type ProductSyncStatusMetrics = {
  latestInboundSync: string | null;
  latestOutboundPush: string | null;
  unmappedSkuCount: number;
  totalSkuCount: number;
  masterProductCount: number;
  marketplaceProductCount: number;
  activeMarketplaceSyncCount: number;
  failedMarketplaceSyncCount: number;
  pendingMarketplaceSyncCount: number;
  truncated: boolean;
};

type ProductSyncStatusState = {
  metrics: ProductSyncStatusMetrics;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const PER_PAGE = 100;
const MAX_PAGES = 6;
const SUCCESS_SYNC_STATES = new Set([
  "activate",
  "active",
  "created",
  "imported_from_jurnal",
  "success",
  "synced",
  "updated",
]);
const FAILED_SYNC_STATES = new Set(["failed", "error"]);

const INITIAL_METRICS: ProductSyncStatusMetrics = {
  latestInboundSync: null,
  latestOutboundPush: null,
  unmappedSkuCount: 0,
  totalSkuCount: 0,
  masterProductCount: 0,
  marketplaceProductCount: 0,
  activeMarketplaceSyncCount: 0,
  failedMarketplaceSyncCount: 0,
  pendingMarketplaceSyncCount: 0,
  truncated: false,
};

const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object") return {};
  return value as JsonRecord;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const extractRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const source = toObject(payload);
  if (Array.isArray(source.data)) return source.data as unknown[];

  const nested = toObject(source.data);
  if (Array.isArray(nested.data)) return nested.data as unknown[];

  return [];
};

const extractLastPage = (payload: unknown): number => {
  const source = toObject(payload);
  const meta = toObject(source.meta);
  const pagination = toObject(source.pagination);

  return (
    Math.max(
      1,
      Math.round(
        toNumberValue(meta.last_page) ??
          toNumberValue(pagination.last_page) ??
          toNumberValue(pagination.total_pages) ??
          1
      )
    )
  );
};

const normalizeSyncStatus = (row: JsonRecord): string => {
  const mekariStatus = toObject(row.mekari_status);
  return (toStringValue(mekariStatus.sync_status) ?? "").toLowerCase();
};

const resolveLastSync = (row: JsonRecord): string | null => {
  const mekariStatus = toObject(row.mekari_status);
  return toStringValue(mekariStatus.last_sync);
};

const resolveLatestIso = (timestamps: Array<string | null>): string | null => {
  let latest: string | null = null;
  let latestTime = 0;

  timestamps.forEach((value) => {
    if (!value) return;
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return;
    if (!latest || time > latestTime) {
      latest = value;
      latestTime = time;
    }
  });

  return latest;
};

const hasMarketplacePrice = (row: JsonRecord): boolean => {
  const fields = [row.tiktok_price, row.tokopedia_price, row.shopee_price];
  return fields.some((value) => {
    const numeric = toNumberValue(value);
    return typeof numeric === "number" && numeric > 0;
  });
};

const hasMarketplaceMapping = (row: JsonRecord): boolean =>
  Boolean(toStringValue(row.sku_seller)) || hasMarketplacePrice(row);

const summarizeUnmappedSkus = (rows: unknown[]): { unmapped: number; total: number } => {
  let unmapped = 0;
  let total = 0;

  rows.forEach((raw) => {
    const row = toObject(raw);
    const variants = Array.isArray(row.variant_pricing) ? row.variant_pricing : [];
    if (variants.length === 0) return;

    variants.forEach((variantRaw) => {
      const variant = toObject(variantRaw);
      total += 1;
      if (!hasMarketplaceMapping(variant)) {
        unmapped += 1;
      }
    });
  });

  return { unmapped, total };
};

const fetchPaginatedRows = async (
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<{ rows: unknown[]; truncated: boolean }> => {
  const rows: unknown[] = [];
  let truncated = false;

  const firstResponse = await api.get(endpoint, {
    params: {
      ...params,
      page: 1,
      per_page: PER_PAGE,
    },
  });

  rows.push(...extractRows(firstResponse.data));
  const lastPage = extractLastPage(firstResponse.data);

  if (lastPage > MAX_PAGES) {
    truncated = true;
  }

  const finalPage = Math.min(lastPage, MAX_PAGES);

  for (let page = 2; page <= finalPage; page += 1) {
    const response = await api.get(endpoint, {
      params: {
        ...params,
        page,
        per_page: PER_PAGE,
      },
    });
    rows.push(...extractRows(response.data));
  }

  return { rows, truncated };
};

export function useProductSyncStatus(): ProductSyncStatusState {
  const [metrics, setMetrics] = useState<ProductSyncStatusMetrics>(INITIAL_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [masterResult, marketplaceResult] = await Promise.all([
          fetchPaginatedRows("/v1/admin/products"),
          fetchPaginatedRows("/v1/products", { exclude_failed_sync: false }),
        ]);

        if (!active) return;

        const masterRows = masterResult.rows.map(toObject);
        const marketplaceRows = marketplaceResult.rows.map(toObject);

        const inboundTimestamps = masterRows.map(resolveLastSync);
        const successfulMarketplaceRows = marketplaceRows.filter((row) =>
          SUCCESS_SYNC_STATES.has(normalizeSyncStatus(row))
        );
        const outboundTimestamps = successfulMarketplaceRows.map(resolveLastSync);
        const failedMarketplaceSyncCount = marketplaceRows.filter((row) =>
          FAILED_SYNC_STATES.has(normalizeSyncStatus(row))
        ).length;
        const activeMarketplaceSyncCount = successfulMarketplaceRows.length;
        const pendingMarketplaceSyncCount =
          Math.max(0, marketplaceRows.length - failedMarketplaceSyncCount - activeMarketplaceSyncCount);
        const skuSummary = summarizeUnmappedSkus(masterRows);

        setMetrics({
          latestInboundSync: resolveLatestIso(inboundTimestamps),
          latestOutboundPush: resolveLatestIso(outboundTimestamps) ?? resolveLatestIso(marketplaceRows.map(resolveLastSync)),
          unmappedSkuCount: skuSummary.unmapped,
          totalSkuCount: skuSummary.total,
          masterProductCount: masterRows.length,
          marketplaceProductCount: marketplaceRows.length,
          activeMarketplaceSyncCount,
          failedMarketplaceSyncCount,
          pendingMarketplaceSyncCount,
          truncated: masterResult.truncated || marketplaceResult.truncated,
        });
      } catch (loadError) {
        if (!active) return;

        const message =
          (isAxiosError(loadError) &&
            typeof loadError.response?.data?.message === "string" &&
            loadError.response.data.message) ||
          (loadError instanceof Error ? loadError.message : "Gagal memuat status sinkronisasi.");

        setError(message);
        setMetrics(INITIAL_METRICS);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadTick]);

  const refresh = useCallback(() => {
    setReloadTick((previous) => previous + 1);
  }, []);

  return { metrics, loading, error, refresh };
}
