"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { ProductVariantGroup, ProductVariantPricingRow } from "@/types/product.types";
import { slugifyValue } from "@/lib/utils/formatter";
import { normalizeVariantSelection } from "@/app/(storefront)/products/[slug]/components/productPricing";

const getVariantParamKey = (groupName: string, index: number): string => {
  if (index === 0) return "variant";

  const normalized = slugifyValue(groupName).replace(/-/g, "_");
  return normalized.length > 0 ? `variant_${normalized}` : `variant_${index + 1}`;
};

const findOptionByToken = (options: string[], token: string | null): string | null => {
  if (!token) return null;
  return options.find((option) => slugifyValue(option) === token) ?? null;
};

const buildSelectedVariants = (
  variants: ProductVariantGroup[],
  searchParams: URLSearchParams | ReadonlyURLSearchParams | null,
  variantPricing: ProductVariantPricingRow[]
): Record<string, string> => {
  const result: Record<string, string> = {};

  variants.forEach((group, index) => {
    if (group.options.length === 0) return;

    const paramKey = getVariantParamKey(group.name, index);
    const legacyFirstGroupToken = index === 0 ? searchParams?.get("variant") ?? null : null;
    const token = searchParams?.get(paramKey) ?? legacyFirstGroupToken;
    const matched = findOptionByToken(group.options, token);

    result[group.name] = matched ?? group.options[0];
  });

  return normalizeVariantSelection({
    variants,
    selectedVariants: result,
    variantRows: variantPricing,
  });
};

export const useVariantSelection = (
  variants: ProductVariantGroup[],
  variantPricing: ProductVariantPricingRow[] = []
) => {
  const searchParams = useSearchParams();
  const [selectedVariantsState, setSelectedVariants] = useState<Record<string, string>>(() =>
    buildSelectedVariants(variants, searchParams, variantPricing)
  );

  const selectedVariants = useMemo(() => {
    const initial = buildSelectedVariants(variants, searchParams, variantPricing);
    const merged = { ...initial };

    Object.entries(selectedVariantsState).forEach(([name, value]) => {
      const group = variants.find((item) => item.name === name);
      if (!group || group.options.length === 0) return;
      if (!group.options.includes(value)) return;
      merged[name] = value;
    });

    return normalizeVariantSelection({
      variants,
      selectedVariants: merged,
      variantRows: variantPricing,
    });
  }, [searchParams, selectedVariantsState, variantPricing, variants]);

  const updateVariant = useCallback(
    (groupName: string, value: string) => {
      setSelectedVariants((current) =>
        normalizeVariantSelection({
          variants,
          selectedVariants: {
            ...current,
            [groupName]: value,
          },
          variantRows: variantPricing,
        })
      );
    },
    [variantPricing, variants]
  );

  return {
    selectedVariants,
    updateVariant,
    activeVariantToken: null,
  };
};
