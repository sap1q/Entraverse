"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import CategoryForm from "@/components/features/categories/CategoryForm";
import { useCategories, useCategory } from "@/hooks/useCategories";

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { category, isLoading, error } = useCategory(id);
  const { categories } = useCategories({ perPage: 100, withTrashed: true });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Edit Kategori</h1>
            <p className="mt-1 text-sm text-slate-500">Perbarui data kategori dan fee components.</p>
          </div>
          <Link href="/categories" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Kembali</Link>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 text-sm text-slate-500">Memuat detail kategori...</div>
      ) : error || !category ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error ?? "Kategori tidak ditemukan"}</div>
      ) : (
        <CategoryForm
          mode="edit"
          category={category}
          categoriesForCopy={categories}
          onSuccess={() => router.push("/categories")}
        />
      )}
    </div>
  );
}