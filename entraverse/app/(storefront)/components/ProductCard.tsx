"use client";

import { ProductCard as SharedProductCard } from "@/components/features/products/ProductCard";
import type { StorefrontProduct } from "@/lib/api/types";
import { slugifyValue } from "@/lib/utils/formatter";
import type { Product } from "@/types/product.types";

type ProductCardProps = {
  product: StorefrontProduct;
};

const toFallbackSlug = (value: string | null, fallback: string) => {
  const normalized = value?.trim() ?? "";
  return slugifyValue(normalized || fallback) || fallback;
};

const mapStorefrontProductToProduct = (product: StorefrontProduct): Product => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  price: product.price,
  image: product.image?.trim() ? product.image : "/assets/images/hero/e-hero.png",
  rating: 0,
  sold_count: 0,
  stock: product.stock,
  stock_status: product.stock_status,
  free_shipping: false,
  category: {
    id: toFallbackSlug(product.category, "kategori"),
    name: product.category?.trim() || "Kategori",
    slug: toFallbackSlug(product.category, "kategori"),
  },
  brand: {
    id: toFallbackSlug(product.brand, "brand"),
    name: product.brand?.trim() || "Entraverse",
    slug: toFallbackSlug(product.brand, "brand"),
  },
  entraverse_price: product.price,
  original_price: undefined,
  discount_percentage: undefined,
  is_wishlisted: false,
});

export default function ProductCard({ product }: ProductCardProps) {
  const normalizedProduct = mapStorefrontProductToProduct(product);

  return <SharedProductCard product={normalizedProduct} />;
}
