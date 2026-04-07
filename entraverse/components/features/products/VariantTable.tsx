"use client";

import { RefreshCw, Settings2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { MatrixPricing, ShippingRates, VariantCombination } from "@/types/product";
import type { CategoryFees, FeeChannel } from "@/types/category.types";
import { DEFAULT_MATRIX_ROW, DEFAULT_SHIPPING_RATES } from "@/lib/utils";
import {
  DEFAULT_WARRANTY_PRICING,
  WARRANTY_COST_LABEL,
  WARRANTY_PROFIT_LABEL,
  type WarrantyComponent,
  type WarrantyPricingConfig,
} from "@/lib/warrantyProgram";
import VariantRow from "@/components/features/products/VariantRow";
import { useVariantCalculations } from "@/hooks/useVariantCalculations";

type VariantTableProps = {
  combinations: VariantCombination[];
  matrixData: Record<string, MatrixPricing>;
  onUpdateField: (key: string, field: keyof MatrixPricing, value: number | string) => void;
  inventoryVolumeCbm?: number;
  shippingRateDefaults: ShippingRates;
  onShippingRatesChange: (nextRates: ShippingRates) => void;
  categoryPricing?: {
    marginPercent: number;
    fees: CategoryFees | null;
    currencySurcharge?: number;
    roundToNearest?: number;
    warrantyComponents?: WarrantyComponent[];
    warrantyPricing?: WarrantyPricingConfig;
  };
};

const headers = [
  "Varian / Nama Opsi",
  "Harga Beli",
  "Kurs",
  "Nilai Tukar Kurs",
  "Pengiriman",
  "Biaya Kedatangan",
  "Harga Beli (Rp.)",
  "Harga Jual Offline",
  "Harga Jual Entraverse",
  "Harga Jual Tokopedia",
  "Harga Jual Shopee",
  "Stok",
  "SKU Penjual",
  "Berat Barang",
  "Rata-Rata Penjualan Periode A",
  "Tanggal Stok Habis Periode A",
  "Faktor Stok Habis Periode A",
  "Rata-Rata Penjualan Periode B",
  "Tanggal Stok Habis Periode B",
  "Faktor Stok Habis Periode B",
  "Rata-Rata Penjualan per Hari Final",
  "Start Date",
  "Prediksi Stok Awal",
  "Lead Time (hari)",
  "Reorder Point",
  "Kebutuhan 15 Hari",
  "Stok Dalam Perjalanan",
  "Pengadaan Barang Selanjutnya",
  "Status",
];

const groupedHeaders = [
  { label: "Informasi Produk", span: 1, tone: "text-slate-700 bg-slate-100/80" },
  { label: "Harga Beli & Kurs", span: 4, tone: "text-indigo-700 bg-indigo-50" },
  { label: "Landed Cost", span: 2, tone: "text-blue-700 bg-blue-50" },
  { label: "Harga Jual Channel", span: 4, tone: "text-cyan-700 bg-cyan-50" },
  { label: "Operasional SKU", span: 3, tone: "text-violet-700 bg-violet-50" },
  { label: "Forecast Periode A", span: 3, tone: "text-amber-700 bg-amber-50" },
  { label: "Forecast Periode B", span: 3, tone: "text-orange-700 bg-orange-50" },
  { label: "Replenishment Planning", span: 8, tone: "text-emerald-700 bg-emerald-50" },
  { label: "Status", span: 1, tone: "text-slate-700 bg-slate-100/80" },
] as const;

const platformLabel: Record<string, string> = {
  Tokopedia: "text-emerald-700",
  Shopee: "text-orange-700",
  Entraverse: "text-slate-700",
};
const priceChannelHeaders = new Set([
  "Harga Jual Offline",
  "Harga Jual Entraverse",
  "Harga Jual Tokopedia",
  "Harga Jual Shopee",
]);

type ExchangeMode = "auto" | "manual";

const CURRENCY_OPTIONS: MatrixPricing["currency"][] = ["SGD", "USD", "AUD", "EUR", "IDR", "CNY"];

const BASE_EXCHANGE_RATES: Record<MatrixPricing["currency"], number> = {
  SGD: 13338,
  USD: 15420,
  AUD: 10250,
  EUR: 16700,
  IDR: 1,
  CNY: 2140,
};

const SHIPPING_UNIT_LABEL: Record<MatrixPricing["shipping"], string> = {
  Laut: "CBM",
  Udara: "KG",
  Darat: "Unit",
};

const SHIPPING_HELPER_TEXT: Record<MatrixPricing["shipping"], string> = {
  Laut: "Rumus: volume produk (CBM) x tarif laut.",
  Udara: "Rumus: berat produk (KG) x tarif udara.",
  Darat: "Rumus: biaya kedatangan darat = 0.",
};

const formatRupiah = new Intl.NumberFormat("id-ID");
const PRICE_SYNC_FIELDS: Array<keyof MatrixPricing> = [
  "arrivalCost",
  "offlinePrice",
  "entraversePrice",
  "tokopediaPrice",
  "shopeePrice",
  "tokopediaFee",
  "tiktokPrice",
  "tiktokFee",
  "shopeeFee",
];

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toRupiahNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  if (typeof value !== "string") {
    return 0;
  }

  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const isAmountValueType = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "amount" || normalized === "rp" || normalized === "rupiah";
};

