"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PlatformPrices, PriceBreakdown, PricingFormInput } from "@/types/product.types";

const DEFAULT_INPUT: PricingFormInput = {
  basePriceAmount: 0,
  basePriceCurrency: "USD",
  exchangeRate: 15500,
  weightKg: 0,
  volumeCbm: 0,
  shippingAirRate: 155000,
  shippingSeaRate: 7500000,
  marginPercent: 0,
  tiktokCommissionPercent: 4,
  xtraCashbackPercent: 4.5,
  shopeeInsurancePercent: 0.5,
  warrantyCostPercent: 3,
  warrantyProfitPercent: 100,
  shippingNewCost: 0,
  tokopediaFeePercent: 0,
  shopeeFeePercent: 9,
  tiktokFeePercent: 8.5,
  roundToNearest: 0,
};

const numberOrZero = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);
const percentToValue = (base: number, percent: number): number => base * (numberOrZero(percent) / 100);

const roundPrice = (value: number, nearest = 0): number => {
  const safeNearest = numberOrZero(nearest);
  if (safeNearest <= 0) return value;
  return Math.round(value / safeNearest) * safeNearest;
};

const calculate = (input: PricingFormInput): PriceBreakdown => {
  const exchangeRate = numberOrZero(input.exchangeRate);
  const basePrice = numberOrZero(input.basePriceAmount) * (input.basePriceCurrency === "IDR" ? 1 : exchangeRate);
  const shippingAir = numberOrZero(input.weightKg) * numberOrZero(input.shippingAirRate);
  const shippingSea = numberOrZero(input.volumeCbm) * numberOrZero(input.shippingSeaRate);
  const commission = percentToValue(basePrice, input.tiktokCommissionPercent);
  const cashback = percentToValue(basePrice, input.xtraCashbackPercent);
  const insurance = percentToValue(basePrice, input.shopeeInsurancePercent);
  const warrantyCost = percentToValue(basePrice, input.warrantyCostPercent);
  const warrantyProfit = percentToValue(warrantyCost, input.warrantyProfitPercent);
  const shippingNew = numberOrZero(input.shippingNewCost);

  const totalCost = basePrice + shippingAir + shippingSea + commission + cashback + insurance + warrantyCost + shippingNew;
  const recommendedPrice = totalCost + percentToValue(totalCost, input.marginPercent);

  const platformPrices: PlatformPrices = {
    entraverse: roundPrice(recommendedPrice, input.roundToNearest),
    tokopedia: roundPrice(recommendedPrice + percentToValue(recommendedPrice, input.tokopediaFeePercent), input.roundToNearest),
    shopee: roundPrice(recommendedPrice + percentToValue(recommendedPrice, input.shopeeFeePercent), input.roundToNearest),
    tiktok: roundPrice(recommendedPrice + percentToValue(recommendedPrice, input.tiktokFeePercent), input.roundToNearest),
  };

  return {
    basePrice,
    exchangeRate,
    shippingAir,
    shippingSea,
    commission,
    cashback,
    insurance,
    warrantyCost,
    warrantyProfit,
    shippingNew,
    totalCost,
    recommendedPrice,
    platformPrices,
  };
};

export function useProductPricing(initial?: Partial<PricingFormInput>, debounceMs = 220) {
  const [input, setInput] = useState<PricingFormInput>({ ...DEFAULT_INPUT, ...initial });
  const [debouncedInput, setDebouncedInput] = useState<PricingFormInput>({ ...DEFAULT_INPUT, ...initial });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), debounceMs);
    return () => clearTimeout(timer);
  }, [input, debounceMs]);

  const breakdown = useMemo(() => calculate(debouncedInput), [debouncedInput]);

  const setField = useCallback(<K extends keyof PricingFormInput>(key: K, value: PricingFormInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setInput({ ...DEFAULT_INPUT, ...initial }), [initial]);

  return {
    input,
    breakdown,
    setField,
    setInput,
    reset,
  };
}
