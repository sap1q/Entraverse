"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { useCategoryOptions } from "@/hooks/useCategories";
import CategoryIcon from "@/components/ui/CategoryIcon";

interface CategoryDropdownProps {
  value?: string;
  onChange: (categoryId: string, categoryName: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function CategoryDropdown({ value, onChange, error, disabled }: CategoryDropdownProps) {
  const { categories, loading, error: loadError } = useCategoryOptions();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === value) ?? null,
    [categories, value]
  );

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, search]);

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
        aria-label="Pilih kategori"
      >
        <span className="flex items-center justify-between gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat kategori...
            </span>
          ) : selectedCategory ? (
            <span className="inline-flex items-center gap-2">
              <CategoryIcon icon={selectedCategory.icon ?? selectedCategory.icon_url ?? selectedCategory.icon_svg} />
              {selectedCategory.name}
            </span>
          ) : (
            <span className="text-slate-400">Pilih Kategori</span>
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
                placeholder="Cari kategori..."
                autoFocus
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
              />
            </label>
          </div>

          <div className="max-h-60 overflow-auto">
            {filteredCategories.length === 0 ? (
              <p className="px-3 py-3 text-sm text-slate-500">Kategori tidak ditemukan</p>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onChange(category.id, category.name);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                >
                  <CategoryIcon icon={category.icon ?? category.icon_url ?? category.icon_svg} />
                  <span>{category.name}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    Margin: {(category.margin_percent ?? category.min_margin)}%
                  </span>
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