const hasFeeComponents = (channel: FeeChannel | undefined): boolean =>
  (channel?.components?.length ?? 0) > 0;

const resolveFeeSummaryPercent = (channel: FeeChannel | undefined): number => {
  if (!channel) return 0;

  const record = channel as Record<string, unknown>;
  const nestedSummary =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : null;

  const candidates = [
    record.percent,
    record.rate,
    record.percentage,
    record.total_percent,
    record.totalPercent,
    record.summary,
    nestedSummary?.percent,
    nestedSummary?.rate,
    nestedSummary?.percentage,
    nestedSummary?.total_percent,
    nestedSummary?.totalPercent,
    nestedSummary?.value,
  ];

  const resolved = candidates.find(
    (value) =>
      (typeof value === "number" && Number.isFinite(value)) ||
      (typeof value === "string" && value.trim() !== "")
  );

  return Math.max(0, toNumber(resolved));
};

const hasFeeSignal = (channel: FeeChannel | undefined): boolean =>
  hasFeeComponents(channel) || resolveFeeSummaryPercent(channel) > 0;

const pickPreferredChannel = (...channels: Array<FeeChannel | undefined>): FeeChannel | undefined => {
  const populated = channels.find((channel) => hasFeeSignal(channel));
  if (populated) return populated;
  return channels.find((channel) => Boolean(channel));
};

const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();
const normalizeShippingRates = (rates?: Partial<ShippingRates>): ShippingRates => ({
  Laut: Math.max(0, Number(rates?.Laut ?? DEFAULT_SHIPPING_RATES.Laut) || 0),
  Udara: Math.max(0, Number(rates?.Udara ?? DEFAULT_SHIPPING_RATES.Udara) || 0),
  Darat: Math.max(0, Number(rates?.Darat ?? DEFAULT_SHIPPING_RATES.Darat) || 0),
});

const isShippingRateEqual = (left: ShippingRates, right: ShippingRates): boolean =>
  left.Laut === right.Laut && left.Udara === right.Udara && left.Darat === right.Darat;

const roundToNearest = (value: number, step: number): number =>
  Math.round(value / step) * step;

const applyRoundingRules = (value: number): number => {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue >= 500_000) {
    return Math.max(0, roundToNearest(safeValue, 50_000) - 1_000);
  }

  if (safeValue >= 250_000) {
    return Math.max(0, roundToNearest(safeValue, 10_000) - 1_000);
  }

  if (safeValue >= 100_000) {
    return Math.max(0, roundToNearest(safeValue, 5_000) - 1_000);
  }

  return Math.max(0, roundToNearest(safeValue, 1_000) - 100);
};

const calculateArrivalCost = (
  shipping: MatrixPricing["shipping"],
  itemWeightGram: number,
  volumeCbm: number,
  shippingRates: Record<MatrixPricing["shipping"], number>
): number => {
  const shippingRate = Math.max(0, Number(shippingRates[shipping]) || 0);
  if (shipping === "Udara") {
    const weightKg = Math.max(0, Number(itemWeightGram) || 0) / 1000;
    return Math.round(weightKg * shippingRate);
  }

  if (shipping === "Laut") {
    const safeVolume = Math.max(0, Number(volumeCbm) || 0);
    return Math.round(safeVolume * shippingRate);
  }

  return 0;
};

