"use client";

import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import type { FocusEvent } from "react";
import type { MatrixPricing, VariantCombination } from "@/types/product";
import type { PhotoSlot } from "@/types/product";
import { getWarrantyVariantValue } from "@/lib/product-variant-order";
import { calculateFinalBeli } from "@/lib/utils";

type VariantRowProps = {
  combo: VariantCombination;
  row: MatrixPricing;
  sharedImageKey: string;
  sharedImageLabel: string;
  variantImage: PhotoSlot;
  variantImageError?: string;
  onUpdateField: (key: string, field: keyof MatrixPricing, value: number | string) => void;
  onVariantImageChange: (imageKey: string, file: File | null) => void;
  onVariantImageRemove: (imageKey: string) => void;
  selected: boolean;
  onSelect: () => void;
  isExchangeValueEditable?: boolean;
};

const inputBase =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-300";
const channelPriceCellClass = "min-w-[170px] px-2 py-2";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const rupiahFormatter = new Intl.NumberFormat("id-ID");

const formatRupiahInput = (value: number): string => rupiahFormatter.format(Math.max(0, Number(value) || 0));
const parseRupiahInput = (value: string): number => {
  const digits = value.replace(/[^\d]/g, "");
  if (digits === "") return 0;
  return Number(digits) || 0;
};
const resolvePurchaseCurrencySymbol = (currency: string): string => {
  const normalized = String(currency).toUpperCase();

  if (normalized === "IDR") return "Rp";
  if (normalized === "CNY") return "¥";
  if (normalized === "EUR") return "EUR";
  if (normalized === "AUD") return "A$";
  return "$";
};

const RupiahInput = ({
  value,
  onChange,
  readOnly = false,
  className = "",
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
}) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
      Rp
    </span>
    <input
      type="text"
      inputMode="numeric"
      readOnly={readOnly}
      className={`${inputBase} pl-10 pr-3 text-right tabular-nums ${readOnly ? "cursor-not-allowed bg-blue-50 text-blue-700" : ""} ${className}`}
      value={formatRupiahInput(value)}
      onFocus={readOnly ? undefined : handleNumericFocus}
      onChange={(event) => onChange?.(parseRupiahInput(event.target.value))}
    />
  </div>
);

const toDateInputValue = (value: string): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "-") return "";
  return DATE_REGEX.test(trimmed) ? trimmed : "";
};

const formatWeightGram = (gramValue: number): string => {
  const safeGram = Math.max(0, Number(gramValue) || 0);
  if (!Number.isFinite(safeGram)) return "0";
  return String(Math.round(safeGram));
};

const handleNumericFocus = (event: FocusEvent<HTMLInputElement>) => {
  if (event.currentTarget.value === "0") {
    event.currentTarget.select();
  }
};

const StatusBadge = ({ status }: { status: MatrixPricing["procurementStatus"] }) => {
  const styles: Record<MatrixPricing["procurementStatus"], string> = {
    Normal: "bg-green-100 text-green-800",
    "Low Stock": "bg-yellow-100 text-yellow-800",
    "Out of Stock": "bg-red-100 text-red-800",
  };

  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>{status}</span>;
};

