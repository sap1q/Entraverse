import type { StorefrontProduct } from "@/lib/api/types";
import { formatCurrencyIDR, slugifyValue } from "@/lib/utils/formatter";
import type { Product } from "@/types/product.types";

export type WishlistProductSnapshot = {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  formattedPrice: string;
  originalPrice?: number;
  discountPercentage?: number;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  brandId: string;
  brandName: string;
  brandSlug: string;
  rating: number;
  soldCount: number;
  freeShipping: boolean;
  updatedAt: number;
};

const resolveNameSlug = (value: string | null | undefined, fallback: string) => {
  const normalized = (value ?? "").trim();
  return slugifyValue(normalized || fallback) || fallback;
};

export const createWishlistSnapshotFromProduct = (product: Product): WishlistProductSnapshot => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  image: product.image?.trim() ? product.image : "/assets/images/hero/e-hero.png",
  price: product.price,
  formattedPrice: formatCurrencyIDR(product.price),
  originalPrice: product.original_price,
  discountPercentage: product.discount_percentage,
  categoryId: product.category.id,
  categoryName: product.category.name,
  categorySlug: product.category.slug,
  brandId: product.brand.id,
  brandName: product.brand.name,
  brandSlug: product.brand.slug,
  rating: product.rating,
  soldCount: product.sold_count,
  freeShipping: Boolean(product.free_shipping),
  updatedAt: Date.now(),
});

export const createWishlistSnapshotFromStorefrontProduct = (
  product: StorefrontProduct
): WishlistProductSnapshot => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  image: product.image?.trim() ? product.image : "/assets/images/hero/e-hero.png",
  price: product.price,
  formattedPrice: product.formattedPrice || formatCurrencyIDR(product.price),
  categoryId: resolveNameSlug(product.category, "kategori"),
  categoryName: product.category?.trim() || "Kategori",
  categorySlug: resolveNameSlug(product.category, "kategori"),
  brandId: resolveNameSlug(product.brand, "brand"),
  brandName: product.brand?.trim() || "Entraverse",
  brandSlug: resolveNameSlug(product.brand, "brand"),
  rating: 0,
  soldCount: 0,
  freeShipping: false,
  updatedAt: Date.now(),
});

export const mapWishlistSnapshotToProduct = (snapshot: WishlistProductSnapshot): Product => ({
  id: snapshot.id,
  name: snapshot.name,
  slug: snapshot.slug,
  price: snapshot.price,
  original_price: snapshot.originalPrice,
  discount_percentage: snapshot.discountPercentage,
  rating: snapshot.rating,
  sold_count: snapshot.soldCount,
  image: snapshot.image,
  category: {
    id: snapshot.categoryId,
    name: snapshot.categoryName,
    slug: snapshot.categorySlug,
  },
  brand: {
    id: snapshot.brandId,
    name: snapshot.brandName,
    slug: snapshot.brandSlug,
  },
  is_wishlisted: true,
  free_shipping: snapshot.freeShipping,
  stock: 0,
});
