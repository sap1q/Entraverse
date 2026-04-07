"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import type { ProductDetail } from "@/types/product.types";
import { formatDimension } from "@/lib/utils/formatter";

interface ProductSpecificationsProps {
  product: ProductDetail;
}

const humanizeKey = (value: string): string => {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const ProductSpecifications = ({ product }: ProductSpecificationsProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const rows = useMemo(() => {
    const baseRows = [
      { label: "Brand", value: product.brand.name || "-" },
      { label: "Berat", value: product.weight > 0 ? `${product.weight} gram` : "-" },
      { label: "SKU", value: product.sku || "-" },
      { label: "Dimensi", value: formatDimension(product.dimensions) },
      { label: "Barcode", value: product.barcode || "-" },
      { label: "Garansi", value: product.warranty || "-" },
    ];

    const technicalRows = Object.entries(product.specifications).map(([key, value]) => ({
      label: humanizeKey(key),
      value,
    }));

    return [...baseRows, ...technicalRows];
  }, [product]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900">Spesifikasi Produk</h2>
        <button
          type="button"
          onClick={() => setCollapsed((previous) => !previous)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          aria-label={collapsed ? "Tampilkan spesifikasi produk" : "Sembunyikan spesifikasi produk"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            key="spec-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <dl className="mt-4 space-y-3">
              {rows.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-none last:pb-0">
                  <dt className="text-sm text-slate-500">{item.label}</dt>
                  <dd className="text-right text-sm font-medium text-slate-800">{String(item.value ?? "-")}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
