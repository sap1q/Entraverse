"use client";

import type { ProductDetail, ProductVariantPricingRow } from "@/types/product.types";

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

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

const matchesSelectedVariants = (
  row: ProductVariantPricingRow,
  selectedVariants: Record<string, string>
): boolean => {
  const options = row.options ?? {};
  const optionEntries = Object.entries(options);
  if (optionEntries.length === 0) return false;

  return optionEntries.every(([name, value]) => {
    const selectedEntry = Object.entries(selectedVariants).find(
      ([selectedName]) => normalizeText(selectedName) === normalizeText(name)
    );

    if (!selectedEntry) return false;
    return normalizeText(selectedEntry[1]) === normalizeText(value);
  });
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
  if (!exactMatch) return product.price;

  return resolveVariantRowPrice(exactMatch) ?? product.price;
};

export const resolveSelectedProductOfflinePrice = (
  product: ProductDetail,
  selectedVariants: Record<string, string>,
  variantSku?: string | null
): number => {
  const exactMatch = resolveSelectedVariantRow(product, selectedVariants, variantSku);
  if (exactMatch) {
    return resolveVariantRowOfflinePrice(exactMatch) ?? product.offline_price ?? product.price;
  }

  const firstVariantWithPrice = (product.variant_pricing ?? []).find(
    (row) => resolveVariantRowOfflinePrice(row) !== null
  );
  if (firstVariantWithPrice) {
    return resolveVariantRowOfflinePrice(firstVariantWithPrice) ?? product.offline_price ?? product.price;
  }

  return product.offline_price ?? product.price;
};
