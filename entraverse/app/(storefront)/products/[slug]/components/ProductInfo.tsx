"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ListTree, Star } from "lucide-react";
import { ProductVariantSelector } from "./ProductVariantSelector";
import { ProductAdminEditShortcut } from "./ProductAdminEditShortcut";
import { buildProductSpecificationRows } from "./productDetailSections";
import { RatingStars } from "@/components/ui/RatingStars";
import { formatCompactNumber, formatCurrencyIDR } from "@/lib/utils/formatter";
import { cn } from "@/lib/utils";
import type { ProductDetail } from "@/types/product.types";

interface ProductInfoProps {
  product: ProductDetail;
  selectedPrice: number;
  selectedVariants: Record<string, string>;
  onVariantChange: (groupName: string, option: string) => void;
}

export const ProductInfo = ({ product, selectedPrice, selectedVariants, onVariantChange }: ProductInfoProps) => {
  const [showSpecifications, setShowSpecifications] = useState(false);
  const specificationRows = useMemo(() => buildProductSpecificationRows(product), [product]);

  return (
    <section className="rounded-2xl border border-transparent bg-white p-5 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <div className="inline-flex items-center gap-1.5">
              <RatingStars rating={product.rating} size="sm" />
              <span className="font-semibold text-slate-700">{product.rating.toFixed(1)}</span>
            </div>
            <span>{formatCompactNumber(product.sold_count)} terjual</span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {product.reviews_summary.total_count} ulasan
            </span>
          </div>
        </div>

        <ProductAdminEditShortcut productId={product.id} />
      </div>

      <div className="mt-5 flex items-end gap-3">
        <p className="text-3xl font-bold text-slate-900 md:text-4xl">{formatCurrencyIDR(selectedPrice)}</p>
        {typeof product.original_price === "number" && product.original_price > selectedPrice ? (
          <p className="pb-1 text-base text-slate-400 line-through">{formatCurrencyIDR(product.original_price)}</p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <ProductVariantSelector variants={product.variants ?? []} selectedVariants={selectedVariants} onChange={onVariantChange} />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setShowSpecifications((previous) => !previous)}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
            showSpecifications
              ? "border-blue-200 bg-blue-50/80 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
          )}
          aria-expanded={showSpecifications}
          aria-controls="product-specifications-panel"
        >
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-current shadow-sm">
              <ListTree className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Spesifikasi Produk</span>
              <span className="block text-xs text-slate-500">Lihat detail brand, dimensi, SKU, dan informasi teknis</span>
            </span>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-current/15 bg-white/80">
            <ChevronDown className={cn("h-4 w-4 transition-transform", showSpecifications && "rotate-180")} />
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showSpecifications ? (
          <motion.div
            key="product-specifications-panel"
            id="product-specifications-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-transparent bg-slate-50/60 p-4">
              <div className="space-y-3">
                {specificationRows.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 text-sm last:border-none last:pb-0"
                  >
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-right font-medium text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
