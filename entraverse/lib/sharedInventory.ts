import type { MatrixPricing, VariantCombination } from "@/types/product";

const WARRANTY_VARIANT_NAME = "garansi";
const DEFAULT_GROUP_KEY = "__shared_inventory_default__";

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

const splitVariantSegment = (segment: string): [string, string] | null => {
  const dividerIndex = segment.indexOf(":");
  if (dividerIndex < 0) return null;

  const name = segment.slice(0, dividerIndex).trim();
  const value = segment.slice(dividerIndex + 1).trim();
  if (!name || !value) return null;

  return [name, value];
};

const normalizeEntries = (entries: Array<[string, string]>): Array<[string, string]> =>
  entries
    .map(([name, value]) => [name.trim(), value.trim()] as [string, string])
    .filter(([name, value]) => name.length > 0 && value.length > 0)
    .filter(([name]) => normalizeText(name) !== WARRANTY_VARIANT_NAME)
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName));

const buildGroupKey = (entries: Array<[string, string]>): string => {
  const normalizedEntries = normalizeEntries(entries);
  if (normalizedEntries.length === 0) return DEFAULT_GROUP_KEY;
  return normalizedEntries.map(([name, value]) => `${name}:${value}`).join("|");
};

const toSafeStock = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

export const buildSharedInventoryKeyFromValues = (values: Record<string, unknown>): string =>
  buildGroupKey(
    Object.entries(values).map(([name, value]) => [name, String(value ?? "").trim()] as [string, string])
  );

export const buildSharedInventoryKeyFromVariantKey = (variantKey: string): string => {
  const normalizedKey = variantKey.trim();
  if (!normalizedKey || normalizedKey === "default") return DEFAULT_GROUP_KEY;

  return buildGroupKey(
    normalizedKey
      .split("|")
      .map((segment) => splitVariantSegment(segment))
      .filter((entry): entry is [string, string] => Boolean(entry))
  );
};

export const buildSharedInventoryKeyFromLabel = (label: string): string => {
  const normalizedLabel = label.trim();
  if (!normalizedLabel || normalizedLabel.toLowerCase() === "default") return DEFAULT_GROUP_KEY;

  return buildGroupKey(
    normalizedLabel
      .split("/")
      .map((segment) => splitVariantSegment(segment.trim()))
      .filter((entry): entry is [string, string] => Boolean(entry))
  );
};

export const createSharedInventoryStockMap = (
  matrix: Record<string, MatrixPricing>
): Map<string, number> => {
  const stockByGroup = new Map<string, number>();

  Object.entries(matrix).forEach(([variantKey, row]) => {
    const groupKey = buildSharedInventoryKeyFromVariantKey(variantKey);
    const stock = toSafeStock(row?.stock);
    const current = stockByGroup.get(groupKey) ?? 0;
    if (stock > current) {
      stockByGroup.set(groupKey, stock);
    } else if (!stockByGroup.has(groupKey)) {
      stockByGroup.set(groupKey, stock);
    }
  });

  return stockByGroup;
};

export const normalizeSharedInventoryMatrix = (
  matrix: Record<string, MatrixPricing>
): Record<string, MatrixPricing> => {
  const stockByGroup = createSharedInventoryStockMap(matrix);

  return Object.fromEntries(
    Object.entries(matrix).map(([variantKey, row]) => [
      variantKey,
      {
        ...row,
        stock: stockByGroup.get(buildSharedInventoryKeyFromVariantKey(variantKey)) ?? toSafeStock(row?.stock),
      },
    ])
  );
};

export const syncSharedInventoryStockForKey = (
  matrix: Record<string, MatrixPricing>,
  sourceVariantKey: string,
  nextStock: number
): Record<string, MatrixPricing> => {
  const sourceGroupKey = buildSharedInventoryKeyFromVariantKey(sourceVariantKey);
  const safeStock = toSafeStock(nextStock);

  return Object.fromEntries(
    Object.entries(matrix).map(([variantKey, row]) => [
      variantKey,
      buildSharedInventoryKeyFromVariantKey(variantKey) === sourceGroupKey
        ? { ...row, stock: safeStock }
        : row,
    ])
  );
};

export const sumSharedInventoryStockFromCombinations = (
  combinations: VariantCombination[],
  matrix: Record<string, MatrixPricing>
): number => {
  const seenGroups = new Set<string>();

  return combinations.reduce((total, combo) => {
    const groupKey = buildSharedInventoryKeyFromValues(combo.values);
    if (seenGroups.has(groupKey)) return total;

    seenGroups.add(groupKey);
    return total + toSafeStock(matrix[combo.key]?.stock);
  }, 0);
};

export const sumSharedInventoryStockFromVariantRows = (
  rows: Array<Record<string, unknown>>
): number => {
  const stockByGroup = new Map<string, number>();

  rows.forEach((row) => {
    const label = typeof row.label === "string" ? row.label : "";
    const options =
      row.options && typeof row.options === "object" ? (row.options as Record<string, unknown>) : null;
    const groupKey = options ? buildSharedInventoryKeyFromValues(options) : buildSharedInventoryKeyFromLabel(label);
    const stock = toSafeStock(row.stock);
    const current = stockByGroup.get(groupKey) ?? 0;
    stockByGroup.set(groupKey, Math.max(current, stock));
  });

  return Array.from(stockByGroup.values()).reduce((sum, stock) => sum + stock, 0);
};
