"use client";

import { ProductCard as SharedProductCard } from "@/components/features/products/ProductCard";
import { slugifyValue } from "@/lib/utils/formatter";
import type { Product as SharedProduct } from "@/types/product.types";
import type { Product } from "@/src/types/product";

interface ProductCardProps {
  product: Product;
}

const mapLegacyProductToProduct = (product: Product): SharedProduct => ({
  id: String(product.id),
  name: product.name,
  slug: slugifyValue(product.name) || String(product.id),
  price: product.price,
  image: product.main_image?.trim() ? product.main_image : "/assets/images/hero/e-hero.png",
  rating: 0,
  sold_count: 0,
  stock: product.stock ?? 0,
  free_shipping: false,
  category: {
    id: "kategori",
    name: "Kategori",
    slug: "kategori",
  },
  brand: {
    id: slugifyValue(product.brand || "brand") || "brand",
    name: product.brand || "Entraverse",
    slug: slugifyValue(product.brand || "brand") || "brand",
  },
  entraverse_price: product.price,
});

export function ProductCard({ product }: ProductCardProps) {
  return <SharedProductCard product={mapLegacyProductToProduct(product)} />;
}
