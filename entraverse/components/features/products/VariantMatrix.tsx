"use client";

import { useMemo } from "react";
import { DollarSign, Package, TrendingUp } from "lucide-react";
import type { MatrixPricing, VariantCombination } from "@/types/product";
import type { CategoryFees } from "@/types/category.types";
import { calculateFinalBeli, DEFAULT_MATRIX_ROW } from "@/lib/utils";
import type { WarrantyComponent, WarrantyPricingConfig } from "@/lib/warrantyProgram";
import { sumSharedInventoryStockFromCombinations } from "@/lib/sharedInventory";
import VariantTable from "@/components/features/products/VariantTable";
import { useVariantCalculations } from "@/hooks/useVariantCalculations";
import type { ShippingRates } from "@/types/product";

type VariantMatrixProps = {
  combinations: VariantCombination[];
  matrixData: Record<string, MatrixPricing>;
  updateField: (key: string, field: keyof MatrixPricing, value: number | string) => void;
  inventoryVolumeCbm?: number;
  shippingRates: ShippingRates;
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

const currency = new Intl.NumberFormat("id-ID");

const formatMoney = (value: number) => `Rp ${currency.format(Number.isFinite(value) ? value : 0)}`;

export default function VariantMatrix({
  combinations,
  matrixData,
  updateField,
  inventoryVolumeCbm = 0,
  shippingRates,
  onShippingRatesChange,
  categoryPricing,
}: VariantMatrixProps) {
  const { calculateVariant } = useVariantCalculations();

  const summary = useMemo(() => {
    const rows = combinations.map((combo) => calculateVariant({ ...DEFAULT_MATRIX_ROW, ...(matrixData[combo.key] ?? {}) }));
    const totalStock = sumSharedInventoryStockFromCombinations(combinations, matrixData);
    const avgPurchase = rows.length > 0 ? rows.reduce((sum, row) => sum + calculateFinalBeli(row), 0) / rows.length : 0;
    const warningCount = rows.filter((row) => row.procurementStatus !== "Normal").length;

    return { totalVarian: rows.length, totalStock, avgPurchase, warningCount };
  }, [calculateVariant, combinations, matrixData]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Harga & Detail Varian</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Varian</p>
              <p className="text-3xl font-bold text-slate-800">{summary.totalVarian}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3"><Package className="h-6 w-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Stok</p>
              <p className="text-3xl font-bold text-slate-800">{summary.totalStock}</p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
          </div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Rata-rata Harga Beli</p>
              <p className="text-xl font-bold text-slate-800">{formatMoney(summary.avgPurchase)}</p>
            </div>
            <div className="rounded-full bg-amber-100 p-3"><DollarSign className="h-6 w-6 text-amber-600" /></div>
          </div>
        </div>
        <div className="rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Perlu Perhatian</p>
              <p className="text-3xl font-bold text-slate-800">{summary.warningCount}</p>
            </div>
            <div className="rounded-full bg-rose-100 p-3"><Package className="h-6 w-6 text-rose-600" /></div>
          </div>
        </div>
      </div>

      <VariantTable
        combinations={combinations}
        matrixData={matrixData}
        onUpdateField={updateField}
        inventoryVolumeCbm={inventoryVolumeCbm}
        shippingRateDefaults={shippingRates}
        onShippingRatesChange={onShippingRatesChange}
        categoryPricing={categoryPricing}
      />
    </section>
  );
}