export default function VariantRow({
  combo,
  row,
  sharedImageKey,
  sharedImageLabel,
  variantImage,
  variantImageError = "",
  onUpdateField,
  onVariantImageChange,
  onVariantImageRemove,
  selected,
  onSelect,
  isExchangeValueEditable = true,
}: VariantRowProps) {
  const purchaseCurrencySymbol = resolvePurchaseCurrencySymbol(row.currency);
  const warrantyLabel = getWarrantyVariantValue(combo.values);
  const warrantyBadgeTone = warrantyLabel?.toLowerCase().includes("tanpa")
    ? "border-slate-200 bg-slate-100 text-slate-600"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const stockoutDateA = toDateInputValue(row.stockoutDateA);
  const stockoutDateB = toDateInputValue(row.stockoutDateB);
  const startDate = toDateInputValue(row.startDate);
  const uploadInputId = `variant-image-${sharedImageKey.replace(/[^a-z0-9_-]/gi, "-")}-${combo.key.replace(/[^a-z0-9_-]/gi, "-")}`;
  const hasVariantImage = Boolean(variantImage.preview);
  const stopRowSelect = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const handleDateChange = (field: keyof MatrixPricing, value: string) => {
    if (!value) {
      onUpdateField(combo.key, field, "");
      return;
    }

    if (DATE_REGEX.test(value)) {
      onUpdateField(combo.key, field, value);
    }
  };

  return (
    <tr onClick={onSelect} className={`border-t border-slate-100 align-top ${selected ? "bg-blue-50/40" : ""}`}>
      <td className="sticky left-0 z-10 min-w-[280px] bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[4px_0_8px_rgba(0,0,0,0.04)]">
        <div>
          <div className="rounded-2xl border border-transparent bg-white p-3">
            <div className="flex items-center gap-3">
              <label
                htmlFor={uploadInputId}
                onClick={stopRowSelect}
                className="group relative flex h-[76px] w-[76px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-slate-50 shadow-sm transition hover:border-blue-200"
              >
                {hasVariantImage ? (
                  <>
                    <Image
                      src={variantImage.preview}
                      alt={`Foto varian ${sharedImageLabel}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 opacity-0 transition group-hover:opacity-100">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-700/90 text-white shadow-lg backdrop-blur">
                        <Pencil className="h-3.5 w-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onVariantImageRemove(sharedImageKey);
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-500/95 text-white shadow-lg backdrop-blur transition hover:bg-rose-600"
                        aria-label={`Hapus foto varian ${sharedImageLabel}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_58%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-3 text-center">
                    <ImagePlus className="h-4 w-4 text-slate-400" />
                    <span className="mt-1 text-[10px] font-semibold text-slate-500">Upload</span>
                  </div>
                )}
              </label>
              <input
                id={uploadInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onVariantImageChange(sharedImageKey, event.target.files?.[0] ?? null)}
              />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Foto Memori</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{sharedImageLabel}</p>
                {warrantyLabel ? (
                  <span
                    className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${warrantyBadgeTone}`}
                  >
                    {warrantyLabel}
                  </span>
                ) : null}
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {hasVariantImage ? "Foto tersimpan" : "Hover atau klik untuk upload"}
                </p>
                {variantImageError ? (
                  <p className="mt-1.5 text-[10px] font-normal text-rose-600">{variantImageError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="min-w-[140px] px-2 py-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
            {purchaseCurrencySymbol}
          </span>
          <input
            type="text"
            inputMode="numeric"
            className={`${inputBase} pl-10 text-right tabular-nums`}
            value={formatRupiahInput(row.purchasePrice)}
            onFocus={handleNumericFocus}
            onChange={(e) => onUpdateField(combo.key, "purchasePrice", parseRupiahInput(e.target.value))}
          />
        </div>
      </td>
      <td className="min-w-[120px] px-2 py-2">
        <select className={inputBase} value={row.currency} onChange={(e) => onUpdateField(combo.key, "currency", e.target.value)}>
          <option value="SGD">SGD</option>
          <option value="USD">USD</option>
          <option value="AUD">AUD</option>
          <option value="EUR">EUR</option>
          <option value="IDR">IDR</option>
          <option value="CNY">CNY</option>
        </select>
      </td>
      <td className="min-w-[150px] px-2 py-2">
        <RupiahInput
          value={row.exchangeValue}
          readOnly={!isExchangeValueEditable}
          className={isExchangeValueEditable ? "" : "bg-slate-100 text-slate-500"}
          onChange={(value) => onUpdateField(combo.key, "exchangeValue", value)}
        />
      </td>
      <td className="min-w-[130px] px-2 py-2">
        <select className={inputBase} value={row.shipping} onChange={(e) => onUpdateField(combo.key, "shipping", e.target.value)}>
          <option value="Udara">Udara</option>
          <option value="Laut">Laut</option>
          <option value="Darat">Darat</option>
        </select>
      </td>
      <td className="min-w-[150px] px-2 py-2">
        <RupiahInput
          value={row.arrivalCost}
          readOnly
        />
      </td>
      <td className="min-w-[170px] px-2 py-2">
        <RupiahInput
          value={calculateFinalBeli(row)}
          readOnly
        />
      </td>
      <td className={channelPriceCellClass}>
        <RupiahInput
          value={row.offlinePrice}
          onChange={(value) => onUpdateField(combo.key, "offlinePrice", value)}
        />
      </td>
      <td className={channelPriceCellClass}>
        <RupiahInput
          value={row.entraversePrice}
          onChange={(value) => onUpdateField(combo.key, "entraversePrice", value)}
        />
      </td>
      <td className={channelPriceCellClass}>
        <RupiahInput
          value={row.tokopediaPrice}
          onChange={(value) => onUpdateField(combo.key, "tokopediaPrice", value)}
        />
      </td>
      <td className={channelPriceCellClass}>
        <RupiahInput
          value={row.shopeePrice}
          onChange={(value) => onUpdateField(combo.key, "shopeePrice", value)}
        />
      </td>
      <td className="min-w-[72px] px-1.5 py-2">
        <input
          type="number"
          min={0}
          className={`${inputBase} px-2 text-center`}
          value={row.stock}
          onFocus={handleNumericFocus}
          onChange={(e) => onUpdateField(combo.key, "stock", Number(e.target.value))}
        />
      </td>
      <td className="min-w-[150px] px-2 py-2"><input className={inputBase} value={row.skuSeller} onChange={(e) => onUpdateField(combo.key, "skuSeller", e.target.value)} /></td>
      <td className="min-w-[120px] px-2 py-2">
        <div className="relative">
          <input
            readOnly
            disabled
            type="text"
            className={`${inputBase} cursor-not-allowed bg-slate-100 pr-12 text-slate-500 disabled:opacity-100`}
            value={formatWeightGram(row.itemWeight)}
            title="Berat mengikuti Parameter Perencanaan Stok"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
            gram
          </span>
        </div>
      </td>
      <td className="min-w-[220px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.avgSalesA} onFocus={handleNumericFocus} onChange={(e) => onUpdateField(combo.key, "avgSalesA", Number(e.target.value))} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="date" className={inputBase} value={stockoutDateA} onChange={(e) => handleDateChange("stockoutDateA", e.target.value)} /></td>
      <td className="min-w-[220px] px-2 py-2"><input className={inputBase} value={row.stockoutFactorA} onChange={(e) => onUpdateField(combo.key, "stockoutFactorA", e.target.value)} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.avgSalesB} onFocus={handleNumericFocus} onChange={(e) => onUpdateField(combo.key, "avgSalesB", Number(e.target.value))} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="date" className={inputBase} value={stockoutDateB} onChange={(e) => handleDateChange("stockoutDateB", e.target.value)} /></td>
      <td className="min-w-[220px] px-2 py-2"><input className={inputBase} value={row.stockoutFactorB} onChange={(e) => onUpdateField(combo.key, "stockoutFactorB", e.target.value)} /></td>
      <td className="min-w-[230px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.avgDailyFinal} /></td>
      <td className="min-w-[130px] px-2 py-2"><input type="date" className={inputBase} value={startDate} onChange={(e) => handleDateChange("startDate", e.target.value)} /></td>
      <td className="min-w-[170px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.predictedInitialStock} onFocus={handleNumericFocus} onChange={(e) => onUpdateField(combo.key, "predictedInitialStock", Number(e.target.value))} /></td>
      <td className="min-w-[150px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.leadTime} onFocus={handleNumericFocus} onChange={(e) => onUpdateField(combo.key, "leadTime", Number(e.target.value))} /></td>
      <td className="min-w-[140px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.reorderPoint} /></td>
      <td className="min-w-[160px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.need15Days} /></td>
      <td className="min-w-[190px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.inTransitStock} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.nextProcurement} onFocus={handleNumericFocus} onChange={(e) => onUpdateField(combo.key, "nextProcurement", Number(e.target.value))} /></td>
      <td className="min-w-[140px] px-2 py-3"><StatusBadge status={row.procurementStatus} /></td>
    </tr>
  );
}
