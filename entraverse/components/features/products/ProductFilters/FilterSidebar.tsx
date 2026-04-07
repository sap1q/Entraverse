"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useProductFilters } from "@/hooks/useProductFilters";
import { BrandFilter } from "@/components/features/products/ProductFilters/BrandFilter";
import { CategoryFilter } from "@/components/features/products/ProductFilters/CategoryFilter";
import { PriceFilter } from "@/components/features/products/ProductFilters/PriceFilter";
import { RatingFilter } from "@/components/features/products/ProductFilters/RatingFilter";

interface FilterSidebarProps {
  mode?: "desktop" | "mobile";
}

export const FilterSidebar = ({ mode = "desktop" }: FilterSidebarProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const searchParams = useSearchParams();
  const { clearFilters } = useProductFilters();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += searchParams.getAll("category").length;
    count += searchParams.getAll("brand").length;
    count += searchParams.getAll("rating").length;
    if (searchParams.get("price_min")) count += 1;
    if (searchParams.get("price_max")) count += 1;
    if (searchParams.get("search")) count += 1;
    if (searchParams.get("trade_in")) count += 1;
    return count;
  }, [searchParams]);

  const filterContent = (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Filter Produk</h2>
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
        >
          Reset semua
        </button>
      </div>

      <div className="space-y-5">
        <CategoryFilter />
        <PriceFilter />
        <RatingFilter />
        <BrandFilter />
      </div>
    </div>
  );

  if (mode === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {activeFilterCount > 0 ? (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {isMobileOpen ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Tutup filter"
            />

            <div className="absolute right-0 top-0 h-full w-full max-w-xs overflow-y-auto bg-white p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Filter Produk</h3>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
                  aria-label="Tutup panel filter"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filterContent}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {filterContent}
    </div>
  );
};
