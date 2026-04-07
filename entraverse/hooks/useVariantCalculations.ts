"use client";

import { useCallback } from "react";
import type { MatrixPricing } from "@/types/product";

const nonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

export const useVariantCalculations = () => {
  const calculateVariant = useCallback((variant: MatrixPricing): MatrixPricing => {
    const purchasePrice = nonNegative(variant.purchasePrice);
    const exchangeValue = nonNegative(variant.exchangeValue);
    const arrivalCost = nonNegative(variant.arrivalCost);
    const shippingCost = nonNegative(variant.shippingCost);
    const marginPercent = nonNegative(variant.marginPercent);
    const avgA = nonNegative(variant.avgSalesA);
    const avgB = nonNegative(variant.avgSalesB);
    const leadTime = nonNegative(variant.leadTime);
    const stock = nonNegative(variant.stock);
    const nextProcurement = nonNegative(variant.nextProcurement);

    const avgDailyFinal = (avgA + avgB) / 2;
    const reorderPoint = Math.ceil(avgDailyFinal * leadTime);
    const need15Days = Math.ceil(avgDailyFinal * 15);
    const inTransitStock = Math.max(0, nextProcurement - need15Days);

    let procurementStatus: MatrixPricing["procurementStatus"] = "Normal";
    if (stock <= 0) procurementStatus = "Out of Stock";
    else if (stock <= reorderPoint) procurementStatus = "Low Stock";

    return {
      ...variant,
      purchasePrice,
      exchangeValue,
      arrivalCost,
      shippingCost,
      marginPercent,
      stock,
      avgSalesA: avgA,
      avgSalesB: avgB,
      leadTime,
      nextProcurement,
      avgDailyFinal,
      reorderPoint,
      need15Days,
      inTransitStock,
      procurementStatus,
    };
  }, []);

  return { calculateVariant };
};
