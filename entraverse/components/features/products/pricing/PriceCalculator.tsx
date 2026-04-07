"use client";

import { useProductPricing } from "@/hooks/useProductPricing";
import { useEffect } from "react";
import FeeComponentList from "@/components/features/products/pricing/FeeComponentList";
import PriceBreakdownTable from "@/components/features/products/pricing/PriceBreakdownTable";
import ShippingCostInput from "@/components/features/products/pricing/ShippingCostInput";
import WarrantyCalculator from "@/components/features/products/pricing/WarrantyCalculator";
import type { PriceBreakdown, PricingFormInput } from "@/types/product.types";

type PriceCalculatorProps = {
  initialInput?: Partial<PricingFormInput>;
  onChange?: (payload: { input: PricingFormInput; breakdown: PriceBreakdown }) => void;
};

export default function PriceCalculator({ initialInput, onChange }: PriceCalculatorProps) {
  const { input, breakdown, setField } = useProductPricing(initialInput);
  const inputClass = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";

  useEffect(() => {
    onChange?.({ input, breakdown });
  }, [breakdown, input, onChange]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-800">Price Calculator</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs">
          <span>Harga Beli</span>
          <input type="number" min={0} className={inputClass} value={input.basePriceAmount} onChange={(e) => setField("basePriceAmount", Number(e.target.value) || 0)} />
        </label>
        <label className="space-y-1 text-xs">
          <span>Mata Uang</span>
          <select className={inputClass} value={input.basePriceCurrency} onChange={(e) => setField("basePriceCurrency", e.target.value as typeof input.basePriceCurrency)}>
            <option value="USD">USD</option>
            <option value="CNY">CNY</option>
            <option value="IDR">IDR</option>
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span>Kurs</span>
          <input type="number" min={0} className={inputClass} value={input.exchangeRate} onChange={(e) => setField("exchangeRate", Number(e.target.value) || 0)} />
        </label>
      </div>

      <ShippingCostInput
        weightKg={input.weightKg}
        volumeCbm={input.volumeCbm}
        shippingAirRate={input.shippingAirRate}
        shippingSeaRate={input.shippingSeaRate}
        onChange={setField}
      />

      <FeeComponentList
        tiktokCommissionPercent={input.tiktokCommissionPercent}
        xtraCashbackPercent={input.xtraCashbackPercent}
        shopeeInsurancePercent={input.shopeeInsurancePercent}
        tokopediaFeePercent={input.tokopediaFeePercent}
        shopeeFeePercent={input.shopeeFeePercent}
        tiktokFeePercent={input.tiktokFeePercent}
        onChange={setField}
      />

      <WarrantyCalculator
        warrantyCostPercent={input.warrantyCostPercent}
        warrantyProfitPercent={input.warrantyProfitPercent}
        shippingNewCost={input.shippingNewCost}
        onChange={setField}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs">
          <span>Margin (%)</span>
          <input type="number" min={0} className={inputClass} value={input.marginPercent} onChange={(e) => setField("marginPercent", Number(e.target.value) || 0)} />
        </label>
        <label className="space-y-1 text-xs">
          <span>Pembulatan (opsional)</span>
          <input type="number" min={0} className={inputClass} value={input.roundToNearest} onChange={(e) => setField("roundToNearest", Number(e.target.value) || 0)} />
        </label>
      </div>

      <PriceBreakdownTable breakdown={breakdown} />
    </section>
  );
}
