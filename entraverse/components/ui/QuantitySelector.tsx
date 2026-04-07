"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const QuantitySelector = ({
  value,
  onChange,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  className,
}: QuantitySelectorProps) => {
  const safeValue = Number.isFinite(value) ? value : min;

  const decrement = () => onChange(Math.max(min, safeValue - 1));
  const increment = () => onChange(Math.min(max, safeValue + 1));

  return (
    <div className={cn("inline-flex items-center rounded-xl border border-slate-200 bg-white", className)}>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        onClick={decrement}
        disabled={safeValue <= min}
        aria-label="Kurangi jumlah"
      >
        <Minus className="h-4 w-4" />
      </button>

      <input
        type="number"
        min={min}
        max={max}
        value={safeValue}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isFinite(parsed)) return;
          onChange(Math.min(max, Math.max(min, Math.floor(parsed))));
        }}
        className="h-10 w-14 border-x border-slate-200 text-center text-sm font-semibold text-slate-900 outline-none"
      />

      <button
        type="button"
        className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        onClick={increment}
        disabled={safeValue >= max}
        aria-label="Tambah jumlah"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};
