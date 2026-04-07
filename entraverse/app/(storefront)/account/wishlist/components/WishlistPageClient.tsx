"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Search } from "lucide-react";
import { ProductCard } from "@/components/features/products/ProductCard";
import { useWishlist } from "@/hooks/useWishlist";
import { mapWishlistSnapshotToProduct } from "@/lib/wishlist";
import { formatCompactNumber } from "@/lib/utils/formatter";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { useRequireStorefrontAuth } from "@/hooks/useRequireStorefrontAuth";

const containerMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut",
      staggerChildren: 0.05,
    },
  },
} as const;

const itemMotion = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, scale: 0.94, transition: { duration: 0.18, ease: "easeInOut" } },
} as const;

export function WishlistPageClient() {
  const { isAuthenticated, isChecking } = useRequireStorefrontAuth("/account/wishlist");
  const { wishlistItems } = useWishlist();
  const wishlistedProducts = wishlistItems.map(mapWishlistSnapshotToProduct);

  if (isChecking || !isAuthenticated) {
    return (
      <AccountShell
        title="Wishlist"
        description="Simpan produk yang ingin Anda pantau, lalu kembali kapan saja tanpa perlu mencarinya lagi."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.24)]"
            >
              <div className="aspect-square animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title="Wishlist"
      description="Simpan produk favorit, bandingkan nanti, dan kembali ke item yang paling Anda incar dalam satu tempat."
    >
      <motion.div
        variants={containerMotion}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 rounded-[28px] border border-rose-100 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(255,255,255,0.96))] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Wishlist Anda</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {wishlistedProducts.length === 0
                ? "Belum ada produk tersimpan."
                : `${formatCompactNumber(wishlistedProducts.length)} produk siap dipantau.`}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/80 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <Heart className="h-4 w-4 text-rose-500" />
            {wishlistedProducts.length} item
          </div>
        </div>

        {wishlistedProducts.length === 0 ? (
          <motion.div
            variants={itemMotion}
            className="flex flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <Heart className="h-7 w-7 text-rose-500" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900">Wishlist masih kosong</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Tambahkan produk dari listing atau homepage lewat ikon heart, lalu item akan muncul di sini secara otomatis.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Search className="h-4 w-4" />
              Jelajahi Produk
            </Link>
          </motion.div>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {wishlistedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  variants={itemMotion}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </AccountShell>
  );
}
