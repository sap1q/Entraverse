"use client";

import { ArrowDownUp, ChevronDown } from "lucide-react";
import { useProductFilters } from "@/hooks/useProductFilters";
import { SORT_OPTIONS } from "@/lib/constants/filters";
import type { ProductFilters } from "@/types/product.types";

const DEFAULT_SORT: NonNullable<ProductFilters["sort_by"]> = "popular";
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value));

export const ProductSort = () => {
  const { getFilterValue, updateFilters } = useProductFilters();
  const selectedSort = getFilterValue("sort");
  const activeSort =
    selectedSort && SORT_VALUES.has(selectedSort as NonNullable<ProductFilters["sort_by"]>)
      ? (selectedSort as NonNullable<ProductFilters["sort_by"]>)
      : DEFAULT_SORT;

  const handleChangeSort = (value: NonNullable<ProductFilters["sort_by"]>) => {
    updateFilters({ sort: value });
  };

  return (
    <label className="inline-flex min-h-[50px] w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 sm:w-auto">
      <ArrowDownUp className="h-4 w-4 text-slate-500" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Urutkan</span>
      <select
        value={activeSort}
        onChange={(event) => handleChangeSort(event.target.value as NonNullable<ProductFilters["sort_by"]>)}
        className="min-w-0 flex-1 appearance-none bg-transparent pr-6 text-sm font-semibold text-slate-700 outline-none sm:flex-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none -ml-5 h-4 w-4 shrink-0 text-slate-500" />
    </label>
  );
};
