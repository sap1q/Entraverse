"use client";

type ShippingCostInputProps = {
  weightKg: number;
  volumeCbm: number;
  shippingAirRate: number;
  shippingSeaRate: number;
  onChange: (field: "weightKg" | "volumeCbm" | "shippingAirRate" | "shippingSeaRate", value: number) => void;
};

export default function ShippingCostInput({
  weightKg,
  volumeCbm,
  shippingAirRate,
  shippingSeaRate,
  onChange,
}: ShippingCostInputProps) {
  const inputClass = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs">
        <span>Berat (Kg)</span>
        <input type="number" min={0} className={inputClass} value={weightKg} onChange={(e) => onChange("weightKg", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Volume (CBM)</span>
        <input type="number" min={0} step="0.001" className={inputClass} value={volumeCbm} onChange={(e) => onChange("volumeCbm", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Ongkir Air / Kg</span>
        <input type="number" min={0} className={inputClass} value={shippingAirRate} onChange={(e) => onChange("shippingAirRate", Number(e.target.value) || 0)} />
      </label>
      <label className="space-y-1 text-xs">
        <span>Ongkir Sea / CBM</span>
        <input type="number" min={0} className={inputClass} value={shippingSeaRate} onChange={(e) => onChange("shippingSeaRate", Number(e.target.value) || 0)} />
      </label>
    </div>
  );
}
