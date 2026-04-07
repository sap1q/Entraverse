"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Package } from "lucide-react";
import PricingMatrixTable from "@/src/components/product/PricingMatrixTable";
import type {
  MatrixPricing,
  ProductFormState,
  VariantCombination,
} from "@/src/types/product";
import BasicInfoSection from "@/src/components/products/BasicInfoSection";
import MediaSection from "@/src/components/products/MediaSection";
import VariantManager from "@/src/components/products/VariantManager";

type AddProductFormLayoutProps = {
  form: ProductFormState;
  combinations: VariantCombination[];
  inputClassName: string;
  isSaving: boolean;
  saveMessage: string;
  payloadPreview: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBasicFieldChange: <K extends keyof ProductFormState["basic"]>(
    field: K,
    value: ProductFormState["basic"][K]
  ) => void;
  onPhotoChange: (slotIndex: number, file: File | null) => void;
  onDescriptionChange: (value: string) => void;
  onInventoryFieldChange: (
    field: keyof ProductFormState["inventoryPlan"],
    value: number
  ) => void;
  onToggleTradeIn: () => void;
  onAddVariant: () => void;
  onRemoveVariant: (variantId: string) => void;
  onUpdateVariantName: (variantId: string, value: string) => void;
  onUpdateDraftOption: (variantId: string, value: string) => void;
  onAddVariantOption: (variantId: string) => void;
  onRemoveVariantOption: (variantId: string, option: string) => void;
  onUpdateMatrixField: (
    key: string,
    field: keyof MatrixPricing,
    value: number | string
  ) => void;
};

export default function AddProductFormLayout({
  form,
  combinations,
  inputClassName,
  isSaving,
  saveMessage,
  payloadPreview,
  onSubmit,
  onBasicFieldChange,
  onPhotoChange,
  onDescriptionChange,
  onInventoryFieldChange,
  onToggleTradeIn,
  onAddVariant,
  onRemoveVariant,
  onUpdateVariantName,
  onUpdateDraftOption,
  onAddVariantOption,
  onRemoveVariantOption,
  onUpdateMatrixField,
}: AddProductFormLayoutProps) {
  const variants = form.variants ?? [];
  const combinationsData = combinations ?? [];
  const matrixData = form.matrix ?? {};

  return (
    <div className="mx-auto w-full max-w-7xl">
      <form onSubmit={onSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Tambah Produk</h1>
            <p className="mt-1 text-sm text-slate-500">Perbarui detail produk dan varian Anda.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/master-produk"
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Batalkan
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <BasicInfoSection
            basic={form.basic}
            inputClassName={inputClassName}
            onBasicFieldChange={onBasicFieldChange}
          />

          <MediaSection photos={form.photos} onPhotoChange={onPhotoChange} />

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-800">Deskripsi</h2>
            <textarea
              value={form.description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className={`${inputClassName} min-h-40`}
              placeholder="Tulis detail produk..."
            />
          </section>

          <section className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/30 p-4">
            <h2 className="text-xl font-semibold text-slate-800">Parameter Perencanaan Stok</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  <Package className="mr-1 inline h-4 w-4" /> Berat (gram)
                </label>
                <input
                  type="number"
                  value={form.inventoryPlan.weight}
                  onChange={(event) => onInventoryFieldChange("weight", Number(event.target.value))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Panjang (cm)</label>
                <input
                  type="number"
                  value={form.inventoryPlan.length}
                  onChange={(event) => onInventoryFieldChange("length", Number(event.target.value))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Lebar (cm)</label>
                <input
                  type="number"
                  value={form.inventoryPlan.width}
                  onChange={(event) => onInventoryFieldChange("width", Number(event.target.value))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tinggi (cm)</label>
                <input
                  type="number"
                  value={form.inventoryPlan.height}
                  onChange={(event) => onInventoryFieldChange("height", Number(event.target.value))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Volume (m³)</label>
                <input
                  type="number"
                  value={form.inventoryPlan.volume}
                  onChange={(event) => onInventoryFieldChange("volume", Number(event.target.value))}
                  className={inputClassName}
                />
              </div>
            </div>
          </section>

          <section className="flex items-center justify-between rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Trade-In</h2>
              <p className="text-sm text-slate-600">
                Aktifkan trade-in agar produk dapat ditukar dengan barang lama.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleTradeIn}
              className={`relative h-8 w-14 rounded-full transition ${
                form.tradeIn ? "bg-blue-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition ${
                  form.tradeIn ? "left-7" : "left-1"
                }`}
              />
            </button>
          </section>

          <VariantManager
            variants={variants}
            inputClassName={inputClassName}
            onAddVariant={onAddVariant}
            onRemoveVariant={onRemoveVariant}
            onUpdateVariantName={onUpdateVariantName}
            onUpdateDraftOption={onUpdateDraftOption}
            onAddVariantOption={onAddVariantOption}
            onRemoveVariantOption={onRemoveVariantOption}
          />

          <PricingMatrixTable
            combinations={combinationsData}
            matrixData={matrixData}
            updateMatrixField={onUpdateMatrixField}
          />
        </div>

        {saveMessage && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              saveMessage.includes("berhasil")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {saveMessage}
          </div>
        )}

        {payloadPreview && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-slate-700">Preview Payload JSON</p>
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              {payloadPreview}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
