import type { StorefrontCategory } from "@/lib/api/types";
import CategoryGrid from "./CategoryGrid";

type CategoriesSectionProps = {
  categories: StorefrontCategory[];
  totalCategories?: number;
  error?: string | null;
  showViewAll?: boolean;
  viewAllLink?: string;
};

export default function CategoriesSection({
  categories,
  totalCategories,
  error,
  showViewAll = true,
  viewAllLink = "/products?view=all",
}: CategoriesSectionProps) {
  return (
    <section className="bg-white py-8 md:py-10">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        {error ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        {categories.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Belum ada kategori yang tersedia.
          </div>
        ) : (
          <CategoryGrid
            categories={categories}
            totalCategories={totalCategories}
            showViewAll={showViewAll}
            viewAllLink={viewAllLink}
          />
        )}
      </div>
    </section>
  );
}
