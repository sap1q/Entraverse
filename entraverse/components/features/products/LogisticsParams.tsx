"use client";

import type { InventoryPlan } from "@/types/product";

type LogisticsField = Exclude<keyof InventoryPlan, "volume" | "shippingRates">;

type LogisticsParamsProps = {
  logistics: InventoryPlan;
  updateLogistics: (field: LogisticsField, value: number) => void;
};

const inputBaseClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-12 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white";

export default function LogisticsParams({ logistics, updateLogistics }: LogisticsParamsProps) {
  return (
    <section className="space-y-4 rounded-xl border border-blue-100 bg-slate-50 p-4">
      <h2 className="text-xl font-semibold text-slate-800">Parameter Perencanaan Stok</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Berat
          </label>
          <div className="relative">
            <input
              type="number"
              value={logistics.weight}
              onChange={(event) => updateLogistics("weight", Number(event.target.value))}
              className={inputBaseClass}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              G
            </span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Panjang
          </label>
          <div className="relative">
            <input
              type="number"
              value={logistics.length}
              onChange={(event) => updateLogistics("length", Number(event.target.value))}
              className={inputBaseClass}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              CM
            </span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Lebar
          </label>
          <div className="relative">
            <input
              type="number"
              value={logistics.width}
              onChange={(event) => updateLogistics("width", Number(event.target.value))}
              className={inputBaseClass}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              CM
            </span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Tinggi
          </label>
          <div className="relative">
            <input
              type="number"
              value={logistics.height}
              onChange={(event) => updateLogistics("height", Number(event.target.value))}
              className={inputBaseClass}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
              CM
            </span>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Volume
          </label>
          <div className="relative">
            <input
              type="number"
              readOnly
              value={logistics.volume}
              className="h-12 w-full rounded-xl border border-blue-200 bg-blue-50 pl-4 pr-12 text-sm text-blue-800 outline-none"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-700">
              M³
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
