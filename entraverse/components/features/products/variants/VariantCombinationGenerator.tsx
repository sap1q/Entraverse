"use client";

import type { VariantAttribute } from "@/types/product.types";

type VariantCombinationGeneratorProps = {
  attributes: VariantAttribute[];
  setAttributes: (next: VariantAttribute[]) => void;
  onGenerate: () => void;
};

export default function VariantCombinationGenerator({
  attributes,
  setAttributes,
  onGenerate,
}: VariantCombinationGeneratorProps) {
  const updateAttribute = (index: number, patch: Partial<VariantAttribute>) => {
    const next = [...attributes];
    next[index] = { ...next[index], ...patch };
    setAttributes(next);
  };

  const addAttribute = () => setAttributes([...attributes, { name: "", values: [] }]);
  const removeAttribute = (index: number) => setAttributes(attributes.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {attributes.map((attribute, index) => (
        <div key={`${attribute.name}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Nama atribut (contoh: Warna)"
            value={attribute.name}
            onChange={(e) => updateAttribute(index, { name: e.target.value })}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Nilai dipisah koma (Merah,Biru,Hitam)"
            value={attribute.values.join(",")}
            onChange={(e) =>
              updateAttribute(index, {
                values: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
          <button type="button" onClick={() => removeAttribute(index)} className="h-10 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm text-rose-700">
            Hapus
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button type="button" onClick={addAttribute} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          Tambah Atribut
        </button>
        <button type="button" onClick={onGenerate} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
          Generate Kombinasi
        </button>
      </div>
    </div>
  );
}
