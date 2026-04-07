"use client";

import CategoryForm from "@/components/features/categories/CategoryForm";
import type { Category } from "@/types/category.types";

type CategoryModalProps = {
  open: boolean;
  mode?: "create" | "edit";
  category?: Category | null;
  categoriesForCopy?: Category[];
  onClose: () => void;
  onSuccess?: (category: Category) => void;
};

export default function CategoryModal({
  open,
  mode = "create",
  category,
  categoriesForCopy,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {mode === "create" ? "Tambah Kategori" : "Edit Kategori"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            Tutup
          </button>
        </div>

        <CategoryForm
          mode={mode}
          category={category}
          categoriesForCopy={categoriesForCopy}
          onCancel={onClose}
          onSuccess={(result) => {
            onSuccess?.(result);
            onClose();
          }}
        />
      </div>
    </div>
  );
}