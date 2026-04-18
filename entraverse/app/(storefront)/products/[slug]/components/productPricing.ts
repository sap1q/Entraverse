"use client";

import type { ProductDetail, ProductVariantGroup, ProductVariantPricingRow } from "@/types/product.types";

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

const findRowOptionValue = (row: ProductVariantPricingRow, groupName: string): string | null => {
  const options = row.options ?? {};
  const match = Object.entries(options).find(([name]) => normalizeText(name) === normalizeText(groupName));
  return match ? String(match[1]) : null;
};

export const resolveVariantRowIdentity = (row: ProductVariantPricingRow): string | null => {
  const candidates = [row.sku, row.sku_seller, row.variant_code];
  const identity = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return identity ? identity.trim() : null;
};

export const resolveVariantRowPrice = (row: ProductVariantPricingRow): number | null => {
  const candidates = [
    row.entraverse_price,
    row.offline_price,
    row.tokopedia_price,
    row.shopee_price,
  ];
  const price = candidates.find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof price === "number" ? price : null;
};

export const resolveVariantRowOfflinePrice = (row: ProductVariantPricingRow): number | null => {
  const candidates = [
    row.offline_price,
    row.entraverse_price,
    row.tokopedia_price,
    row.shopee_price,
  ];
  const price = candidates.find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof price === "number" ? price : null;
};

export const resolveVariantRowWeight = (row: ProductVariantPricingRow): number | null => {
  return typeof row.item_weight === "number" && Number.isFinite(row.item_weight) && row.item_weight > 0
    ? row.item_weight
    : null;
};

export const isVariantRowPurchasable = (row: ProductVariantPricingRow): boolean => {
  const price = resolveVariantRowPrice(row);
  const stock =
    typeof row.stock === "number" && Number.isFinite(row.stock)
      ? Math.max(0, row.stock)
      : null;

  const hasPrice = typeof price === "number" && Number.isFinite(price) && price > 0;
  const hasStock = stock === null ? true : stock > 0;

  return hasPrice && hasStock;
};

const matchesScopedSelection = (
  row: ProductVariantPricingRow,
  selectedVariants: Record<string, string>
): boolean => {
  const selectionEntries = Object.entries(selectedVariants);
  if (selectionEntries.length === 0) return false;

  return selectionEntries.every(([groupName, selectedOption]) => {
    const rowOptionValue = findRowOptionValue(row, groupName);
    if (!rowOptionValue) return false;

    return normalizeText(rowOptionValue) === normalizeText(selectedOption);
  });
};

const matchesSelectedVariants = (
  row: ProductVariantPricingRow,
  selectedVariants: Record<string, string>
): boolean => {
  const options = row.options ?? {};
  const optionEntries = Object.entries(options);
  if (optionEntries.length === 0) return false;

  return optionEntries.every(([name, value]) => {
    const selectedEntry = Object.entries(selectedVariants).find(([selectedName]) => normalizeText(selectedName) === normalizeText(name));

    if (!selectedEntry) return false;
    return normalizeText(selectedEntry[1]) === normalizeText(value);
  });
};

const buildScopedSelection = (
  variants: ProductVariantGroup[],
  selectedVariants: Record<string, string>,
  groupName: string,
  option: string
): Record<string, string> => {
  const scopedSelection: Record<string, string> = {};

  for (const group of variants) {
    if (normalizeText(group.name) === normalizeText(groupName)) {
      scopedSelection[group.name] = option;
      break;
    }

    const selectedValue = selectedVariants[group.name];
    if (typeof selectedValue === "string" && selectedValue.trim().length > 0) {
      scopedSelection[group.name] = selectedValue;
    }
  }

  return scopedSelection;
};

