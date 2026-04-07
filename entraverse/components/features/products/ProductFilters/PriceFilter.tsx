"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useProductFilters } from "@/hooks/useProductFilters";

const normalizeNumberInput = (value: string): string => {
  return value.replace(/[^\d]/g, "");
};

const toOptionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export const PriceFilter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const minInputRef = useRef<HTMLInputElement | null>(null);
  const maxInputRef = useRef<HTMLInputElement | null>(null);
  const { getFilterValue, setRangeFilter } = useProductFilters();
  const currentPriceMin = getFilterValue("price_min") ?? "";
  const currentPriceMax = getFilterValue("price_max") ?? "";
  const inputResetKey = `${currentPriceMin}-${currentPriceMax}`;

  const applyRange = () => {
    const rawMin = minInputRef.current?.value ?? "";
    const rawMax = maxInputRef.current?.value ?? "";
    const parsedMin = toOptionalNumber(rawMin);
    const parsedMax = toOptionalNumber(rawMax);

    if (parsedMin !== undefined && parsedMax !== undefined && parsedMin > parsedMax) {
      setRangeFilter("price", parsedMax, parsedMin);

      if (minInputRef.current) minInputRef.current.value = String(parsedMax);
      if (maxInputRef.current) maxInputRef.current.value = String(parsedMin);
      return;
    }

    setRangeFilter("price", parsedMin, parsedMax);
  };

  const clearRange = () => {
    if (minInputRef.current) minInputRef.current.value = "";
    if (maxInputRef.current) maxInputRef.current.value = "";
    setRangeFilter("price", undefined, undefined);
  };

  return (
    <section className="border-b border-slate-200 pb-5">
      <button
        type="button"
        onClick={() => setIsOpen((state) => !state)}
        className="flex w-full items-center justify-between text-slate-800 hover:text-slate-600"
      >
        <span className="text-sm font-semibold tracking-wide">RENTANG HARGA</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-300">
            <span className="text-sm font-semibold text-slate-400">Rp</span>
            <input
              key={`price-min-${inputResetKey}`}
              ref={minInputRef}
              type="text"
              inputMode="numeric"
              defaultValue={currentPriceMin}
              onChange={(event) => {
                event.target.value = normalizeNumberInput(event.target.value);
              }}
              placeholder="Harga minimum"
              className="w-full bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <label className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-300">
            <span className="text-sm font-semibold text-slate-400">Rp</span>
            <input
              key={`price-max-${inputResetKey}`}
              ref={maxInputRef}
              type="text"
              inputMode="numeric"
              defaultValue={currentPriceMax}
              onChange={(event) => {
                event.target.value = normalizeNumberInput(event.target.value);
              }}
              placeholder="Harga maksimum"
              className="w-full bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyRange}
              className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={clearRange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
