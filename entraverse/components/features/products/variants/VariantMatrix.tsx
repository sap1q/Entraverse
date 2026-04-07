"use client";

import { useEffect, useMemo, useState } from "react";
import { useVariantMatrix } from "@/hooks/useVariantMatrix";
import type { VariantAttribute, VariantCombination } from "@/types/product.types";
import VariantCombinationGenerator from "@/components/features/products/variants/VariantCombinationGenerator";
import VariantPriceCell from "@/components/features/products/variants/VariantPriceCell";

type VariantMatrixProps = {
  initialAttributes?: VariantAttribute[];
  productCode?: string;
  onVariantsChange?: (variants: VariantCombination[]) => void;
};

export default function VariantMatrix({
  initialAttributes = [],
  productCode = "PRD",
  onVariantsChange,
}: VariantMatrixProps) {
  const { attributes, setAttributes, variants, syncGenerated, updateVariant, bulkUpdate, copyPriceFrom } =
    useVariantMatrix(initialAttributes, productCode);

  const [bulkPrice, setBulkPrice] = useState(0);
  const [bulkStock, setBulkStock] = useState(0);
  const previewColumns = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((variant) => Object.keys(variant.attributes).forEach((key) => set.add(key)));
    return [...set];
  }, [variants]);

  useEffect(() => {
    onVariantsChange?.(variants);
  }, [onVariantsChange, variants]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-800">Variant Matrix</h2>

      <VariantCombinationGenerator attributes={attributes} setAttributes={setAttributes} onGenerate={syncGenerated} />

      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          min={0}
          className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-sm"
          placeholder="Bulk harga"
          value={bulkPrice}
          onChange={(e) => setBulkPrice(Number(e.target.value) || 0)}
        />
        <input
          type="number"
          min={0}
          className="h-10 w-36 rounded-lg border border-slate-200 px-3 text-sm"
          placeholder="Bulk stok"
          value={bulkStock}
          onChange={(e) => setBulkStock(Number(e.target.value) || 0)}
        />
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => bulkUpdate({ price: bulkPrice, stock: bulkStock })}>
          Apply Bulk
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          onClick={() => {
            if (variants.length > 0) copyPriceFrom(variants[0].id);
          }}
        >
          Copy Harga Varian 1
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {previewColumns.map((column) => (
                <th key={column} className="px-3 py-2 text-left">{column}</th>
              ))}
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Harga</th>
              <th className="px-3 py-2 text-left">Stok</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className="border-t">
                {previewColumns.map((column) => (
                  <td key={column} className="px-3 py-2">{variant.attributes[column] ?? "-"}</td>
                ))}
                <td className="px-3 py-2 font-mono text-xs">{variant.sku}</td>
                <td className="px-3 py-2">
                  <VariantPriceCell value={variant.price} onChange={(price) => updateVariant(variant.id, { price })} />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={variant.stock}
                    onChange={(e) => updateVariant(variant.id, { stock: Number(e.target.value) || 0 })}
                    className="h-9 w-24 rounded-md border border-slate-200 px-2 text-right"
                  />
                </td>
              </tr>
            ))}
            {variants.length === 0 ? (
              <tr>
                <td colSpan={previewColumns.length + 3} className="px-3 py-6 text-center text-slate-500">
                  Belum ada kombinasi varian. Tambahkan atribut lalu klik Generate Kombinasi.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
