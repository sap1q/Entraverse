"use client";

import { cn } from "@/lib/utils";
import type { ProductVariantGroup } from "@/types/product.types";

interface ProductVariantSelectorProps {
  variants: ProductVariantGroup[];
  selectedVariants: Record<string, string>;
  onChange: (groupName: string, option: string) => void;
}

export const ProductVariantSelector = ({
  variants,
  selectedVariants,
  onChange,
}: ProductVariantSelectorProps) => {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-4">
      {variants.map((group) => (
        <div key={group.name}>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">{group.name}</h3>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => {
              const active = selectedVariants[group.name] === option;

              return (
                <button
                  key={`${group.name}-${option}`}
                  type="button"
                  onClick={() => onChange(group.name, option)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
