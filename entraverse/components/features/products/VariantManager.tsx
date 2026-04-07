"use client";

import { Plus, X } from "lucide-react";
import type { VariantDefinition } from "@/types/product";

type VariantManagerProps = {
  variants: VariantDefinition[];
  onAddVariant: () => void;
  onRemoveVariant: (variantId: string) => void;
  onUpdateVariantName: (variantId: string, value: string) => void;
  onUpdateDraftOption: (variantId: string, value: string) => void;
  onAddVariantOption: (variantId: string) => void;
  onRemoveVariantOption: (variantId: string, option: string) => void;
};

export default function VariantManager({
  variants,
  onAddVariant,
  onRemoveVariant,
  onUpdateVariantName,
  onUpdateDraftOption,
  onAddVariantOption,
  onRemoveVariantOption,
}: VariantManagerProps) {
  const inputClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white";
  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500";

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Varian Produk</h2>
        <button
          type="button"
          onClick={onAddVariant}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Varian
        </button>
      </div>

      <div className="space-y-4">
        {variants.map((variant) => (
          <div key={variant.id} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-3">
                <label className={labelClass}>Nama Varian</label>
                <input
                  value={variant.name}
                  onChange={(event) => onUpdateVariantName(variant.id, event.target.value)}
                  className={inputClassName}
                  placeholder="Contoh: Ukuran, Warna"
                />
              </div>
              <div className="md:col-span-9">
                <label className={labelClass}>Opsi Varian</label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {variant.options.map((option) => (
                    <span
                      key={option}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => onRemoveVariantOption(variant.id, option)}
                        className="ml-1 rounded-full p-0.5 text-blue-500 hover:bg-blue-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={variant.draftOption}
                    onChange={(event) => onUpdateDraftOption(variant.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onAddVariantOption(variant.id);
                      }
                    }}
                    className={`${inputClassName} flex-1`}
                    placeholder="Tambah opsi (tekan Enter)"
                  />
                  <button
                    type="button"
                    onClick={() => onAddVariantOption(variant.id)}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Tambah
                  </button>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveVariant(variant.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
