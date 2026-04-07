"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, RefreshCcw, Search, TriangleAlert } from "lucide-react";
import api, { isAxiosError } from "@/lib/axios";
import { resolveApiOriginUrl } from "@/lib/api-config";
import StockAdjustmentModal, {
  type StockAdjustmentPayload,
  type StockAdjustmentTarget,
} from "@/components/features/inventory/StockAdjustmentModal";

type InventoryStatus = "safe" | "low" | "empty";

type InventoryRow = {
  id: string;
  product_id: string;
  product_name: string;
  product_spu: string;
  product_image: string | null;
  sku: string;
  variant_name: string;
  warehouse: string;
  current_stock: number;
  status: InventoryStatus;
  last_update: string | null;
};

type MutationLog = {
  id: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reference?: string | null;
  note?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string | null;
};

type InventoryQueryData = {
  rows: InventoryRow[];
  stats: {
    total_sku: number;
    low_stock_alert: number;
    out_of_stock: number;
  };
  warehouses: string[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

type InventoryFilters = {
  search: string;
  warehouse: string;
  status: "all" | InventoryStatus;
  page: number;
};

const statusLabelMap: Record<InventoryStatus, string> = {
  safe: "Safe",
  low: "Low",
  empty: "Empty",
};

const statusClassMap: Record<InventoryStatus, string> = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-700",
  low: "border-amber-200 bg-amber-50 text-amber-700",
  empty: "border-rose-200 bg-rose-50 text-rose-700",
};

const mutationTypeLabelMap: Record<MutationLog["type"], string> = {
  in: "Stock In",
  out: "Stock Out",
  adjustment: "Adjustment",
};

const DEFAULT_INVENTORY_DATA: InventoryQueryData = {
  rows: [],
  stats: {
    total_sku: 0,
    low_stock_alert: 0,
    out_of_stock: 0,
  },
  warehouses: [],
  pagination: {
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
  },
};

const resolveStocksBaseEndpoint = (): string => {
  const base = String(api.defaults.baseURL ?? "").toLowerCase();
  return base.endsWith("/v1") || base.includes("/api/v1") ? "/admin/stocks" : "/v1/admin/stocks";
};

const normalizeImageUrl = (value: unknown): string => {
  if (typeof value !== "string") return "/product-placeholder.svg";
  const trimmed = value.trim();
  if (!trimmed) return "/product-placeholder.svg";
  if (/^(blob:|data:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return resolveApiOriginUrl(trimmed);
  return resolveApiOriginUrl(`/storage/products/${trimmed}`);
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const buildErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    if (typeof error.response?.data?.message === "string" && error.response.data.message.trim() !== "") {
      return error.response.data.message;
    }

    const firstValidationError = error.response?.data?.errors
      ? Object.values(error.response.data.errors)[0]
      : null;

    if (Array.isArray(firstValidationError) && typeof firstValidationError[0] === "string") {
      return firstValidationError[0];
    }

    if (typeof error.message === "string" && error.message.trim() !== "") {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallback;
};

const resolveStatusFromStock = (stock: number): InventoryStatus => {
  if (stock <= 0) return "empty";
  if (stock < 10) return "low";
  return "safe";
};

const resolveDelta = (payload: StockAdjustmentPayload): number => {
  if (payload.type === "in") return payload.quantity;
  if (payload.type === "out") return payload.quantity * -1;
  return payload.direction === "increment" ? payload.quantity : payload.quantity * -1;
};

const fetchInventory = async (filters: InventoryFilters): Promise<InventoryQueryData> => {
  const endpoint = resolveStocksBaseEndpoint();
  const response = await api.get(endpoint, {
    params: {
      search: filters.search || undefined,
      warehouse: filters.warehouse || undefined,
      status: filters.status === "all" ? undefined : filters.status,
      page: filters.page,
      per_page: 20,
    },
  });

  const payload = response.data as {
    data?: InventoryRow[];
    stats?: InventoryQueryData["stats"];
    filters?: { warehouses?: string[] };
    pagination?: InventoryQueryData["pagination"];
  };

  return {
    rows: Array.isArray(payload.data) ? payload.data : [],
    stats: payload.stats ?? DEFAULT_INVENTORY_DATA.stats,
    warehouses: Array.isArray(payload.filters?.warehouses) ? payload.filters.warehouses : [],
    pagination: payload.pagination ?? DEFAULT_INVENTORY_DATA.pagination,
  };
};

const fetchMutations = async (productId: string, variantSku: string): Promise<MutationLog[]> => {
  const endpoint = `${resolveStocksBaseEndpoint()}/mutations`;
  const response = await api.get(endpoint, {
    params: {
      product_id: productId,
      variant_sku: variantSku,
      limit: 5,
    },
  });

  const payload = response.data as { data?: MutationLog[] };
  return Array.isArray(payload.data) ? payload.data : [];
};

const adjustStock = async (payload: StockAdjustmentPayload): Promise<{ row: InventoryRow }> => {
  const endpoint = `${resolveStocksBaseEndpoint()}/adjust`;
  const response = await api.post(endpoint, payload);
  const data = response.data?.data as { row?: InventoryRow } | undefined;

  if (!data?.row) {
    throw new Error("Respons API penyesuaian stok tidak valid.");
  }

  return { row: data.row };
};

type InventoryTableRowProps = {
  row: InventoryRow;
  expanded: boolean;
  onToggle: () => void;
  onAdjust: (row: InventoryRow) => void;
};

function InventoryTableRow({ row, expanded, onToggle, onAdjust }: InventoryTableRowProps) {
  const {
    data: mutations = [],
    isFetching: mutationLoading,
    isError: mutationError,
    refetch,
  } = useQuery({
    queryKey: ["inventory-mutations", row.product_id, row.sku],
    queryFn: () => fetchMutations(row.product_id, row.sku),
    enabled: expanded,
    staleTime: 20_000,
  });

  return (
    <>
      <tr className="transition hover:bg-slate-50/80">
        <td className="border-b border-slate-100 px-3 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label={expanded ? "Tutup detail mutasi" : "Buka detail mutasi"}
          >
            <motion.span
              initial={false}
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="inline-flex"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
        </td>
        <td className="border-b border-slate-100 px-3 py-3 align-top">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-100 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={normalizeImageUrl(row.product_image)}
                alt={row.product_name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  if (event.currentTarget.dataset.fallbackApplied === "1") return;
                  event.currentTarget.dataset.fallbackApplied = "1";
                  event.currentTarget.src = "/product-placeholder.svg";
                }}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{row.product_name}</p>
              <p className="text-xs text-slate-500">SPU: {row.product_spu || "-"}</p>
              <p className="mt-1 text-xs text-slate-500">{row.variant_name}</p>
            </div>
          </div>
        </td>
        <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">{row.sku}</td>
        <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-700">{row.warehouse}</td>
        <td className="border-b border-slate-100 px-3 py-3">
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {row.current_stock}
          </span>
        </td>
        <td className="border-b border-slate-100 px-3 py-3 text-sm text-slate-600">{formatDateTime(row.last_update)}</td>
        <td className="border-b border-slate-100 px-3 py-3">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassMap[row.status]}`}
          >
            {statusLabelMap[row.status]}
          </span>
        </td>
        <td className="border-b border-slate-100 px-3 py-3 text-right">
          <button
            type="button"
            onClick={() => onAdjust(row)}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Adjust
          </button>
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {expanded ? (
          <tr className="bg-slate-50/70">
            <td colSpan={8} className="border-b border-slate-100 px-4 pb-4">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">5 Mutasi Terakhir</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>

                  {mutationLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat riwayat mutasi...
                    </div>
                  ) : mutationError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      Gagal memuat riwayat mutasi.
                    </div>
                  ) : mutations.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada mutasi untuk SKU ini.</p>
                  ) : (
                    <div className="relative pl-6">
                      <span className="absolute left-2 top-1 bottom-1 w-px bg-slate-200" />
                      <ul className="space-y-4">
                        {mutations.map((item) => (
                          <li key={item.id} className="relative">
                            <span
                              className={`absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full ${
                                item.type === "in"
                                  ? "bg-emerald-500"
                                  : item.type === "out"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                              }`}
                            />
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-sm font-semibold text-slate-700">
                                {mutationTypeLabelMap[item.type]}{" "}
                                <span className="text-blue-700">
                                  ({item.quantity > 0 ? "+" : ""}
                                  {item.quantity})
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatDateTime(item.created_at)} | {item.user?.name ?? "System"} | {item.reference ?? "manual"}
                              </p>
                              {item.note ? <p className="mt-1 text-xs text-slate-600">{item.note}</p> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default function InventoryManagement() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<InventoryFilters>({
    search: "",
    warehouse: "",
    status: "all",
    page: 1,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modalTarget, setModalTarget] = useState<StockAdjustmentTarget | null>(null);

  const inventoryQueryKey = useMemo(
    () => ["inventory-list", filters] as const,
    [filters]
  );

  const {
    data = DEFAULT_INVENTORY_DATA,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: () => fetchInventory(filters),
    placeholderData: (previous) => previous,
  });

  const adjustmentMutation = useMutation({
    mutationFn: adjustStock,
    onMutate: async (payload) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: ["inventory-list"] });

      const previous = queryClient.getQueryData<InventoryQueryData>(inventoryQueryKey);
      const delta = resolveDelta(payload);

      queryClient.setQueryData<InventoryQueryData>(inventoryQueryKey, (current) => {
        if (!current) return current;

        const rows = current.rows.map((row) => {
          if (
            row.product_id !== payload.product_id ||
            row.sku !== payload.variant_sku ||
            row.warehouse !== payload.warehouse
          ) {
            return row;
          }
          const nextStock = row.current_stock + delta;
          return {
            ...row,
            current_stock: nextStock,
            status: resolveStatusFromStock(nextStock),
            last_update: new Date().toISOString(),
          };
        });

        return { ...current, rows };
      });

      return { previous };
    },
    onError: (adjustError, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(inventoryQueryKey, context.previous);
      }
      setFeedback({
        type: "error",
        message: buildErrorMessage(adjustError, "Gagal menyesuaikan stok."),
      });
    },
    onSuccess: (result, payload) => {
      queryClient.setQueryData<InventoryQueryData>(inventoryQueryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          rows: current.rows.map((row) =>
            row.product_id === payload.product_id &&
            row.sku === payload.variant_sku &&
            row.warehouse === payload.warehouse
              ? result.row
              : row
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["inventory-list"] });
      queryClient.invalidateQueries({
        queryKey: ["inventory-mutations", payload.product_id, payload.variant_sku],
      });

      setFeedback({
        type: "success",
        message: "Stok berhasil diperbarui dan audit trail tercatat.",
      });
      setModalTarget(null);
    },
  });

  const openAdjustmentModal = (row: InventoryRow) => {
    setModalTarget({
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      warehouse: row.warehouse,
      currentStock: row.current_stock,
    });
  };

  const totalStart = (data.pagination.current_page - 1) * data.pagination.per_page + 1;
  const totalEnd = Math.min(data.pagination.current_page * data.pagination.per_page, data.pagination.total);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Manajemen Stok</h1>
            <p className="mt-1 text-sm text-slate-500">
              Inventory 2.0 untuk kontrol stok SKU lintas gudang dengan audit trail real-time.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total SKU</p>
          <p className="mt-2 text-2xl font-semibold text-slate-800">{data.stats.total_sku}</p>
        </article>
        <article className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-700">Low Stock Alert</p>
          <p className="mt-2 text-2xl font-semibold text-amber-800">{data.stats.low_stock_alert}</p>
        </article>
        <article className="rounded-xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm text-rose-700">Out of Stock</p>
          <p className="mt-2 text-2xl font-semibold text-rose-800">{data.stats.out_of_stock}</p>
        </article>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-3xl">
            <label className="flex w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-slate-500">
              <Search className="h-4 w-4 text-blue-500" />
              <input
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                    page: 1,
                  }))
                }
                placeholder="Cari SKU atau nama produk"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                aria-label="Cari SKU atau produk"
              />
            </label>

            <select
              value={filters.warehouse}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  warehouse: event.target.value,
                  page: 1,
                }))
              }
              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              aria-label="Filter warehouse"
            >
              <option value="">Semua Warehouse</option>
              {data.warehouses.map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  status: event.target.value as InventoryFilters["status"],
                  page: 1,
                }))
              }
              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
              aria-label="Filter status stok"
            >
              <option value="all">Semua Status</option>
              <option value="safe">Safe</option>
              <option value="low">Low</option>
              <option value="empty">Empty</option>
            </select>
          </div>
        </div>

        {feedback ? (
          <div
            className={`mt-4 rounded-xl border px-3 py-2 text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {isError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {buildErrorMessage(error, "Gagal memuat data inventory.")}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1100px] w-full border-separate border-spacing-0">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Detail
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Produk
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  SKU
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Warehouse
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Current Stock
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Last Update
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="border-b border-slate-100 px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`inventory-loading-${index}`}>
                    <td colSpan={8} className="border-b border-slate-100 px-3 py-4">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : data.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500">
                    Data inventory tidak ditemukan untuk filter saat ini.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <Fragment key={row.id}>
                    <InventoryTableRow
                      row={row}
                      expanded={expandedId === row.id}
                      onToggle={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
                      onAdjust={openAdjustmentModal}
                    />
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Menampilkan {data.pagination.total === 0 ? 0 : totalStart} - {data.pagination.total === 0 ? 0 : totalEnd} dari{" "}
            {data.pagination.total} SKU
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={filters.page <= 1 || isFetching}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {data.pagination.current_page} / {data.pagination.last_page}
            </span>
            <button
              type="button"
              disabled={filters.page >= data.pagination.last_page || isFetching}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.min(data.pagination.last_page, prev.page + 1),
                }))
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <StockAdjustmentModal
        key={modalTarget ? `${modalTarget.productId}:${modalTarget.sku}:open` : "inventory-adjustment:closed"}
        open={modalTarget !== null}
        target={modalTarget}
        loading={adjustmentMutation.isPending}
        onClose={() => setModalTarget(null)}
        onSubmit={async (payload) => {
          await adjustmentMutation.mutateAsync(payload);
        }}
      />

      <div className="fixed bottom-4 right-4 text-amber-600" aria-live="polite">
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing...
          </span>
        ) : null}
      </div>

      {adjustmentMutation.isError && !feedback ? (
        <div className="fixed bottom-4 left-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span className="inline-flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" />
            Penyesuaian stok gagal.
          </span>
        </div>
      ) : null}
    </div>
  );
}
