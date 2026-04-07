"use client";

import { useCallback, useMemo, useState } from "react";
import type { VariantAttribute, VariantCombination } from "@/types/product.types";

const clean = (value: string): string => value.trim();

const buildCombinations = (attributes: VariantAttribute[]): Array<Record<string, string>> => {
  const normalized = attributes
    .map((attribute) => ({
      name: clean(attribute.name),
      values: attribute.values.map(clean).filter(Boolean),
    }))
    .filter((attribute) => attribute.name && attribute.values.length > 0);

  if (normalized.length === 0) return [{}];

  let rows: Array<Record<string, string>> = [{}];
  normalized.forEach((attribute) => {
    const next: Array<Record<string, string>> = [];
    rows.forEach((row) => {
      attribute.values.forEach((value) => next.push({ ...row, [attribute.name]: value }));
    });
    rows = next;
  });

  return rows;
};

const skuPart = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4) || "X";

const makeCombinationId = (attributes: Record<string, string>): string =>
  Object.entries(attributes)
    .map(([name, value]) => `${name}:${value}`)
    .join("|") || "default";

export function useVariantMatrix(initialAttributes: VariantAttribute[] = [], productCode = "PRD") {
  const [attributes, setAttributes] = useState<VariantAttribute[]>(initialAttributes);
  const [variants, setVariants] = useState<VariantCombination[]>([]);

  const generated = useMemo(() => {
    return buildCombinations(attributes).map((row, index) => {
      const id = makeCombinationId(row);
      const sku = [productCode.toUpperCase(), ...Object.values(row).map(skuPart), String(index + 1).padStart(3, "0")]
        .filter(Boolean)
        .join("-");

      return {
        id,
        attributes: row,
        sku,
        price: 0,
        stock: 0,
      } satisfies VariantCombination;
    });
  }, [attributes, productCode]);

  const syncGenerated = useCallback(() => {
    setVariants((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      return generated.map((item) => {
        const existing = byId.get(item.id);
        if (!existing) return item;
        return { ...item, price: existing.price, stock: existing.stock, image: existing.image };
      });
    });
  }, [generated]);

  const updateVariant = useCallback((id: string, patch: Partial<VariantCombination>) => {
    setVariants((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const bulkUpdate = useCallback((patch: Pick<VariantCombination, "price" | "stock">) => {
    setVariants((prev) => prev.map((item) => ({ ...item, ...patch })));
  }, []);

  const copyPriceFrom = useCallback((sourceId: string) => {
    setVariants((prev) => {
      const source = prev.find((item) => item.id === sourceId);
      if (!source) return prev;
      return prev.map((item) => ({ ...item, price: source.price }));
    });
  }, []);

  return {
    attributes,
    setAttributes,
    generated,
    variants,
    setVariants,
    syncGenerated,
    updateVariant,
    bulkUpdate,
    copyPriceFrom,
  };
}