const calculateFeeTotals = (channel: FeeChannel | undefined, purchasePriceIdr: number) => {
  const components = channel?.components ?? [];
  const safePurchasePrice = Math.max(0, purchasePriceIdr);
  let fixedTotal = 0;
  let percentTotal = 0;

  if (components.length === 0) {
    const summaryPercent = resolveFeeSummaryPercent(channel);
    return {
      fixedTotal: 0,
      percentTotal: Math.max(0, summaryPercent) / 100,
      percentDisplay: Math.max(0, summaryPercent),
    };
  }

  components.forEach((component) => {
    const isAmount = isAmountValueType(component.valueType);
    const value = isAmount
      ? toRupiahNumber(component.value)
      : Math.max(0, toNumber(component.value));
    const minValue = toRupiahNumber(component.min);
    const maxValue = toRupiahNumber(component.max);

    if (isAmount) {
      let fee = value;
      if (minValue > 0) fee = Math.max(fee, minValue);
      if (maxValue > 0) fee = Math.min(fee, maxValue);

      fixedTotal += Math.max(0, fee);
      return;
    }

    let effectiveRate = Math.max(0, value) / 100;

    if (safePurchasePrice > 0) {
      if (maxValue > 0) {
        effectiveRate = Math.min(effectiveRate, maxValue / safePurchasePrice);
      }
      if (minValue > 0) {
        effectiveRate = Math.max(effectiveRate, minValue / safePurchasePrice);
      }
    }

    percentTotal += Math.max(0, effectiveRate);
  });

  return {
    fixedTotal: Math.round(fixedTotal),
    percentTotal,
    percentDisplay: percentTotal * 100,
  };
};

const calculateSellingPrice = (
  purchasePriceIdr: number,
  fixedFeeAmount: number,
  marginRate: number,
  platformFeeRate: number
): number => {
  const safePurchasePrice = Math.max(0, purchasePriceIdr);
  const safeFixedFee = Math.max(0, fixedFeeAmount);
  const denominator = 1 - Math.max(0, marginRate) - Math.max(0, platformFeeRate);

  if (denominator <= 0) {
    return safePurchasePrice + safeFixedFee;
  }

  return (safePurchasePrice + safeFixedFee) / denominator;
};

const hasWarrantyPricing = (pricing: WarrantyPricingConfig | undefined): boolean => {
  if (!pricing) return false;
  const costValue = Math.max(0, toNumber(pricing.cost?.value ?? 0));
  const profitValue = Math.max(0, toNumber(pricing.profit?.value ?? 0));
  if (costValue > 0) return true;
  return pricing.profit?.valueType === "amount" && profitValue > 0;
};

const hasOneYearWarranty = (combo: VariantCombination): boolean =>
  Object.entries(combo.values ?? {}).some(([key, value]) => {
    const normalizedKey = normalizeText(String(key ?? ""));
    const normalizedValue = normalizeText(String(value ?? ""));
    if (!normalizedKey.includes("garansi")) return false;
    if (!normalizedValue || normalizedValue.includes("tanpa")) return false;

    return /(^|[^0-9])1\s*tahun/.test(normalizedValue) || normalizedValue.includes("1th") || normalizedValue.includes("1 th");
  });

const applyWarrantyMultiplier = (combo: VariantCombination, basePrice: number): number =>
  hasOneYearWarranty(combo) ? basePrice * 1.06 : basePrice;

const calculatePurchasePriceIdr = (
  purchasePrice: number,
  exchangeRate: number,
  arrivalCost: number
): number => Math.max(0, Math.round((Math.max(0, purchasePrice) * Math.max(0, exchangeRate)) + Math.max(0, arrivalCost)));

