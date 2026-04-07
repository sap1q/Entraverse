"use client";

import { ProductCard as SharedProductCard } from "@/components/features/products/ProductCard";
import { slugifyValue } from "@/lib/utils/formatter";
import type { Product } from "@/types/product.types";

type LegacyProduct = {
  id: number | string;
  name: string;
  brand?: string | null;
  formatted_price?: string | null;
  price?: number | string | null;
  main_image?: string | null;
  image?: string | null;
  image_url?: string | null;
  thumbnail?: string | null;
};

type ProductCardProps = {
  product: LegacyProduct;
};

const resolveNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const resolveImage = (product: LegacyProduct) => {
  const imageValue = product.main_image ?? product.image_url ?? product.image ?? product.thumbnail;
  if (!imageValue) return "/assets/images/hero/e-hero.png";
  return imageValue;
};

const mapLegacyProductToProduct = (product: LegacyProduct): Product => ({
  id: String(product.id),
  name: product.name,
  slug: slugifyValue(product.name) || String(product.id),
  price: resolveNumber(product.price),
  image: resolveImage(product),
  rating: 0,
  sold_count: 0,
  stock: 0,
  free_shipping: false,
  category: {
    id: "kategori",
    name: "Kategori",
    slug: "kategori",
  },
  brand: {
    id: slugifyValue(product.brand ?? "brand") || "brand",
    name: product.brand?.trim() || "Entraverse",
    slug: slugifyValue(product.brand ?? "brand") || "brand",
  },
  entraverse_price: resolveNumber(product.price),
});

export default function ProductCard({ product }: ProductCardProps) {
  return <SharedProductCard product={mapLegacyProductToProduct(product)} />;
}
