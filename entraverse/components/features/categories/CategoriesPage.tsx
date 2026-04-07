"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, WandSparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import CategoryModal from "@/components/features/categories/CategoryModal";
import CategoryStats from "@/components/features/categories/CategoryStats";
import CategoryTable from "@/components/features/categories/CategoryTable";
import { useCategories, useCategoryStats } from "@/hooks/useCategories";
import type { Category } from "@/types/category.types";

type ToastItem = {
  id: string;
  message: string;
  tone: "success" | "error";
};

const downloadText = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const csvEscape = (value: string): string => {
  const normalized = value.replace(/\r?\n|\r/g, " ");
  return `"${normalized.replace(/"/g, '""')}"`;
};

export default function CategoriesPageScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const createPath = pathname.startsWith("/admin") ? "/admin/categories/create" : "/categories/create";

  const {
    categories,
    pagination,
    params,
    isLoading,
    isMutating,
    error,
    selectedIds,
    allSelectedOnPage,
    updateParam,
    toggleSort,
    deleteOne,
    restoreOne,
    duplicateOne,
    bulkDelete,
    toggleSelect,
    toggleSelectAll,
    refresh,
  } = useCategories({
    page: 1,
    perPage: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    withTrashed: false,
  });

  const { stats, isLoading: statsLoading } = useCategoryStats();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addToast = (message: string, tone: "success" | "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 2500);
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      router.push(createPath);
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [createPath, router]);

  const exportRows = useMemo(
    () =>
      categories.map((item) => ({
        id: item.id,
        name: item.name,
        min_margin: item.min_margin,
        deleted: item.deleted_at ? "yes" : "no",
        created_at: item.created_at ?? "",
        updated_at: item.updated_at ?? "",
      })),
    [categories]
  );

  const onExportCsv = () => {
    const headers = ["id", "name", "min_margin", "deleted", "created_at", "updated_at"];
    const rows = exportRows.map((row) =>
      headers.map((header) => csvEscape(String(row[header as keyof typeof row] ?? ""))).join(",")
    );
    downloadText(`categories-${Date.now()}.csv`, [headers.join(","), ...rows].join("\n"), "text/csv;charset=utf-8;");
    addToast("Export CSV berhasil", "success");
  };

  const onExportExcel = () => {
    const headers = ["id", "name", "min_margin", "deleted", "created_at", "updated_at"];
    const rows = exportRows.map((row) => headers.map((header) => row[header as keyof typeof row] ?? "").join("\t"));
    downloadText(
      `categories-${Date.now()}.xls`,
      [headers.join("\t"), ...rows].join("\n"),
      "application/vnd.ms-excel;charset=utf-8;"
    );
    addToast("Export Excel berhasil", "success");
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Kategori</h1>
            <p className="mt-1 text-sm text-slate-500">
              Kelola fee marketplace per kategori untuk menjaga margin supplier tetap sehat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
              title="Ctrl+N"
            >
              <WandSparkles className="h-4 w-4" /> Quick Create
            </button>
            <Link
              href={createPath}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Tambah Kategori
            </Link>
          </div>
        </div>
      </section>

      <CategoryStats stats={stats} isLoading={statsLoading} />

      <CategoryTable
        categories={categories}
        isLoading={isLoading}
        isMutating={isMutating}
        error={error}
        pagination={pagination}
        params={params}
        selectedIds={selectedIds}
        allSelectedOnPage={allSelectedOnPage}
        onParamChange={updateParam}
        onToggleSort={toggleSort}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onDelete={async (id) => {
          const ok = await deleteOne(id);
          addToast(ok ? "Kategori berhasil dihapus" : "Gagal menghapus kategori", ok ? "success" : "error");
          return ok;
        }}
        onRestore={async (id) => {
          const ok = await restoreOne(id);
          addToast(ok ? "Kategori berhasil direstore" : "Gagal restore kategori", ok ? "success" : "error");
          return ok;
        }}
        onDuplicate={async (item: Category) => {
          const ok = await duplicateOne(item);
          addToast(ok ? "Kategori berhasil diduplikasi" : "Gagal duplicate kategori", ok ? "success" : "error");
          return ok;
        }}
        onBulkDelete={async () => {
          const ok = await bulkDelete();
          addToast(ok ? "Bulk delete berhasil" : "Bulk delete gagal", ok ? "success" : "error");
          return ok;
        }}
        onExportCsv={onExportCsv}
        onExportExcel={onExportExcel}
      />

      <CategoryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoriesForCopy={categories}
        onSuccess={() => {
          addToast("Kategori berhasil dibuat", "success");
          refresh();
        }}
      />

      <div className="fixed right-4 top-4 z-[9999] flex w-[280px] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-3 py-2 text-sm shadow-sm ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}