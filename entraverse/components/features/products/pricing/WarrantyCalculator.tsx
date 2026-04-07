"use client";

type WarrantyCalculatorProps = {
  warrantyCostPercent: number;
  warrantyProfitPercent: number;
  shippingNewCost: number;
  onChange: (field: "warrantyCostPercent" | "warrantyProfitPercent" | "shippingNewCost", value: number) => void;
};

export default function WarrantyCalculator({
  warrantyCostPercent,
  warrantyProfitPercent,
  shippingNewCost,
  onChange,
}: WarrantyCalculatorProps) {
  const inputClass = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-xs">
        <span>Biaya Garansi (%)</span>
        <input type="number" min={0} className={inputClass} value={warrantyCostPercent} onChange={(e) => onChange("warrantyCostPercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Keuntungan Garansi (%)</span>
        <input type="number" min={0} className={inputClass} value={warrantyProfitPercent} onChange={(e) => onChange("warrantyProfitPercent", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Biaya Pengiriman Barang Baru</span>
        <input type="number" min={0} className={inputClass} value={shippingNewCost} onChange={(e) => onChange("shippingNewCost", Number(e.target.value) || 0)} />
      </label>
    </div>
  );
}
