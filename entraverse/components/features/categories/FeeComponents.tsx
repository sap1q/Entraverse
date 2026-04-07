"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CategoryFees, FeeComponent, ValueType } from "@/types/category.types";

type FeeComponentsProps = {
  fees: CategoryFees;
  onChange: (next: CategoryFees) => void;
};

const channels = [
  { key: "marketplace", label: "Marketplace (Tokopedia/TikTok)" },
  { key: "shopee", label: "Shopee" },
  { key: "entraverse", label: "Entraverse" },
] as const;

const createComponent = (): FeeComponent => ({
  id: crypto.randomUUID(),
  label: "",
  value: "",
  valueType: "percent",
  min: 0,
  max: 0,
});

const rupiahFormatter = new Intl.NumberFormat("id-ID");

const formatRupiahInput = (value: number | string | undefined): string =>
  rupiahFormatter.format(Math.max(0, Number(value) || 0));

const parseRupiahInput = (value: string): number => {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number(digits) || 0;
};

const normalizePercentInput = (value: string): string => {
  const normalized = value
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1");

  if (!normalized || normalized === ".") {
    return "";
  }

  return normalized;
};

export default function FeeComponents({ fees, onChange }: FeeComponentsProps) {
  const syncMarketplaceAliases = (nextFees: CategoryFees): CategoryFees => {
    const marketplaceComponents = nextFees.marketplace?.components ?? [];
    const clonedComponents = marketplaceComponents.map((component) => ({ ...component }));

    return {
      ...nextFees,
      tokopedia: { components: clonedComponents.map((component) => ({ ...component })) },
      tokopedia_tiktok: { components: clonedComponents.map((component) => ({ ...component })) },
    };
  };

  const updateFee = (channel: keyof CategoryFees, updater: (items: FeeComponent[]) => FeeComponent[]) => {
    const current = fees[channel]?.components ?? [];
    const nextFees: CategoryFees = {
      ...fees,
      [channel]: {
        components: updater(current),
      },
    };

    onChange(channel === "marketplace" ? syncMarketplaceAliases(nextFees) : nextFees);
  };

  const updateField = (
    channel: keyof CategoryFees,
    index: number,
    key: keyof FeeComponent,
    value: string | number | ValueType
  ) => {
    updateFee(channel, (items) => {
      const base = items.length > 0 ? items : [createComponent()];
      return base.map((item, idx) => (idx === index ? { ...item, [key]: value } : item));
    });
  };

  return (
    <div className="space-y-4">
      {channels.map((channel) => {
        const list = fees[channel.key].components;

        return (
          <section key={channel.key} className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{channel.label}</h3>
              <button
                type="button"
                onClick={() => updateFee(channel.key, (items) => [...items, createComponent()])}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Komponen
              </button>
            </div>

            <div className="space-y-2">
              {(list.length ? list : [createComponent()]).map((item, index) => (
                <div
                  key={item.id ?? `${channel.key}-${index}`}
                  className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[minmax(0,3.2fr)_140px_minmax(0,1.5fr)_110px_110px_140px]"
                >
                  <input
                    value={item.label}
                    onChange={(event) => updateField(channel.key, index, "label", event.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    placeholder="Nama komponen"
                    title="Nama komponen biaya"
                  />
                  <select
                    value={item.valueType}
                    onChange={(event) => {
                      const nextType = event.target.value as ValueType;
                      const currentRaw = String(item.value ?? "");
                      const nextValue =
                        nextType === "amount"
                          ? parseRupiahInput(currentRaw)
                          : normalizePercentInput(currentRaw);

                      updateFee(channel.key, (items) => {
                        const base = items.length > 0 ? items : [createComponent()];
                        return base.map((row, idx) =>
                          idx === index
                            ? { ...row, valueType: nextType, value: nextValue }
                            : row
                        );
                      });
                    }}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    title="Pilih jenis nilai"
                  >
                    <option value="percent">%</option>
                    <option value="amount">Rp</option>
                  </select>
                  <div className="relative">
                    {item.valueType === "amount" ? (
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                        Rp
                      </span>
                    ) : null}
                    <input
                      type="text"
                      inputMode={item.valueType === "amount" ? "numeric" : "decimal"}
                      value={
                        item.valueType === "amount"
                          ? formatRupiahInput(item.value ?? 0)
                          : String(item.value ?? "")
                      }
                      onChange={(event) => {
                        if (item.valueType === "amount") {
                          updateField(channel.key, index, "value", parseRupiahInput(event.target.value));
                          return;
                        }

                        updateField(channel.key, index, "value", normalizePercentInput(event.target.value));
                      }}
                      className={`h-10 w-full rounded-lg border border-slate-200 bg-white text-sm ${
                        item.valueType === "amount" ? "pl-8 pr-3" : "px-3"
                      }`}
                      placeholder={item.valueType === "amount" ? "Nilai Rp" : "Nilai %"}
                      title="Nilai biaya (persen atau rupiah)"
                    />
                  </div>
                  <div className="relative min-w-[110px]">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatRupiahInput(item.min ?? 0)}
                      onChange={(event) => updateField(channel.key, index, "min", parseRupiahInput(event.target.value))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-sm"
                      placeholder="Min"
                      title="Batas minimum biaya dalam Rupiah"
                    />
                  </div>
                  <div className="relative min-w-[110px]">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatRupiahInput(item.max ?? 0)}
                      onChange={(event) => updateField(channel.key, index, "max", parseRupiahInput(event.target.value))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 text-sm"
                      placeholder="Max"
                      title="Batas maksimum biaya dalam Rupiah"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateFee(channel.key, (items) => items.filter((_, idx) => idx !== index))}
                    className="h-10 rounded-lg border border-rose-200 bg-rose-50 px-3 text-rose-600 hover:bg-rose-100"
                    title="Hapus komponen biaya"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
