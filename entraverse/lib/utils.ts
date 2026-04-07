import type {
  MarginCalculation,
  MatrixPricing,
  ProductFormState,
  ShippingRates,
  VariantCombination,
  VariantDefinition,
} from "@/types/product";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const stripHtml = (value: string): string => {
  if (!value) return "";

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const parser = document.createElement("div");
    parser.innerHTML = value;
    return (parser.textContent || parser.innerText || "").trim();
  }

  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

export const INPUT_BASE_CLASS =
  "w-full rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white";

const MAX_PHOTOS = 5;

export const DEFAULT_SHIPPING_RATES: ShippingRates = {
  Laut: 7_500_000,
  Udara: 155_000,
  Darat: 0,
};

export const DEFAULT_MATRIX_ROW: MatrixPricing = {
  stock: 0,
  purchasePrice: 0,
  currency: "SGD",
  exchangeRate: 1,
  exchangeValue: 13338,
  shipping: "Laut",
  shippingCost: 0,
  arrivalCost: 0,
  marginPercent: 0,
  offlinePrice: 0,
  entraversePrice: 0,
  tokopediaPrice: 0,
  tokopediaFee: 0,
  tiktokPrice: 0,
  tiktokFee: 0,
  shopeePrice: 0,
  shopeeFee: 0,
  skuSeller: "",
  itemWeight: 0,
  avgSalesA: 0,
  stockoutDateA: "",
  stockoutFactorA: "-",
  avgSalesB: 0,
  stockoutDateB: "",
  stockoutFactorB: "-",
  avgDailyFinal: 0,
  startDate: "",
  predictedInitialStock: 0,
  leadTime: 0,
  reorderPoint: 0,
  need15Days: 0,
  inTransitStock: 0,
  nextProcurement: 0,
  procurementStatus: "Normal",
};

export const createInitialProductForm = (): ProductFormState => ({
  basic: {
    name: "",
    slug: "",
    category: "",
    categoryId: "",
    brand: "",
    brandId: "",
    spu: "",
    status: "active",
    barcode: "",
  },
  description: "",
  inventoryPlan: {
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    volume: 0,
    shippingRates: { ...DEFAULT_SHIPPING_RATES },
  },
  tradeIn: false,
  photos: Array.from({ length: MAX_PHOTOS }, () => ({ file: null, preview: "" })),
  variants: [
    {
      id: crypto.randomUUID(),
      name: "Garansi",
      options: ["Tanpa Garansi", "Toko - 1 Tahun"],
      draftOption: "",
    },
  ],
  matrix: {},
});

const EXCHANGE_BUFFER_CURRENCIES = new Set<MatrixPricing["currency"]>(["SGD", "USD"]);
const DEFAULT_EXCHANGE_BUFFER_IDR = 50;

export const generateCombinations = (variants: VariantDefinition[]): VariantCombination[] => {
  const validVariants = variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options.filter((option) => option.trim() !== ""),
    }))
    .filter((variant) => variant.name && variant.options.length > 0);

  if (validVariants.length === 0) {
    return [{ key: "default", label: "Default", values: {} }];
  }

  const combine = (index: number, current: Record<string, string>, acc: VariantCombination[]) => {
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

export const getAdjustedExchangeRate = (
  currency: MatrixPricing["currency"],
  exchangeValue: number,
  surcharge = DEFAULT_EXCHANGE_BUFFER_IDR
): number => {
  const normalizedExchange = Math.max(0, Number(exchangeValue) || 0);
  if (!EXCHANGE_BUFFER_CURRENCIES.has(currency)) {
    return normalizedExchange;
  }

  return normalizedExchange + Math.max(0, Number(surcharge) || 0);
};

export const calculateFinalBeli = (row: MatrixPricing): number => {
  const exchangeRate = Math.max(0, Number(row.exchangeValue) || 0);
  const purchasePrice = Math.max(0, Number(row.purchasePrice) || 0);
  const arrivalCost = Math.max(0, Number(row.arrivalCost) || 0);

  return Math.round((purchasePrice * exchangeRate) + arrivalCost);
};

export const calculateMargin = (sellingPrice: number, baseCost: number): MarginCalculation => {
  const profit = sellingPrice - baseCost;
  const margin = baseCost > 0 ? (profit / baseCost) * 100 : 0;
  const isProfit = profit >= 0;

  return { profit, margin, isProfit };
};
