"use client";

type VariantPriceCellProps = {
  value: number;
  onChange: (next: number) => void;
};

export default function VariantPriceCell({ value, onChange }: VariantPriceCellProps) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="h-9 w-28 rounded-md border border-slate-200 px-2 text-right text-sm"
    />
  );
}
