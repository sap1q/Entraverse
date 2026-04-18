"use client";

import { productsApi } from "@/lib/api/products";
import type { Category, Product } from "@/types/product.types";

export type ProductBadge = "BARU" | "HOT";

export type HighlightProduct = {
  product: Product;
  badge: ProductBadge;
};

export type ProductMenuData = {
  categories: Category[];
  highlights: HighlightProduct[];
};

export const SERVICE_LINKS = [
  { label: "Trade-In", href: "/trade-in" },
  { label: "Garansi", href: "/garansi" },
] as const;

let productMenuDataCache: ProductMenuData | null = null;
let productMenuDataPromise: Promise<ProductMenuData> | null = null;

const makeHighlights = (newest: Product[], hottest: Product[]): HighlightProduct[] => {
  const fresh = newest.slice(0, 4).map((product) => ({ product, badge: "BARU" as const }));
  const taken = new Set(fresh.map((item) => item.product.id));
  const hot = hottest
    .filter((product) => !taken.has(product.id))
    .slice(0, 4)
    .map((product) => ({ product, badge: "HOT" as const }));

  return [...fresh, ...hot];
};

export const buildCategoryHref = (slug: string) => `/products?category=${encodeURIComponent(slug)}`;

export const loadProductMenuData = async (): Promise<ProductMenuData> => {
  if (productMenuDataCache) return productMenuDataCache;
  if (productMenuDataPromise) return productMenuDataPromise;

  productMenuDataPromise = (async () => {
    const [newestResponse, hottestResponse, fetchedCategories] = await Promise.all([
      productsApi.getProducts({ per_page: 8, sort_by: "newest" }),
      productsApi.getProducts({ per_page: 8, sort_by: "popular" }),
      productsApi
        .getCategories({
          limit: 8,
          timeout: 12000,
        })
        .then((response) => response.data)
        .catch((error) => {
          console.warn("[product-menu] kategori tidak berhasil dimuat, memakai fallback dari produk.", error);
          return [] as Category[];
        }),
    ]);

    const highlightedProducts = makeHighlights(newestResponse.data, hottestResponse.data);

    const fallbackCategories = highlightedProducts
      .map((item) => item.product.category)
      .filter(
        (category, index, all) =>
          all.findIndex((candidate) => candidate.slug === category.slug) === index
      )
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        product_count: 0,
      }));

    const categoriesForMenu = fetchedCategories.length > 0 ? fetchedCategories : fallbackCategories;
    const resolvedData = {
      categories: categoriesForMenu,
      highlights: highlightedProducts,
    } satisfies ProductMenuData;

    productMenuDataCache = resolvedData;
    productMenuDataPromise = null;
    return resolvedData;
  })().catch((error) => {
    productMenuDataPromise = null;
    throw error;
  });

  return productMenuDataPromise;
};

export const warmProductMenuData = () => {
  if (productMenuDataCache || productMenuDataPromise) return;
  void loadProductMenuData().catch(() => undefined);
};