const getSelectedCategoryConfig = (pricing: VariantTableProps["categoryPricing"]) => {
  const fees = pricing?.fees;
  const tokopediaChannel = pickPreferredChannel(
    fees?.tokopedia,
    fees?.tokopedia_tiktok,
    fees?.marketplace
  );
  const tiktokChannel = pickPreferredChannel(
    fees?.tokopedia_tiktok,
    fees?.tokopedia,
    fees?.marketplace
  );

  return {
    marginPercent: Math.max(0, toNumber(pricing?.marginPercent)),
    warrantyComponents: pricing?.warrantyComponents ?? [],
    warrantyPricing: {
      cost: {
        valueType: pricing?.warrantyPricing?.cost?.valueType === "amount" ? "amount" : "percent",
        value: Math.max(0, toNumber(pricing?.warrantyPricing?.cost?.value ?? DEFAULT_WARRANTY_PRICING.cost.value)),
      },
      profit: {
        valueType: pricing?.warrantyPricing?.profit?.valueType === "amount" ? "amount" : "percent",
        value: Math.max(0, toNumber(pricing?.warrantyPricing?.profit?.value ?? DEFAULT_WARRANTY_PRICING.profit.value)),
      },
    },
    tokopediaChannel,
    tiktokChannel,
    shopeeChannel: fees?.shopee,
    entraverseChannel: fees?.entraverse,
  };
};

const updateComputedPricingForRow = (
  combo: VariantCombination,
  row: MatrixPricing,
  pricing: VariantTableProps["categoryPricing"],
  inventoryVolumeCbm: number,
  shippingRates: Record<MatrixPricing["shipping"], number>
): Pick<
  MatrixPricing,
  "arrivalCost" | "offlinePrice" | "entraversePrice" | "tokopediaPrice" | "tiktokPrice" | "shopeePrice" | "tokopediaFee" | "tiktokFee" | "shopeeFee"
> => {
  const categoryConfig = getSelectedCategoryConfig(pricing);
  const exchangeRate = Math.max(0, toNumber(row.exchangeValue));
  const arrivalCost = calculateArrivalCost(row.shipping, row.itemWeight, inventoryVolumeCbm, shippingRates);
  const purchasePriceIdr = calculatePurchasePriceIdr(row.purchasePrice, exchangeRate, arrivalCost);
  const marginRate = Math.max(0, categoryConfig.marginPercent) / 100;

  const entraverseFee = calculateFeeTotals(categoryConfig.entraverseChannel, purchasePriceIdr);
  const tokopediaFee = calculateFeeTotals(categoryConfig.tokopediaChannel, purchasePriceIdr);
  const tiktokFee = calculateFeeTotals(categoryConfig.tiktokChannel, purchasePriceIdr);
  const shopeeFee = calculateFeeTotals(categoryConfig.shopeeChannel, purchasePriceIdr);

  const offlineBase = calculateSellingPrice(purchasePriceIdr, 0, marginRate, 0);
  const entraverseBase = calculateSellingPrice(
    purchasePriceIdr,
    entraverseFee.fixedTotal,
    marginRate,
    entraverseFee.percentTotal
  );
  const tokopediaBase = calculateSellingPrice(
    purchasePriceIdr,
    tokopediaFee.fixedTotal,
    marginRate,
    tokopediaFee.percentTotal
  );
  const tiktokBase = calculateSellingPrice(
    purchasePriceIdr,
    tiktokFee.fixedTotal,
    marginRate,
    tiktokFee.percentTotal
  );
  const shopeeBase = calculateSellingPrice(
    purchasePriceIdr,
    shopeeFee.fixedTotal,
    marginRate,
    shopeeFee.percentTotal
  );

  const offlineWithWarranty = applyWarrantyMultiplier(combo, offlineBase);
  const entraverseWithWarranty = applyWarrantyMultiplier(combo, entraverseBase);
  const tokopediaWithWarranty = applyWarrantyMultiplier(combo, tokopediaBase);
  const tiktokWithWarranty = applyWarrantyMultiplier(combo, tiktokBase);
  const shopeeWithWarranty = applyWarrantyMultiplier(combo, shopeeBase);

  return {
    arrivalCost,
    offlinePrice: applyRoundingRules(offlineWithWarranty),
    entraversePrice: applyRoundingRules(entraverseWithWarranty),
    tokopediaPrice: applyRoundingRules(tokopediaWithWarranty),
    tiktokPrice: applyRoundingRules(tiktokWithWarranty),
    shopeePrice: applyRoundingRules(shopeeWithWarranty),
    tokopediaFee: tokopediaFee.percentDisplay,
    tiktokFee: tiktokFee.percentDisplay,
    shopeeFee: shopeeFee.percentDisplay,
  };
};

