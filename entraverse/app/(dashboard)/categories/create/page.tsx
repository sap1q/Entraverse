"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import CategoryForm from "@/components/features/categories/CategoryForm";
import { useCategories } from "@/hooks/useCategories";

export default function CreateCategoryPage() {
  const router = useRouter();
  const { categories } = useCategories({ perPage: 100 });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tambah Kategori</h1>
            <p className="mt-1 text-sm text-slate-500">Buat kategori baru beserta struktur fee-nya.</p>
          </div>
          <Link href="/categories" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Kembali</Link>
        </div>
      </section>

      <CategoryForm
        mode="create"
        categoriesForCopy={categories}
        onSuccess={() => router.push("/categories")}
      />
    </div>
  );
}