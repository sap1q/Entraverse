"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, SlidersHorizontal, Sparkles, Tag } from "lucide-react";
import { useBrandOptions } from "@/hooks/useBrands";
import { useCategoryOptions } from "@/hooks/useCategories";
import ProductTableRow, {
  type ProductStatus,
  type ProductStockStatus,
  type ProductTableRowProduct,
} from "@/components/features/products/ProductTableRow";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { useProductActions } from "@/hooks/useProductActions";

type FilterValue = "all" | string;

interface ProductTableProps {
  products: ProductTableRowProduct[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void | Promise<void>;
  statusFilter: "all" | ProductStatus;
  onStatusFilterChange: (value: "all" | ProductStatus) => void;
  brandFilter: FilterValue;
  onBrandFilterChange: (value: FilterValue) => void;
  categoryFilter: FilterValue;
  onCategoryFilterChange: (value: FilterValue) => void;
  stockFilter: "all" | ProductStockStatus;
  onStockFilterChange: (value: "all" | ProductStockStatus) => void;
  featuredOnly: boolean;
  onFeaturedOnlyChange: (value: boolean) => void;
  onToggleFeatured: (product: ProductTableRowProduct) => void | Promise<void>;
  onToggleStatus: (product: ProductTableRowProduct) => void | Promise<void>;
  updatingFeaturedIds?: Record<string, boolean>;
  updatingStatusIds?: Record<string, boolean>;
  pagination?: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export type ProductTableProduct = ProductTableRowProduct;

type CompactSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  children: ReactNode;
};

function CompactSelect({ label, value, onChange, icon, children }: CompactSelectProps) {
  return (
    <label className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {icon}
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export default function ProductTable({
  products,
  isLoading,
  search,
  onSearchChange,
  onRefresh,
  statusFilter,
  onStatusFilterChange,
  brandFilter,
  onBrandFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  stockFilter,
  onStockFilterChange,
  featuredOnly,
  onFeaturedOnlyChange,
  onToggleFeatured,
  onToggleStatus,
  updatingFeaturedIds,
  updatingStatusIds,
  pagination,
}: ProductTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pick<ProductTableRowProduct, "id" | "name"> | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const { options: brandOptions, loading: brandsLoading } = useBrandOptions();
  const { options: categoryOptions, loading: categoriesLoading } = useCategoryOptions();

  const { handleEdit, handleDelete, deleteLoading, toasts, dismissToast } = useProductActions({
    onDeleted: onRefresh,
  });

  const activeFilterCount = useMemo(
    () =>
      [
        statusFilter !== "all",
        brandFilter !== "all",
        categoryFilter !== "all",
        stockFilter !== "all",
        featuredOnly,
      ].filter(Boolean).length,
    [brandFilter, categoryFilter, featuredOnly, statusFilter, stockFilter]
  );

  const totalProductCount = pagination?.total ?? products.length;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const resetFilters = () => {
    onStatusFilterChange("all");
    onBrandFilterChange("all");
    onCategoryFilterChange("all");
    onStockFilterChange("all");
    onFeaturedOnlyChange(false);
  };

  return (
    <>
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800">Daftar Produk</h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {totalProductCount} produk
              </span>
            </div>

            <div className="flex w-full max-w-[520px] flex-wrap items-center justify-end gap-2 sm:w-auto">
              <label className="flex h-10 min-w-[190px] items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-slate-500">
                <Search className="h-4 w-4 text-blue-500" />
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Cari produk"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  aria-label="Cari produk"
                />
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : null}
              </label>

              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border text-slate-600 transition ${
                    activeFilterCount > 0
                      ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  aria-label="Buka filter produk"
                  title={activeFilterCount > 0 ? `${activeFilterCount} filter aktif` : "Filter produk"}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>

                {isFilterOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-[min(92vw,340px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">Filter</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">Saring Master Produk</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetFilters}
                        disabled={activeFilterCount === 0}
                        className="text-xs font-semibold text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <CompactSelect
                        label="Status"
                        value={statusFilter}
                        onChange={(value) => onStatusFilterChange(value as "all" | ProductStatus)}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                      >
                        <option value="all">Semua</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Non Aktif</option>
                        <option value="draft">Draft</option>
                      </CompactSelect>

                      <CompactSelect
                        label="Stok"
                        value={stockFilter}
                        onChange={(value) => onStockFilterChange(value as "all" | ProductStockStatus)}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                      >
                        <option value="all">Semua</option>
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="preorder">Preorder</option>
                      </CompactSelect>

                      <CompactSelect
                        label="Brand"
                        value={brandFilter}
                        onChange={onBrandFilterChange}
                        icon={<Tag className="h-3.5 w-3.5" />}
                      >
                        <option value="all">{brandsLoading ? "Memuat brand..." : "Semua brand"}</option>
                        {brandOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CompactSelect>

                      <CompactSelect
                        label="Kategori"
                        value={categoryFilter}
                        onChange={onCategoryFilterChange}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                      >
                        <option value="all">{categoriesLoading ? "Memuat kategori..." : "Semua kategori"}</option>
                        {categoryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </CompactSelect>
                    </div>

                    <button
                      type="button"
                      onClick={() => onFeaturedOnlyChange(!featuredOnly)}
                      className={`mt-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        featuredOnly
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Featured saja
                      </span>
                      <span
                        className={`inline-flex h-5 min-w-[36px] items-center rounded-full px-1 transition ${
                          featuredOnly ? "bg-amber-200/80 justify-end" : "bg-slate-200 justify-start"
                        }`}
                        aria-hidden="true"
                      >
                        <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <colgroup>
              <col className="w-[88px]" />
              <col />
              <col className="w-[280px]" />
              <col className="w-[190px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100">
                <th className="border-b border-gray-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Foto
                </th>
                <th className="border-b border-gray-100 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Nama Produk
                </th>
                <th className="border-b border-gray-100 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status & Featured
                </th>
                <th className="border-b border-gray-100 px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="border-b border-gray-100 px-3 py-4">
                      <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4">
                      <div className="mx-auto h-16 w-52 animate-pulse rounded-xl bg-slate-200" />
                    </td>
                    <td className="border-b border-gray-100 px-3 py-4 text-right">
                      <div className="ml-auto h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-12 text-center text-sm text-slate-500">
                    Tidak ada produk yang sesuai filter atau pencarian.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <Fragment key={product.id}>
                    <ProductTableRow
                      product={product}
                      onEdit={handleEdit}
                      onDelete={(id, name) => setDeleteTarget({ id, name })}
                      onJurnalSyncComplete={onRefresh}
                      isExpanded={expandedId === product.id}
                      onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
                      isActionOpen={openActionId === product.id}
                      onActionOpenChange={(open) => {
                        setOpenActionId(open ? product.id : null);
                      }}
                      onToggleFeatured={onToggleFeatured}
                      onToggleStatus={onToggleStatus}
                      isFeaturedUpdating={Boolean(updatingFeaturedIds?.[product.id])}
                      isStatusUpdating={Boolean(updatingStatusIds?.[product.id])}
                    />
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination ? (
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Menampilkan {products.length} dari {pagination.total} produk. {pagination.perPage} produk per halaman.
            </p>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                disabled={isLoading || pagination.currentPage <= 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-medium text-slate-500">
                Halaman {pagination.currentPage} dari {pagination.lastPage}
              </span>
              <button
                type="button"
                onClick={() => pagination.onPageChange(Math.min(pagination.lastPage, pagination.currentPage + 1))}
                disabled={isLoading || pagination.currentPage >= pagination.lastPage}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <DeleteConfirmationModal
        isOpen={deleteTarget !== null}
        title="Hapus Produk"
        message={`Apakah Anda yakin ingin menghapus produk "${deleteTarget?.name ?? ""}"?`}
        isLoading={deleteLoading}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await handleDelete(deleteTarget.id);
            setDeleteTarget(null);
            setExpandedId((prev) => (prev === deleteTarget.id ? null : prev));
            setOpenActionId((prev) => (prev === deleteTarget.id ? null : prev));
          } catch {
            // Keep modal open for quick retry after failed request.
          }
        }}
      />

      <div className="fixed right-4 top-4 z-[9999] flex w-[280px] flex-col gap-2">
        {toasts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dismissToast(item.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm shadow-sm ${
              item.variant === "destructive"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : item.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            {item.description ? <p>{item.description}</p> : null}
          </button>
        ))}
      </div>
    </>
  );
}
