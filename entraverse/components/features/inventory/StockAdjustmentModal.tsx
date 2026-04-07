"use client";

import { useMemo, useState } from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";

export type StockAdjustmentReason = "restock" | "damage" | "stock_opname" | "sale";
export type StockAdjustmentType = "in" | "out" | "adjustment";
export type StockAdjustmentDirection = "increment" | "decrement";

export type StockAdjustmentPayload = {
  product_id: string;
  variant_sku: string;
  warehouse: string;
  type: StockAdjustmentType;
  quantity: number;
  reason: StockAdjustmentReason;
  direction: StockAdjustmentDirection;
  note?: string;
  allow_negative: boolean;
  reference: "manual";
};

export type StockAdjustmentTarget = {
  productId: string;
  productName: string;
  sku: string;
  warehouse: string;
  currentStock: number;
};

type StockAdjustmentModalProps = {
  open: boolean;
  target: StockAdjustmentTarget | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: StockAdjustmentPayload) => Promise<void>;
};

const reasonOptions: Array<{ value: StockAdjustmentReason; label: string }> = [
  { value: "restock", label: "Restock" },
  { value: "damage", label: "Damage" },
  { value: "stock_opname", label: "Stock Opname" },
  { value: "sale", label: "Sale" },
];

const resolveType = (reason: StockAdjustmentReason): StockAdjustmentType => {
  if (reason === "restock") return "in";
  if (reason === "damage" || reason === "sale") return "out";
  return "adjustment";
};

export default function StockAdjustmentModal({
  open,
  target,
  loading,
  onClose,
  onSubmit,
}: StockAdjustmentModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<StockAdjustmentReason>("restock");
  const [direction, setDirection] = useState<StockAdjustmentDirection>("increment");
  const [note, setNote] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [formError, setFormError] = useState("");

  const type = useMemo(() => resolveType(reason), [reason]);
  const adjustmentDirection: StockAdjustmentDirection = type === "adjustment"
    ? direction
    : (type === "in" ? "increment" : "decrement");

  const projectedStock = useMemo(() => {
    if (!target) return 0;
    if (adjustmentDirection === "increment") return target.currentStock + quantity;
    return target.currentStock - quantity;
  }, [adjustmentDirection, quantity, target]);

  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Penyesuaian Stok</h3>
            <p className="mt-1 text-sm text-slate-500">{target.productName}</p>
            <p className="text-xs text-slate-500">
              SKU: <span className="font-semibold text-slate-700">{target.sku}</span> | {target.warehouse}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
            aria-label="Tutup modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Stok saat ini: <span className="font-semibold">{target.currentStock}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as StockAdjustmentReason)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={type !== "adjustment"}
                onClick={() => setDirection("increment")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  adjustmentDirection === "increment"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Increment
              </button>
              <button
                type="button"
                disabled={type !== "adjustment"}
                onClick={() => setDirection("decrement")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  adjustmentDirection === "decrement"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Decrement
              </button>
            </div>
            {type !== "adjustment" ? (
              <p className="text-xs text-slate-500">
                Mode otomatis mengikuti reason: <span className="font-semibold text-slate-700">{type === "in" ? "Tambah" : "Kurangi"}</span>
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jumlah</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Kurangi jumlah"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-300"
              />
              <button
                type="button"
                onClick={() => setQuantity((prev) => prev + 1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Tambah jumlah"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300"
              placeholder="Tambahkan catatan penyesuaian..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={allowNegative}
              onChange={(event) => setAllowNegative(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            Izinkan stok minus untuk penyesuaian ini
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Proyeksi stok setelah submit:{" "}
            <span className={`font-semibold ${projectedStock < 0 ? "text-rose-600" : "text-slate-700"}`}>
              {projectedStock}
            </span>
          </div>

          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setFormError("");
              try {
                await onSubmit({
                  product_id: target.productId,
                  variant_sku: target.sku,
                  warehouse: target.warehouse,
                  type,
                  quantity,
                  reason,
                  direction: adjustmentDirection,
                  note: note.trim() || undefined,
                  allow_negative: allowNegative,
                  reference: "manual",
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Gagal menyesuaikan stok.";
                setFormError(message);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan Penyesuaian
          </button>
        </div>
      </div>
    </div>
  );
}
