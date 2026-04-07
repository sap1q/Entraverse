"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { WishlistHeartButton } from "@/components/ui/WishlistHeartButton";
import { useWishlist } from "@/hooks/useWishlist";
import { createWishlistSnapshotFromProduct } from "@/lib/wishlist";
import { cn } from "@/lib/utils";
import { formatCurrencyIDR } from "@/lib/utils/formatter";
import type { Product } from "@/types/product.types";

interface ProductCardProps {
  product: Product;
  view?: "grid" | "list";
}

export const ProductCard = ({ product, view = "grid" }: ProductCardProps) => {
  const { toggleWishlist, seedWishlistItem, isInWishlist, isPending, hasHydrated } = useWishlist();
  const wishlistSnapshot = useMemo(() => createWishlistSnapshotFromProduct(product), [product]);
  const isWishlisted = hasHydrated ? isInWishlist(product.id) : Boolean(product.is_wishlisted);
  const wishlistPending = isPending(product.id);
  const imageSrc = product.image?.trim() ? product.image : "/assets/images/hero/e-hero.png";
  const displayRating = Number.isFinite(product.rating) ? product.rating : 0;
  const soldLabel = product.sold_count > 0 ? `${product.sold_count}+ terjual` : "0 terjual";
  const isOutOfStock = product.stock_status === "out_of_stock" || product.stock <= 0;
  const wishlistButtonClass = "h-9 w-9 rounded-full bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.16)] backdrop-blur-sm";

  useEffect(() => {
    if (!product.is_wishlisted || hasHydrated) return;
    seedWishlistItem(wishlistSnapshot);
  }, [hasHydrated, product.is_wishlisted, seedWishlistItem, wishlistSnapshot]);

  const handleWishlistClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void toggleWishlist(product.id, wishlistSnapshot);
  };

  return (
    <Link href={`/products/${encodeURIComponent(product.slug)}`} className="group block h-full">
      <article
        className={cn(
          "relative h-full rounded-[1.35rem] border border-transparent bg-white transition-transform duration-200 hover:-translate-y-0.5",
          view === "list" ? "sm:flex" : ""
        )}
      >
        <div
          className={cn(
            "w-full",
            view === "list" ? "sm:w-[15.5rem] sm:flex-shrink-0" : ""
          )}
        >
          <div className="rounded-[1.15rem] bg-white px-4 pb-4 pt-5">
            <div
              className={cn(
                "relative mx-auto aspect-square w-full overflow-hidden rounded-[1.35rem]",
                isOutOfStock ? "bg-[#d9d9d9]" : "",
                view === "list" ? "max-w-[12rem]" : "max-w-[11.5rem]"
              )}
            >
              <div className="absolute right-2 top-2 left-auto bottom-auto z-30">
                <WishlistHeartButton
                  active={isWishlisted}
                  pending={wishlistPending}
                  onClick={handleWishlistClick}
                  className={wishlistButtonClass}
                  iconClassName="h-5 w-5"
                />
              </div>
              <Image
                src={imageSrc}
                alt={product.name}
                fill
                className={cn(
                  "transition-transform duration-500 group-hover:scale-105",
                  isOutOfStock ? "object-cover grayscale opacity-45" : "object-contain"
                )}
                unoptimized
                sizes={
                  view === "list"
                    ? "(max-width: 640px) 100vw, 192px"
                    : "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1280px) 24vw, 19vw"
                }
                loading="lazy"
              />
              {isOutOfStock ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-500/24">
                  <span
                    className={cn(
                      "px-4 text-center font-black uppercase leading-[0.9] text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.3)]",
                      view === "list" ? "text-[1.7rem] tracking-[0.06em]" : "text-[1.35rem] tracking-[0.04em]"
                    )}
                  >
                    Stok Habis
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-1 pb-2 pt-4 sm:px-2">
          <h3
            className={cn(
              "line-clamp-3 text-[1.05rem] font-semibold leading-8 text-slate-950",
              view === "list"
                ? "sm:line-clamp-2 sm:text-[1.1rem]"
                : "min-h-[6rem]"
            )}
          >
            {product.name}
          </h3>

          <div className="mt-2">
            <p className={cn("font-bold text-slate-950", view === "list" ? "text-[1.75rem]" : "text-[1.2rem]")}>
              {formatCurrencyIDR(product.price)}
            </p>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-700">{displayRating.toFixed(1)}</span>
            <span className="text-slate-400">{soldLabel}</span>
          </div>
        </div>
      </article>
    </Link>
  );
};
