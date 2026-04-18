"use client";

import { cn } from "@/lib/utils";
import type { ProductVariantGroup, ProductVariantPricingRow } from "@/types/product.types";
import { isVariantOptionAvailable } from "./productPricing";

interface ProductVariantSelectorProps {
  variants: ProductVariantGroup[];
  variantPricing: ProductVariantPricingRow[];
  selectedVariants: Record<string, string>;
  onChange: (groupName: string, option: string) => void;
}

export const ProductVariantSelector = ({
  variants,
  variantPricing,
  selectedVariants,
  onChange,
}: ProductVariantSelectorProps) => {
  const hasVariantPricing = variantPricing.length > 0;
  const orderedVariants = [...variants].sort((left, right) => {
    const leftIsWarranty = left.name.trim().toLowerCase() === "garansi";
    const rightIsWarranty = right.name.trim().toLowerCase() === "garansi";

    if (leftIsWarranty === rightIsWarranty) return 0;
    return leftIsWarranty ? 1 : -1;
  });

  if (variants.length === 0) return null;

  return (
    <div className="space-y-4">
      {orderedVariants.map((group) => {
        const visibleOptions = hasVariantPricing
          ? group.options.filter((option) =>
              isVariantOptionAvailable({
                variants: orderedVariants,
                variantRows: variantPricing,
                selectedVariants,
                groupName: group.name,
                option,
              })
            )
          : group.options;

        if (visibleOptions.length === 0) {
          return null;
        }

        return (
        <div key={group.name} className="min-w-0 space-y-2.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-1 text-[0.88rem] leading-tight md:text-[0.96rem]">
            <span className="shrink-0 font-semibold text-slate-900">Pilih {group.name.toLowerCase()}:</span>
            <span className="block min-w-0 truncate font-medium text-slate-500">
              {visibleOptions.includes(selectedVariants[group.name] ?? "") ? selectedVariants[group.name] : visibleOptions[0]}
            </span>
          </div>

          <div className="min-w-0 grid grid-cols-2 gap-2">
            {visibleOptions.map((option) => {
              const active = selectedVariants[group.name] === option;

              return (
                <button
                  key={`${group.name}-${option}`}
                  type="button"
                  onClick={() => onChange(group.name, option)}
                  className={cn(
                    "inline-flex min-h-[34px] w-full min-w-0 items-center overflow-hidden rounded-[12px] border px-3 py-1.5 text-left text-[0.76rem] font-medium leading-none transition md:min-h-[36px] md:text-[0.8rem]",
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <span className="block min-w-0 truncate">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
};
