import type {
  MarginCalculation,
  MatrixPricing,
  VariantCombination,
  VariantDefinition,
} from "@/src/types/product";

export const generateCombinations = (
  variants: VariantDefinition[]
): VariantCombination[] => {
  const validVariants = variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options.filter((option) => option.trim() !== ""),
    }))
    .filter((variant) => variant.name && variant.options.length > 0);

  if (validVariants.length === 0) {
    return [{ key: "default", label: "Default", values: {} }];
  }

  const combine = (
    index: number,
    current: Record<string, string>,
    acc: VariantCombination[]
  ) => {
    if (index >= validVariants.length) {
      const entries = Object.entries(current);
      const key = entries.map(([name, option]) => `${name}:${option}`).join("|");
      const label = entries.map(([, option]) => option).join(" / ");
      acc.push({ key, label, values: { ...current } });
      return;
    }

    const currentVariant = validVariants[index];
    currentVariant.options.forEach((option) => {
      current[currentVariant.name] = option;
      combine(index + 1, current, acc);
      delete current[currentVariant.name];
    });
  };

  const result: VariantCombination[] = [];
  combine(0, {}, result);
  return result;
};

export const calculateFinalBeli = (row: MatrixPricing): number =>
  row.purchasePrice * row.exchangeValue + row.arrivalCost + row.shippingCost;

export const calculateMargin = (
  sellingPrice: number,
  baseCost: number
): MarginCalculation => {
  const profit = sellingPrice - baseCost;
  const margin = baseCost > 0 ? (profit / baseCost) * 100 : 0;
  const isProfit = profit >= 0;

  return { profit, margin, isProfit };
};
