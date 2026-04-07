"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useProductFilters } from "@/hooks/useProductFilters";

type ActiveFilterTag = {
  id: string;
  label: string;
  onRemove: () => void;
};

const prettifySlug = (value: string): string => {
  return value
    .split("-")
    .filter((item) => item.length > 0)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");
};

const formatCurrency = (value: number): string => {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.max(0, Math.round(value)))}`;
};

export const ActiveFilters = () => {
  const {
    getFilterValue,
    getFilterValues,
    removeFilterValue,
    updateFilters,
    clearFilters,
  } = useProductFilters();

  const tags = useMemo<ActiveFilterTag[]>(() => {
    const result: ActiveFilterTag[] = [];

    getFilterValues("category").forEach((slug) => {
      result.push({
        id: `category-${slug}`,
        label: `Kategori: ${prettifySlug(slug)}`,
        onRemove: () => removeFilterValue("category", slug),
      });
    });

    getFilterValues("brand").forEach((slug) => {
      result.push({
        id: `brand-${slug}`,
        label: `Brand: ${prettifySlug(slug)}`,
        onRemove: () => removeFilterValue("brand", slug),
      });
    });

    getFilterValues("rating").forEach((rating) => {
      result.push({
        id: `rating-${rating}`,
        label: `Rating ${rating}+`,
        onRemove: () => removeFilterValue("rating", rating),
      });
    });

    const minPrice = getFilterValue("price_min");
    const maxPrice = getFilterValue("price_max");
    if (minPrice || maxPrice) {
      const minLabel = minPrice ? formatCurrency(Number(minPrice)) : "0";
      const maxLabel = maxPrice ? formatCurrency(Number(maxPrice)) : "tak terbatas";
      result.push({
        id: "price-range",
        label: `Harga: ${minLabel} - ${maxLabel}`,
        onRemove: () => updateFilters({ price_min: undefined, price_max: undefined }),
      });
    }

    const search = getFilterValue("search");
    if (search && search.trim().length > 0) {
      result.push({
        id: "search",
        label: `Cari: ${search.trim()}`,
        onRemove: () => updateFilters({ search: undefined }),
      });
    }

    const tradeIn = getFilterValue("trade_in");
    if (tradeIn === "1" || tradeIn?.toLowerCase() === "true") {
      result.push({
        id: "trade-in",
        label: "Trade-In",
        onRemove: () => updateFilters({ trade_in: undefined }),
      });
    }

    return result;
  }, [getFilterValue, getFilterValues, removeFilterValue, updateFilters]);

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={tag.onRemove}
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
        >
          {tag.label}
          <X className="h-3.5 w-3.5" />
        </button>
      ))}

      <button
        type="button"
        onClick={clearFilters}
        className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
      >
        Hapus semua
      </button>
    </div>
  );
};
