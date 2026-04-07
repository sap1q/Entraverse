"use client";

import type { ProductBasicInfo } from "@/src/types/product";

type BasicInfoSectionProps = {
  basic: ProductBasicInfo;
  inputClassName: string;
  onBasicFieldChange: <K extends keyof ProductBasicInfo>(field: K, value: ProductBasicInfo[K]) => void;
};

export default function BasicInfoSection({
  basic,
  inputClassName,
  onBasicFieldChange,
}: BasicInfoSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Informasi Dasar</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nama Produk</label>
          <input
            value={basic.name}
            onChange={(event) => onBasicFieldChange("name", event.target.value)}
            className={inputClassName}
            placeholder="Masukkan nama produk"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kategori</label>
          <input
            value={basic.category}
            onChange={(event) => onBasicFieldChange("category", event.target.value)}
            className={inputClassName}
            placeholder="Virtual Reality"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
          <input
            value={basic.brand}
            onChange={(event) => onBasicFieldChange("brand", event.target.value)}
            className={inputClassName}
            placeholder="Masukkan brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">SPU (SKU Induk)</label>
          <input
            value={basic.spu}
            onChange={(event) => onBasicFieldChange("spu", event.target.value)}
            className={inputClassName}
            placeholder="Masukkan SPU produk"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status Produk</label>
          <select
            value={basic.status}
            onChange={(event) =>
              onBasicFieldChange("status", event.target.value as ProductBasicInfo["status"])
            }
            className={inputClassName}
          >
            <option value="active">Aktif</option>
            <option value="pending_approval">Menunggu Persetujuan</option>
            <option value="inactive">Non Aktif</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Barcode</label>
          <input
            value={basic.barcode}
            onChange={(event) => onBasicFieldChange("barcode", event.target.value)}
            className={inputClassName}
            placeholder="Masukkan barcode produk"
          />
        </div>
      </div>
    </section>
  );
}
