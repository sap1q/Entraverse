import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { StorefrontCategory } from "@/lib/api/types";
import CategoryCard from "./CategoryCard";

type CategoryGridProps = {
  categories: StorefrontCategory[];
  totalCategories?: number;
  showViewAll?: boolean;
  viewAllLink?: string;
  viewAllLabel?: string;
};

export default function CategoryGrid({
  categories,
  totalCategories,
  showViewAll = true,
  viewAllLink = "/products?view=all",
  viewAllLabel = "Lihat Semua Kategori",
}: CategoryGridProps) {
  const displayCategories = categories.slice(0, 6);
  const availableCount = typeof totalCategories === "number" && totalCategories > 0 ? totalCategories : categories.length;
  const counter =
    typeof totalCategories === "number" && totalCategories > 0 ? ` (${totalCategories})` : "";

  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
        {displayCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
          />
        ))}
      </div>

      {showViewAll && availableCount > displayCategories.length ? (
        <div className="mt-8 flex justify-center">
          <Link
            href={viewAllLink}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-300 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            aria-label={`${viewAllLabel}${counter}`}
          >
            <span>
              {viewAllLabel}
              {counter}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      ) : null}
    </>
  );
}
