"use client";

import { RefreshCcw } from "lucide-react";

type TradeInToggleProps = {
  tradeIn: boolean;
  toggleTradeIn: () => void;
};

export default function TradeInToggle({ tradeIn, toggleTradeIn }: TradeInToggleProps) {
  return (
    <section className="flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
          <RefreshCcw className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Trade-In</h2>
          <p className="text-sm text-slate-500">
            Aktifkan trade-in agar produk dapat ditukar dengan barang lama.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTradeIn}
        aria-pressed={tradeIn}
        className={`relative h-8 w-14 rounded-full transition ${
          tradeIn ? "bg-blue-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition ${
            tradeIn ? "left-7" : "left-1"
          }`}
        />
      </button>
    </section>
  );
}
