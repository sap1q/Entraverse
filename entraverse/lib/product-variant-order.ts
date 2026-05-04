import type { VariantCombination } from "@/types/product";

const MEMORY_NAME_REGEX = /memori|memory/i;
const WARRANTY_NAME_REGEX = /garansi|warranty/i;

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

const toSlugToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseDurationMonths = (value: string): number | null => {
  const normalized = normalizeText(value);
  const yearMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*tahun/);
  if (yearMatch) {
    const amount = Number(yearMatch[1]?.replace(",", "."));
    return Number.isFinite(amount) ? amount * 12 : null;
  }

  const monthMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*bulan/);
  if (monthMatch) {
    const amount = Number(monthMatch[1]?.replace(",", "."));
    return Number.isFinite(amount) ? amount : null;
  }

  return null;
};

const parseMemoryGb = (value: string): number | null => {
  const normalized = normalizeText(value);
  const match = normalized.match(/(\d+(?:[.,]\d+)?)\s*(tb|gb|mb)/);
  if (!match) return null;

  const amount = Number(match[1]?.replace(",", "."));
  if (!Number.isFinite(amount)) return null;

  const unit = match[2];
  if (unit === "tb") return amount * 1024;
  if (unit === "mb") return amount / 1024;
  return amount;
};

const findOptionByName = (values: Record<string, string>, matcher: RegExp): string | null => {
  const match = Object.entries(values).find(([name]) => matcher.test(name));
  return match?.[1]?.trim() || null;
};

const getWarrantyRank = (value: string | null): number => {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const normalized = normalizeText(value);
  if (normalized.includes("tanpa")) return 0;

  const months = parseDurationMonths(normalized);
  if (months !== null) return 100 + months;

  return 10_000;
};

export const getMemoryVariantValue = (values: Record<string, string>): string | null =>
  findOptionByName(values, MEMORY_NAME_REGEX);

export const getWarrantyVariantValue = (values: Record<string, string>): string | null =>
  findOptionByName(values, WARRANTY_NAME_REGEX);

export const getSharedVariantImageKey = (combo: Pick<VariantCombination, "key" | "label" | "values">): string => {
  const memoryValue = getMemoryVariantValue(combo.values);
  if (memoryValue) {
    return `memory:${toSlugToken(memoryValue) || "default"}`;
  }

  return `variant:${toSlugToken(combo.key || combo.label) || "default"}`;
};

export const getSharedVariantImageLabel = (combo: Pick<VariantCombination, "label" | "values">): string =>
  getMemoryVariantValue(combo.values) || combo.label;

export const sortVariantCombinations = <T extends VariantCombination>(combinations: T[]): T[] =>
  [...combinations].sort((left, right) => {
    const leftMemoryValue = getMemoryVariantValue(left.values);
    const rightMemoryValue = getMemoryVariantValue(right.values);
    const leftMemoryGb = parseMemoryGb(leftMemoryValue ?? "");
    const rightMemoryGb = parseMemoryGb(rightMemoryValue ?? "");

    if (leftMemoryGb !== null && rightMemoryGb !== null && leftMemoryGb !== rightMemoryGb) {
      return leftMemoryGb - rightMemoryGb;
    }

    if (leftMemoryGb !== null && rightMemoryGb === null) return -1;
    if (leftMemoryGb === null && rightMemoryGb !== null) return 1;

    const leftWarrantyValue = getWarrantyVariantValue(left.values);
    const rightWarrantyValue = getWarrantyVariantValue(right.values);
    const leftWarrantyRank = getWarrantyRank(leftWarrantyValue);
    const rightWarrantyRank = getWarrantyRank(rightWarrantyValue);

    if (leftWarrantyRank !== rightWarrantyRank) {
      return leftWarrantyRank - rightWarrantyRank;
    }

    if ((leftMemoryValue ?? "") !== (rightMemoryValue ?? "")) {
      return (leftMemoryValue ?? "").localeCompare(rightMemoryValue ?? "", "id", { numeric: true });
    }

    if ((leftWarrantyValue ?? "") !== (rightWarrantyValue ?? "")) {
      return (leftWarrantyValue ?? "").localeCompare(rightWarrantyValue ?? "", "id", { numeric: true });
    }

    return left.label.localeCompare(right.label, "id", { numeric: true });
  });
