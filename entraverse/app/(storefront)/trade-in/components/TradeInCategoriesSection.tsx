"use client";

import { useEffect, useState } from "react";
import { productsApi } from "@/lib/api/products";
import { storefrontApi } from "@/lib/api/storefront";
import type { StorefrontCategory } from "@/lib/api/types";
import { TradeInCategoryCard } from "./TradeInCategoryCard";

const resolveTradeInCategories = async (): Promise<StorefrontCategory[]> => {
  const [categoriesResult, tradeInProductsResult] = await Promise.all([
    storefrontApi.getCategories(50),
    productsApi.getProducts({
      per_page: 100,
      sort_by: "popular",
      trade_in: true,
    }),
  ]);

  const categoryLookup = new Map(
    categoriesResult.data.map((category) => [category.slug, category] as const)
  );
  const categoryCounts = new Map<string, number>();

  tradeInProductsResult.data
    .filter((product) => Boolean(product.trade_in))
    .forEach((product) => {
      const slug = product.category.slug;
      categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1);
    });

  return Array.from(categoryCounts.entries())
    .map(([slug, count]) => {
      const matchedCategory = categoryLookup.get(slug);
      if (matchedCategory) {
        return {
          ...matchedCategory,
          __count: count,
        };
      }

      const fallbackProductCategory = tradeInProductsResult.data.find(
        (product) => product.category.slug === slug
      )?.category;

      return {
        id: fallbackProductCategory?.id ?? slug,
        name: fallbackProductCategory?.name ?? slug,
        slug,
        imageUrl: null,
        imageSvg: null,
        __count: count,
      };
    })
    .sort((left, right) => {
      if (right.__count !== left.__count) {
        return right.__count - left.__count;
      }

      return left.name.localeCompare(right.name, "id-ID");
    })
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
      imageSvg: category.imageSvg,
    }));
};

export function TradeInCategoriesSection() {
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await resolveTradeInCategories();
        if (!mounted) return;
        setCategories(data);
      } catch (fetchError) {
        if (!mounted) return;
        console.error(fetchError);
        setCategories([]);
        setError("Kategori trade-in belum berhasil dimuat.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="trade-in-main" className="scroll-mt-28 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-[2.35rem]">
            Pilih Produk Lama Kamu
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500 md:text-base">
            Pilih kategori dari produk yang kamu miliki untuk melakukan proses trade in.
          </p>
        </div>

        {loading ? (
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200 sm:h-28 sm:w-28" />
                <div className="mt-4 h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-center text-sm text-rose-700">
            {error}
          </div>
        ) : categories.length === 0 ? (
          <div className="mx-auto mt-12 max-w-2xl rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center text-sm text-slate-500">
            Belum ada kategori dengan produk trade-in yang aktif.
          </div>
        ) : (
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <TradeInCategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
