"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search, Tag } from "lucide-react";
import { useBrandOptions } from "@/hooks/useBrands";

interface BrandDropdownProps {
  value?: string;
  fallbackLabel?: string;
  onChange: (brandId: string, brandName: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function BrandDropdown({
  value,
  fallbackLabel,
  onChange,
  error,
  disabled,
}: BrandDropdownProps) {
  const { brands, loading, error: loadError } = useBrandOptions();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedBrand = useMemo(() => brands.find((brand) => brand.id === value) ?? null, [brands, value]);

  const displayLabel = selectedBrand?.name ?? fallbackLabel?.trim() ?? "";

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return brands;
    return brands.filter((brand) => brand.name.toLowerCase().includes(query));
  }, [brands, search]);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-12 w-full rounded-xl border px-4 text-left text-sm transition ${
          error
            ? "border-rose-300 bg-rose-50 text-rose-700"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white focus:border-blue-300"
        } ${disabled || loading ? "cursor-not-allowed opacity-70" : ""}`}
        disabled={disabled || loading}
        aria-label="Pilih brand"
      >
        <span className="flex items-center justify-between gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat brand...
            </span>
          ) : displayLabel ? (
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-500" />
              {displayLabel}
            </span>
          ) : (
            <span className="text-slate-400">Pilih Brand</span>
          )}
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen ? (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-2 pb-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500">
              <Search className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari brand..."
                autoFocus
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
              />
            </label>
          </div>

          <div className="max-h-60 overflow-auto">
            {filteredBrands.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-500">Brand tidak ditemukan</p>
            ) : (
              filteredBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => {
                    onChange(brand.id, brand.name);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                >
                  <Tag className="h-4 w-4 text-slate-500" />
                  <span>{brand.name}</span>
                  <span className="ml-auto text-xs text-slate-500">Produk: {brand.product_count}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {loadError ? <p className="mt-1 text-xs text-rose-600">{loadError}</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

