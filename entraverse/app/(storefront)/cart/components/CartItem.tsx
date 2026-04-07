"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { formatCurrencyIDR } from "@/lib/utils/formatter";
import type { CartItem as CartLineItem } from "@/types/cart.types";

interface CartItemProps {
  item: CartLineItem;
  pending?: boolean;
  onToggleSelection: (itemId: string, selected: boolean) => void;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

const formatVariants = (variants: Record<string, string>): string => {
  const entries = Object.entries(variants);
  if (entries.length === 0) return "Varian: Default";

  return entries.map(([name, value]) => `${name}: ${value}`).join(", ");
};

const formatDiscountCurrencyIDR = (value: number): string => {
  return formatCurrencyIDR(value).replace("Rp ", "Rp -");
};

export function CartItem({
  item,
  pending = false,
  onToggleSelection,
  onChangeQuantity,
  onRemove,
}: CartItemProps) {
  const hasTradeInFlow = item.tradeInEnabled || Boolean(item.tradeInTransactionId);
  const hasTradeInDiscount = hasTradeInFlow && item.tradeInValue > 0;
  const canDecrement = item.quantity > item.minOrder;
  const canIncrement = item.quantity < item.stock;
  const displayLineTotal = (item.displayPrice ?? item.price) * item.quantity;
  const hasStockLimit = Number.isFinite(item.stock) && item.stock < Number.MAX_SAFE_INTEGER;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <label className="mt-1 inline-flex shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={item.selected}
            disabled={pending}
            onChange={(event) => onToggleSelection(item.id, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            aria-label={`Pilih ${item.name}`}
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">{item.name}</h3>
                {hasTradeInFlow ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    Trade-In
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">{formatVariants(item.variants)}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatCurrencyIDR(item.displayPrice ?? item.price)} / item
              </p>

              {hasStockLimit ? (
                <p className="mt-1 text-xs text-slate-500">
                  Stok tersisa {item.stock} item
                  {item.quantity >= item.stock ? " (maksimal)" : ""}
                </p>
              ) : null}

              {hasTradeInDiscount ? (
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  Potongan Trade-In: {formatDiscountCurrencyIDR(item.tradeInValue)}
                </p>
              ) : null}
            </div>

            <div className="hidden text-right sm:block">
              <p className="text-base font-semibold text-slate-900">{formatCurrencyIDR(displayLineTotal)}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => onChangeQuantity(item.id, item.quantity - 1)}
                disabled={!canDecrement || pending}
                className="grid h-8 w-8 place-items-center rounded-l-xl text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Kurangi jumlah"
              >
                -
              </button>
              <span className="inline-flex h-8 min-w-10 items-center justify-center border-x border-slate-200 px-2 text-sm font-semibold text-slate-900">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => onChangeQuantity(item.id, item.quantity + 1)}
                disabled={!canIncrement || pending}
                className="grid h-8 w-8 place-items-center rounded-r-xl text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tambah jumlah"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right sm:hidden">
                <p className="text-sm font-semibold text-slate-900">{formatCurrencyIDR(displayLineTotal)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={pending}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Hapus ${item.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