export const isVariantOptionAvailable = ({
  variants,
  variantRows,
  selectedVariants,
  groupName,
  option,
}: {
  variants: ProductVariantGroup[];
  variantRows: ProductVariantPricingRow[];
  selectedVariants: Record<string, string>;
  groupName: string;
  option: string;
}): boolean => {
  if (variantRows.length === 0) {
    return true;
  }

  const scopedSelection = buildScopedSelection(variants, selectedVariants, groupName, option);
  return variantRows.some((row) => isVariantRowPurchasable(row) && matchesScopedSelection(row, scopedSelection));
};

export const normalizeVariantSelection = ({
  variants,
  selectedVariants,
  variantRows,
}: {
  variants: ProductVariantGroup[];
  selectedVariants: Record<string, string>;
  variantRows: ProductVariantPricingRow[];
}): Record<string, string> => {
  if (variants.length === 0) {
    return {};
  }

  if (variantRows.length === 0) {
    return variants.reduce<Record<string, string>>((result, group) => {
      if (group.options.length === 0) return result;

      const selectedValue = selectedVariants[group.name];
      result[group.name] = group.options.includes(selectedValue) ? selectedValue : group.options[0];
      return result;
    }, {});
  }

  return variants.reduce<Record<string, string>>((result, group) => {
    if (group.options.length === 0) {
      return result;
    }

    const selectedValue = selectedVariants[group.name];
    const requestedOption = group.options.includes(selectedValue) ? selectedValue : null;

    if (
      requestedOption &&
      isVariantOptionAvailable({
        variants,
        variantRows,
        selectedVariants: result,
        groupName: group.name,
        option: requestedOption,
      })
    ) {
      result[group.name] = requestedOption;
      return result;
    }

    const firstAvailableOption = group.options.find((option) =>
      isVariantOptionAvailable({
        variants,
        variantRows,
        selectedVariants: result,
        groupName: group.name,
        option,
      })
    );

    result[group.name] = firstAvailableOption ?? group.options[0];
    return result;
  }, {});
};

export const resolveSelectedVariantRow = (
  product: Pick<ProductDetail, "variant_pricing">,
  selectedVariants: Record<string, string>,
  variantSku?: string | null
): ProductVariantPricingRow | null => {
  const variantRows = Array.isArray(product.variant_pricing) ? product.variant_pricing : [];
  if (variantRows.length === 0) return null;

  const normalizedSku = typeof variantSku === "string" ? variantSku.trim().toLowerCase() : "";
  if (normalizedSku) {
    const exactBySku = variantRows.find((row) => {
      const identity = resolveVariantRowIdentity(row);
      return identity ? identity.toLowerCase() === normalizedSku : false;
    });
    if (exactBySku) return exactBySku;
  }

  const exactMatch = variantRows.find((row) => matchesSelectedVariants(row, selectedVariants));
  return exactMatch ?? null;
};

export const resolveSelectedProductPrice = (
  product: ProductDetail,
  selectedVariants: Record<string, string>,
  variantSku?: string | null
): number => {
  const exactMatch = resolveSelectedVariantRow(product, selectedVariants, variantSku);
  if (!exactMatch) {
    return Array.isArray(product.variant_pricing) && product.variant_pricing.length > 0 ? 0 : product.price;
  }

  return resolveVariantRowPrice(exactMatch) ?? 0;
};

export const resolveSelectedProductOfflinePrice = (
  product: ProductDetail,
  selectedVariants: Record<string, string>,
  variantSku?: string | null
): number => {
  const exactMatch = resolveSelectedVariantRow(product, selectedVariants, variantSku);
  if (exactMatch) {
    return resolveVariantRowOfflinePrice(exactMatch) ?? 0;
  }

  if (Array.isArray(product.variant_pricing) && product.variant_pricing.length > 0) {
    return 0;
  }

  const firstVariantWithPrice = (product.variant_pricing ?? []).find(
    (row) => resolveVariantRowOfflinePrice(row) !== null
  );
  if (firstVariantWithPrice) {
    return resolveVariantRowOfflinePrice(firstVariantWithPrice) ?? product.offline_price ?? product.price;
  }

  return product.offline_price ?? product.price;
};
