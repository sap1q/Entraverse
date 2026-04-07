"use client";

import type { MatrixPricing, VariantCombination } from "@/types/product";
import { calculateFinalBeli } from "@/lib/utils";

type VariantRowProps = {
  combo: VariantCombination;
  row: MatrixPricing;
  onUpdateField: (key: string, field: keyof MatrixPricing, value: number | string) => void;
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
      onChange={(event) => onChange?.(parseRupiahInput(event.target.value))}
    />
  </div>
);

const toDateInputValue = (value: string): string => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "-") return "";
  return DATE_REGEX.test(trimmed) ? trimmed : "";
};

const formatWeightKg = (gramValue: number): string => {
  const safeGram = Math.max(0, Number(gramValue) || 0);
  const kg = safeGram / 1000;
  if (!Number.isFinite(kg)) return "0";
  return kg.toFixed(3).replace(/\.?0+$/, "");
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
  onUpdateField,
  selected,
  onSelect,
  isExchangeValueEditable = true,
}: VariantRowProps) {
  const stockoutDateA = toDateInputValue(row.stockoutDateA);
  const stockoutDateB = toDateInputValue(row.stockoutDateB);
  const startDate = toDateInputValue(row.startDate);

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
      <td className="sticky left-0 z-10 min-w-[240px] bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[4px_0_8px_rgba(0,0,0,0.04)]">
        {combo.label}
      </td>
      <td className="min-w-[140px] px-2 py-2">
        <input
          type="number"
          min={0}
          className={inputBase}
          value={row.purchasePrice}
          onChange={(e) => onUpdateField(combo.key, "purchasePrice", Number(e.target.value))}
        />
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
      <td className="min-w-[100px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.stock} onChange={(e) => onUpdateField(combo.key, "stock", Number(e.target.value))} /></td>
      <td className="min-w-[150px] px-2 py-2"><input className={inputBase} value={row.skuSeller} onChange={(e) => onUpdateField(combo.key, "skuSeller", e.target.value)} /></td>
      <td className="min-w-[130px] px-2 py-2">
        <div className="relative">
          <input
            readOnly
            disabled
            type="text"
            className={`${inputBase} cursor-not-allowed bg-slate-100 pr-12 text-slate-500 disabled:opacity-100`}
            value={formatWeightKg(row.itemWeight)}
            title="Berat mengikuti Parameter Perencanaan Stok"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
            KG
          </span>
        </div>
      </td>
      <td className="min-w-[220px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.avgSalesA} onChange={(e) => onUpdateField(combo.key, "avgSalesA", Number(e.target.value))} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="date" className={inputBase} value={stockoutDateA} onChange={(e) => handleDateChange("stockoutDateA", e.target.value)} /></td>
      <td className="min-w-[220px] px-2 py-2"><input className={inputBase} value={row.stockoutFactorA} onChange={(e) => onUpdateField(combo.key, "stockoutFactorA", e.target.value)} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.avgSalesB} onChange={(e) => onUpdateField(combo.key, "avgSalesB", Number(e.target.value))} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="date" className={inputBase} value={stockoutDateB} onChange={(e) => handleDateChange("stockoutDateB", e.target.value)} /></td>
      <td className="min-w-[220px] px-2 py-2"><input className={inputBase} value={row.stockoutFactorB} onChange={(e) => onUpdateField(combo.key, "stockoutFactorB", e.target.value)} /></td>
      <td className="min-w-[230px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.avgDailyFinal} /></td>
      <td className="min-w-[130px] px-2 py-2"><input type="date" className={inputBase} value={startDate} onChange={(e) => handleDateChange("startDate", e.target.value)} /></td>
      <td className="min-w-[170px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.predictedInitialStock} onChange={(e) => onUpdateField(combo.key, "predictedInitialStock", Number(e.target.value))} /></td>
      <td className="min-w-[150px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.leadTime} onChange={(e) => onUpdateField(combo.key, "leadTime", Number(e.target.value))} /></td>
      <td className="min-w-[140px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.reorderPoint} /></td>
      <td className="min-w-[160px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.need15Days} /></td>
      <td className="min-w-[190px] px-2 py-2"><input readOnly className={`${inputBase} bg-blue-50 text-blue-700`} value={row.inTransitStock} /></td>
      <td className="min-w-[220px] px-2 py-2"><input type="number" min={0} className={inputBase} value={row.nextProcurement} onChange={(e) => onUpdateField(combo.key, "nextProcurement", Number(e.target.value))} /></td>
      <td className="min-w-[140px] px-2 py-3"><StatusBadge status={row.procurementStatus} /></td>
    </tr>
  );
}