export default function VariantTable({
  combinations,
  matrixData,
  onUpdateField,
  inventoryVolumeCbm = 0,
  shippingRateDefaults,
  onShippingRatesChange,
  categoryPricing,
}: VariantTableProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [exchangeMode, setExchangeMode] = useState<ExchangeMode>("auto");
  const [exchangeRates, setExchangeRates] = useState<Record<MatrixPricing["currency"], number>>(BASE_EXCHANGE_RATES);
  const [rateCurrency, setRateCurrency] = useState<MatrixPricing["currency"]>("SGD");
  const [rateInput, setRateInput] = useState<number>(BASE_EXCHANGE_RATES.SGD);
  const [shippingMethod, setShippingMethod] = useState<MatrixPricing["shipping"]>("Laut");
  const [shippingRates, setShippingRates] = useState<ShippingRates>(() => normalizeShippingRates(shippingRateDefaults));
  const [shippingRateInput, setShippingRateInput] = useState<number>(() => normalizeShippingRates(shippingRateDefaults).Laut);
  const [lastRateSyncAt, setLastRateSyncAt] = useState<Date>(new Date());
  const { calculateVariant } = useVariantCalculations();

  const normalizedRows = useMemo(() => {
    const result: Record<string, MatrixPricing> = {};
    combinations.forEach((combo) => {
      const calculated = calculateVariant({ ...DEFAULT_MATRIX_ROW, ...(matrixData[combo.key] ?? {}) });
      result[combo.key] = {
        ...calculated,
        ...updateComputedPricingForRow(combo, calculated, categoryPricing, inventoryVolumeCbm, shippingRates),
      };
    });
    return result;
  }, [calculateVariant, categoryPricing, combinations, inventoryVolumeCbm, matrixData, shippingRates]);

  useEffect(() => {
    const normalized = normalizeShippingRates(shippingRateDefaults);
    setShippingRates((prev) => (isShippingRateEqual(prev, normalized) ? prev : normalized));
  }, [shippingRateDefaults]);

  useEffect(() => {
    setShippingRateInput(shippingRates[shippingMethod]);
  }, [shippingMethod, shippingRates]);

  useEffect(() => {
    if (exchangeMode !== "auto") return;

    combinations.forEach((combo) => {
      const row = normalizedRows[combo.key];
      if (!row) return;

      const targetRate = exchangeRates[row.currency];
      if (!Number.isFinite(targetRate)) return;
      if (row.exchangeValue === targetRate) return;

      onUpdateField(combo.key, "exchangeValue", targetRate);
    });
  }, [combinations, exchangeMode, exchangeRates, normalizedRows, onUpdateField]);

  useEffect(() => {
    combinations.forEach((combo) => {
      const calculatedRow = normalizedRows[combo.key];
      const currentRow = matrixData[combo.key] ?? DEFAULT_MATRIX_ROW;

      PRICE_SYNC_FIELDS.forEach((field) => {
        const nextValue = Math.max(0, toNumber(calculatedRow[field]));
        const currentValue = Math.max(0, toNumber(currentRow[field]));
        if (nextValue !== currentValue) {
          onUpdateField(combo.key, field, nextValue);
        }
      });
    });
  }, [combinations, matrixData, normalizedRows, onUpdateField]);

  const handleApplyRate = () => {
    const normalizedRate = Math.max(0, Number(rateInput) || 0);
    setExchangeRates((prev) => ({
      ...prev,
      [rateCurrency]: normalizedRate,
    }));
    setLastRateSyncAt(new Date());
  };

  const handleResetRates = () => {
    setExchangeRates(BASE_EXCHANGE_RATES);
    setRateInput(BASE_EXCHANGE_RATES[rateCurrency]);
    setLastRateSyncAt(new Date());
  };

  const handleApplyShippingRate = () => {
    const normalizedRate = Math.max(0, Number(shippingRateInput) || 0);
    setShippingRates((prev) => {
      const next = {
        ...prev,
        [shippingMethod]: normalizedRate,
      };
      onShippingRatesChange(next);
      return next;
    });
  };

  const handleResetShippingRates = () => {
    const nextRates = { ...DEFAULT_SHIPPING_RATES };
    setShippingRates(nextRates);
    onShippingRatesChange(nextRates);
  };

  const handleApplyShippingSettings = () => {
    combinations.forEach((combo) => {
      onUpdateField(combo.key, "shipping", shippingMethod);
    });
  };

  return (
    <>
      <div className="relative mb-3 flex items-center justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 shadow-sm transition hover:bg-blue-50"
            title="Pengaturan Kurs & Ongkir"
            aria-label={isSettingsOpen ? "Tutup pengaturan kurs dan ongkir" : "Buka pengaturan kurs dan ongkir"}
            aria-expanded={isSettingsOpen}
          >
            {isSettingsOpen ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
          </button>

          <AnimatePresence>
            {isSettingsOpen ? (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-0 top-12 z-40 w-[min(92vw,860px)] rounded-xl border border-blue-100 bg-white p-4 shadow-xl"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-800">Sistem Kurs (Hybrid)</h3>
                    <p className="mt-1 text-xs text-slate-500">Atur kurs global atau aktifkan mode manual per varian.</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Auto pricing: harga beli mengikuti nilai tukar yang diinput, fee kategori dihitung dari harga beli
                      rupiah, dan opsi Garansi 1 Tahun memakai multiplier fixed 1.06 sebelum pembulatan akhir.
                    </p>
                    {hasWarrantyPricing(categoryPricing?.warrantyPricing) ||
                    (categoryPricing?.warrantyComponents?.length ?? 0) > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hasWarrantyPricing(categoryPricing?.warrantyPricing) ? (
                          <>
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                              {WARRANTY_COST_LABEL}:{" "}
                              {categoryPricing?.warrantyPricing?.cost?.valueType === "amount" ? "Rp" : "%"}{" "}
                              {Math.max(0, toNumber(categoryPricing?.warrantyPricing?.cost?.value ?? 0))}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                              {WARRANTY_PROFIT_LABEL}:{" "}
                              {categoryPricing?.warrantyPricing?.profit?.valueType === "amount" ? "Rp" : "%"}{" "}
                              {Math.max(0, toNumber(categoryPricing?.warrantyPricing?.profit?.value ?? 0))}
                            </span>
                          </>
                        ) : null}
                        {categoryPricing?.warrantyComponents?.map((component) => (
                          <span
                            key={`warranty-${component.label}`}
                            className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700"
                          >
                            {component.label}: {component.valueType === "amount" ? "Rp" : "%"} {Math.max(0, toNumber(component.value))}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white p-1">
                      <button
                        type="button"
                        onClick={() => setExchangeMode("auto")}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          exchangeMode === "auto" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Otomatis
                      </button>
                      <button
                        type="button"
                        onClick={() => setExchangeMode("manual")}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                          exchangeMode === "manual" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Manual
                      </button>
                    </div>

                    {exchangeMode === "auto" ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <select
                          value={rateCurrency}
                          onChange={(event) => {
                            const nextCurrency = event.target.value as MatrixPricing["currency"];
                            setRateCurrency(nextCurrency);
                            setRateInput(exchangeRates[nextCurrency]);
                          }}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none"
                        >
                          {CURRENCY_OPTIONS.map((currencyCode) => (
                            <option key={currencyCode} value={currencyCode}>
                              {currencyCode}
                            </option>
                          ))}
                        </select>
                        <span>1 {rateCurrency} =</span>
                        <input
                          type="number"
                          min={0}
                          value={rateInput}
                          onChange={(event) => setRateInput(Math.max(0, Number(event.target.value) || 0))}
                          className="h-8 w-28 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none"
                        />
                        <span>IDR</span>
                        <button
                          type="button"
                          onClick={handleApplyRate}
                          className="h-8 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                        >
                          Set Kurs
                        </button>
                        <button
                          type="button"
                          onClick={handleResetRates}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Reset
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-amber-700">
                        Mode manual aktif. Kolom <span className="font-semibold">Nilai Tukar Kurs</span> bisa diedit per varian.
                      </p>
                    )}

                    <p className="mt-3 text-[11px] text-slate-500">
                      Last update: {lastRateSyncAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-800">Pengaturan Ongkir</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Biaya kedatangan dihitung real-time berdasarkan metode pengiriman per varian.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1.4fr]">
                      <select
                        value={shippingMethod}
                        onChange={(event) => {
                          const nextMethod = event.target.value as MatrixPricing["shipping"];
                          setShippingMethod(nextMethod);
                          setShippingRateInput(shippingRates[nextMethod]);
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none"
                      >
                        <option value="Laut">Laut</option>
                        <option value="Udara">Udara</option>
                        <option value="Darat">Darat</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                            Rp
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={shippingRateInput}
                            onChange={(event) => setShippingRateInput(Math.max(0, Number(event.target.value) || 0))}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none"
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-500">/{SHIPPING_UNIT_LABEL[shippingMethod]}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyShippingRate}
                        className="h-8 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                      >
                        Set Tarif
                      </button>
                      <button
                        type="button"
                        onClick={handleResetShippingRates}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                      <span className="text-[11px] text-slate-500">
                        Tarif aktif: Rp {formatRupiah.format(shippingRates[shippingMethod])}/{SHIPPING_UNIT_LABEL[shippingMethod]}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">{SHIPPING_HELPER_TEXT[shippingMethod]}</p>
                    {shippingMethod === "Laut" ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Volume produk saat ini: <span className="font-semibold text-slate-700">{inventoryVolumeCbm.toFixed(3)} CBM</span>
                      </p>
                    ) : null}
                    {shippingMethod === "Laut" && inventoryVolumeCbm <= 0 ? (
                      <p className="mt-1 text-[11px] text-amber-700">
                        Isi dimensi di bagian logistik agar ongkir laut bisa dihitung otomatis.
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyShippingSettings}
                        className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                      >
                        Set Metode Pengiriman
                      </button>
                      <span className="text-[11px] text-slate-500">
                        Terapkan metode ini ke semua varian ({combinations.length} varian).
                      </span>
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[5200px] w-full">
          <thead className="bg-slate-50">
            <tr>
              {groupedHeaders.map((group, index) => (
                <th
                  key={group.label}
                  colSpan={group.span}
                  className={`border-b border-slate-200 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide ${group.tone} ${index === 0 ? "sticky left-0 z-30 shadow-[4px_0_8px_rgba(0,0,0,0.04)]" : ""}`}
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              {headers.map((header, index) => {
                const isSticky = index === 0;
                const isPriceChannelHeader = priceChannelHeaders.has(header);
                const renderedHeader = (() => {
                  if (header === "Harga Jual Offline") {
                    return (
                      <span className="inline-flex items-center justify-center whitespace-nowrap">
                        Harga Jual Offline
                      </span>
                    );
                  }

                  if (header === "Harga Jual Tokopedia") {
                    return (
                      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                        <span>Harga Jual</span>
                        <span className={platformLabel.Tokopedia}>Tokopedia</span>
                      </span>
                    );
                  }

                  if (header === "Harga Jual Shopee") {
                    return (
                      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                        <span>Harga Jual</span>
                        <span className={platformLabel.Shopee}>Shopee</span>
                      </span>
                    );
                  }

                  if (header === "Harga Jual Entraverse") {
                    return (
                      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                        <span>Harga Jual</span>
                        <span className={platformLabel.Entraverse}>Entraverse</span>
                      </span>
                    );
                  }

                  return header;
                })();

                return (
                  <th
                    key={header}
                    className={`border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${isPriceChannelHeader ? "whitespace-nowrap text-center" : ""} ${isSticky ? "sticky left-0 z-20 bg-slate-50 shadow-[4px_0_8px_rgba(0,0,0,0.04)]" : ""}`}
                  >
                    {renderedHeader}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {combinations.map((combo) => {
              const row = normalizedRows[combo.key];

              return (
                <VariantRow
                  key={combo.key}
                  combo={combo}
                  row={row}
                  onUpdateField={onUpdateField}
                  selected={selectedKey === combo.key}
                  onSelect={() => {
                    setSelectedKey(combo.key);
                    setShippingMethod(row.shipping);
                    setShippingRateInput(shippingRates[row.shipping]);
                  }}
                  isExchangeValueEditable={exchangeMode === "manual"}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 sm:grid-cols-3">
        <p>
          <span className="font-semibold text-slate-700">Informasi Produk:</span> Varian, stok, SKU, berat.
        </p>
        <p>
          <span className="font-semibold text-slate-700">Harga & Channel:</span> Offline, Entraverse, Tokopedia, Shopee.
        </p>
        <p>
          <span className="font-semibold text-slate-700">Forecast:</span> Periode A/B dan replenishment planning.
        </p>
      </div>
    </>
  );
}
