import type { ProductFilters } from "@/types/product.types";

export const DEFAULT_PRODUCTS_PER_PAGE = 12;

export const SORT_OPTIONS: Array<{
  label: string;
  value: NonNullable<ProductFilters["sort_by"]>;
}> = [
  { label: "Terpopuler", value: "popular" },
  { label: "Harga Terendah", value: "price_asc" },
  { label: "Harga Tertinggi", value: "price_desc" },
  { label: "Terbaru", value: "newest" },
  { label: "Rating Tertinggi", value: "rating" },
];

export const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;
