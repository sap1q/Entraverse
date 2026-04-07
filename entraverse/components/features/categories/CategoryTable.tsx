"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import type { FeeChannel, FeeComponent } from "@/types/category.types";
import { parseWarrantyProgram } from "@/lib/warrantyProgram";
import type {
  Category,
  CategoryListParams,
  CategorySortBy,
  PaginationMeta,
} from "@/types/category.types";

type CategoryTableProps = {
  categories: Category[];
  isLoading: boolean;
  isMutating?: boolean;
  error?: string | null;
  pagination: PaginationMeta;
  params: CategoryListParams;
  selectedIds: string[];
  allSelectedOnPage: boolean;
  onParamChange: (patch: Partial<CategoryListParams>) => void;
  onToggleSort: (field: CategorySortBy) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onDelete: (id: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  onDuplicate: (category: Category) => Promise<boolean>;
  onBulkDelete: () => Promise<boolean>;
  onExportCsv: () => void;
  onExportExcel: () => void;
};

type ConfirmState = {
  type: "delete" | "bulk";
  id?: string;
  title: string;
  description: string;
};

const sortIcon = (active: boolean, order: "asc" | "desc" | undefined) => {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
  return order === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-blue-600" /> : <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
};

const toDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatNumber = (value: number): string =>
  value.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const formatCurrency = (value: number): string => `Rp ${formatNumber(Math.max(0, value))}`;

const parseComponentNumber = (value: number | string | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatFeeComponent = (component: FeeComponent): string => {
  const label = component.label?.trim() || "Komponen";
  const numericValue = parseComponentNumber(component.value);
  const value =
    component.valueType === "amount"
      ? formatCurrency(numericValue)
      : `${formatNumber(numericValue)}%`;

  const max = Math.max(0, Number(component.max) || 0);
  const min = Math.max(0, Number(component.min) || 0);
  const limits = [
    min > 0 ? `min ${formatCurrency(min)}` : null,
    max > 0 ? `max ${formatCurrency(max)}` : null,
  ].filter(Boolean);

  return limits.length > 0 ? `${label}: ${value} | ${limits.join(" | ")}` : `${label}: ${value}`;
};

const formatFeeChannelSummary = (channel?: FeeChannel): string => {
  const components = channel?.components ?? [];
  if (components.length === 0) return "-";
  return components.map(formatFeeComponent).join(", ");
};

const formatWarrantySummary = (category: Category): string => {
  const warranty = parseWarrantyProgram(category.program_garansi);
  const summaryParts = warranty.components.map((component) =>
    `${component.label}: ${
      component.valueType === "amount"
        ? formatCurrency(component.value)
        : `${formatNumber(component.value)}%`
    }`
  );

  if (warranty.pricing.cost.value > 0) {
    summaryParts.unshift(
      `Biaya Program Garansi: ${
        warranty.pricing.cost.valueType === "amount"
          ? formatCurrency(warranty.pricing.cost.value)
          : `${formatNumber(warranty.pricing.cost.value)}%`
      }`
    );
  }

  if (warranty.pricing.profit.value > 0) {
    summaryParts.push(
      `Keuntungan Program Garansi: ${
        warranty.pricing.profit.valueType === "amount"
          ? formatCurrency(warranty.pricing.profit.value)
          : `${formatNumber(warranty.pricing.profit.value)}%`
      }`
    );
  }

  return summaryParts.length > 0 ? summaryParts.join(", ") : "-";
};

const buildMarketplaceSummaries = (category: Category) => [
  {
    label: "Tokopedia",
    className: "text-emerald-700",
    value: formatFeeChannelSummary(category.fees.marketplace),
  },
  {
    label: "Shopee",
    className: "text-orange-700",
    value: formatFeeChannelSummary(category.fees.shopee),
  },
  {
    label: "Entraverse",
    className: "text-slate-900",
    value: formatFeeChannelSummary(category.fees.entraverse),
  },
  {
    label: "Garansi",
    className: "text-violet-700",
    value: formatWarrantySummary(category),
  },
];

export default function CategoryTable({
  categories,
  isLoading,
  isMutating = false,
  error,
  pagination,
  params,
  selectedIds,
  allSelectedOnPage,
  onParamChange,
  onToggleSort,
  onToggleSelect,
  onToggleSelectAll,
  onDelete,
  onRestore,
  onDuplicate,
  onBulkDelete,
  onExportCsv,
  onExportExcel,
}: CategoryTableProps) {
  const pathname = usePathname();
  const editBasePath = pathname.startsWith("/admin") ? "/admin/categories" : "/categories";
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);

    if (confirm.type === "bulk") {
      await onBulkDelete();
    } else if (confirm.id) {
      await onDelete(confirm.id);
    }

    setActionLoading(false);
    setConfirm(null);
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-800">Daftar Kategori</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          <label className="md:col-span-2 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={params.search ?? ""}
              onChange={(event) => onParamChange({ search: event.target.value, page: 1 })}
              placeholder="Cari kategori..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <input
            type="number"
            min={0}
            value={params.minMargin ?? ""}
            onChange={(event) =>
              onParamChange({ minMargin: event.target.value ? Number(event.target.value) : undefined, page: 1 })
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Margin min"
          />
          <input
            type="number"
            min={0}
            value={params.maxMargin ?? ""}
            onChange={(event) =>
              onParamChange({ maxMargin: event.target.value ? Number(event.target.value) : undefined, page: 1 })
            }
            className="h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Margin max"
          />
          <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(params.withTrashed)}
              onChange={(event) => onParamChange({ withTrashed: event.target.checked, page: 1 })}
            />
            Tampilkan deleted
          </label>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-xs font-semibold text-blue-700">{selectedIds.length} item dipilih</p>
          <button
            type="button"
            onClick={() =>
              setConfirm({
                type: "bulk",
                title: "Hapus kategori terpilih?",
                description: "Aksi ini akan melakukan soft delete pada kategori terpilih.",
              })
            }
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            <Trash2 className="h-3.5 w-3.5" /> Bulk Delete
          </button>
        </div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1150px] w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 text-left">
                <input type="checkbox" checked={allSelectedOnPage} onChange={onToggleSelectAll} />
              </th>
              <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">Icon</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">
                <button type="button" onClick={() => onToggleSort("name")} className="inline-flex items-center gap-1">
                  Nama {sortIcon(params.sortBy === "name", params.sortOrder)}
                </button>
              </th>
              <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">Fee</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">
                <button type="button" onClick={() => onToggleSort("min_margin")} className="inline-flex items-center gap-1">
                  Margin {sortIcon(params.sortBy === "min_margin", params.sortOrder)}
                </button>
              </th>
              <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">Activity Log</th>
              <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold uppercase text-slate-500">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-4 w-4 animate-pulse rounded bg-slate-200" /></td>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" /></td>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-4 w-40 animate-pulse rounded bg-slate-200" /></td>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-12 w-full animate-pulse rounded-xl bg-slate-200" /></td>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-7 w-20 animate-pulse rounded-full bg-slate-200" /></td>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-4 w-44 animate-pulse rounded bg-slate-200" /></td>
                    <td className="border-b border-gray-100 px-3 py-4"><div className="h-8 w-20 animate-pulse rounded bg-slate-200" /></td>
                  </tr>
                ))
              : categories.map((category) => (
                  <tr key={category.id} className="transition hover:bg-slate-50">
                    <td className="border-b border-gray-100 px-3 py-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(category.id)}
                        onChange={() => onToggleSelect(category.id)}
                      />
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 align-top">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">
                        {(category.name.slice(0, 2) || "CT").toUpperCase()}
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 align-top text-sm font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {category.name}
                        {category.deleted_at ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                            Deleted
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 align-top text-xs text-slate-600">
                      <div className="max-w-[540px] space-y-1">
                        {buildMarketplaceSummaries(category).map((item) => (
                          <div
                            key={`${category.id}-${item.label}`}
                            className="grid grid-cols-[84px_12px_minmax(0,1fr)] items-start gap-x-1 leading-6"
                          >
                            <span className={`text-left text-[11px] font-bold ${item.className}`}>
                              {item.label}
                            </span>
                            <span className={`text-center text-[11px] font-bold ${item.className}`}>:</span>
                            <p className="min-w-0 text-justify text-slate-700 [text-align-last:left]" title={item.value}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 align-top">
                      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {formatNumber(category.min_margin)}%
                      </span>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 align-top text-xs text-slate-600">
                      <p>By: {category.activity?.updatedBy ?? category.activity?.createdBy ?? "-"}</p>
                      <p>{toDate(category.updated_at ?? category.created_at)}</p>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 align-top">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Link
                          href={`${editBasePath}/${category.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          title="Edit kategori"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDuplicate(category)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          title="Duplicate kategori"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {category.deleted_at ? (
                          <button
                            type="button"
                            onClick={() => onRestore(category.id)}
                            className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({
                                type: "delete",
                                id: category.id,
                                title: `Hapus ${category.name}?`,
                                description: "Kategori akan masuk ke deleted (soft delete).",
                              })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Hapus kategori"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={`mobile-skeleton-${index}`} className="rounded-xl border border-slate-200 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ))
          : categories.map((category) => (
              <article key={`mobile-${category.id}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{category.name}</p>
                    <p className="mt-1 text-xs text-slate-500">Margin: {formatNumber(category.min_margin)}%</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(category.id)}
                    onChange={() => onToggleSelect(category.id)}
                  />
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  {buildMarketplaceSummaries(category).map((item) => (
                    <div
                      key={`mobile-summary-${category.id}-${item.label}`}
                      className="grid grid-cols-[74px_12px_minmax(0,1fr)] items-start gap-x-1 leading-5"
                    >
                      <span className={`text-left text-[11px] font-bold ${item.className}`}>{item.label}</span>
                      <span className={`text-center text-[11px] font-bold ${item.className}`}>:</span>
                      <p className="text-justify [text-align-last:left]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 whitespace-nowrap">
                  <Link href={`${editBasePath}/${category.id}`} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">Edit</Link>
                  <button type="button" onClick={() => onDuplicate(category)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs">Copy</button>
                  <button type="button" onClick={() => setConfirm({ type: "delete", id: category.id, title: `Hapus ${category.name}?`, description: "Kategori akan di-soft delete." })} className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600">Hapus</button>
                </div>
              </article>
            ))}
      </div>

      {!isLoading && categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
          <Image src="/window.svg" alt="Empty state" width={64} height={64} className="h-16 w-16 opacity-60" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Belum ada kategori sesuai filter</p>
          <p className="mt-1 text-xs text-slate-500">Coba reset filter atau tambahkan kategori baru.</p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-slate-500">
          Menampilkan {pagination.from ?? 0}-{pagination.to ?? 0} dari {pagination.total} kategori
        </p>
        <div className="flex items-center gap-2">
          <select
            value={params.perPage ?? 10}
            onChange={(event) => onParamChange({ perPage: Number(event.target.value), page: 1 })}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}/halaman
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onParamChange({ page: Math.max(1, (params.page ?? 1) - 1) })}
            disabled={(params.page ?? 1) <= 1 || isMutating}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {pagination.current_page}/{pagination.last_page}
          </span>
          <button
            type="button"
            onClick={() => onParamChange({ page: Math.min(pagination.last_page, (params.page ?? 1) + 1) })}
            disabled={(params.page ?? 1) >= pagination.last_page || isMutating}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{confirm.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{confirm.description}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Ya, lanjutkan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
