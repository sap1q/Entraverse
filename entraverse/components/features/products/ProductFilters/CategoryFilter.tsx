"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useProductFilters } from "@/hooks/useProductFilters";
import { useProductsContext } from "@/hooks/useProducts";
import { productsApi } from "@/lib/api/products";
import type { Category } from "@/types/product.types";

export const CategoryFilter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toggleFilter, isFilterActive } = useProductFilters();
  const { products } = useProductsContext();

  const categoryCounts = useMemo(() => {
    return products.reduce<Map<string, number>>((result, product) => {
      const slug = product.category.slug;
      result.set(slug, (result.get(slug) ?? 0) + 1);
      return result;
    }, new Map<string, number>());
  }, [products]);

  useEffect(() => {
    let isActive = true;

    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await productsApi.getCategories();
        if (!isActive) return;

        if (!response.success) {
          setError("Gagal memuat kategori.");
          setCategories([]);
          return;
        }

        setCategories(response.data);
      } catch (fetchError) {
        console.error(fetchError);
        if (!isActive) return;
        setError("Gagal memuat kategori.");
        setCategories([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void fetchCategories();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="border-b border-slate-200 pb-5">
      <button
        type="button"
        onClick={() => setIsOpen((state) => !state)}
        className="flex w-full items-center justify-between text-slate-800 hover:text-slate-600"
      >
        <span className="text-sm font-semibold tracking-wide">KATEGORI</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-5 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : null}

          {!loading && error ? <p className="text-xs text-rose-600">{error}</p> : null}

          {!loading && !error
            ? categories.map((category) => (
                <label key={category.id} className="group flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isFilterActive("category", category.slug)}
                    onChange={() => toggleFilter("category", category.slug)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1 text-sm text-slate-600 group-hover:text-slate-900">
                    {category.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({categoryCounts.get(category.slug) ?? category.product_count})
                  </span>
                </label>
              ))
            : null}
        </div>
      ) : null}
    </section>
  );
};
