"use client";

import { useMemo } from "react";
import type { MatrixPricing } from "@/types/product";

type PriceCalculatorModalProps = {
  open: boolean;
  variant: MatrixPricing | null;
  onClose: () => void;
  onApplyAll: () => void;
};

const money = new Intl.NumberFormat("id-ID");

const formatMoney = (value: number): string => `Rp ${money.format(Number.isFinite(value) ? value : 0)}`;

export default function PriceCalculatorModal({ open, variant, onClose, onApplyAll }: PriceCalculatorModalProps) {
  const summary = useMemo(() => {
    if (!variant) return { base: 0, total: 0 };
    const base = variant.purchasePrice * variant.exchangeValue + variant.arrivalCost;
    return { base, total: base + variant.shippingCost };
  }, [variant]);

  if (!open || !variant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" onClick={onClose} className="fixed inset-0 bg-black/50" aria-label="Close calculator" />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Kalkulasi Harga Jual</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>Harga Beli: {formatMoney(summary.base)}</p>
          <p>Pengiriman ({variant.shipping}): {formatMoney(variant.shippingCost)}</p>
          <p>Total Biaya: {formatMoney(summary.total)}</p>
          <p>Entraverse: {formatMoney(variant.entraversePrice)}</p>
          <p>Tokopedia: {formatMoney(variant.tokopediaPrice)}</p>
          <p>Shopee: {formatMoney(variant.shopeePrice)}</p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyAll();
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Terapkan ke Semua Varian
          </button>
        </div>
      </div>
    </div>
  );
}

