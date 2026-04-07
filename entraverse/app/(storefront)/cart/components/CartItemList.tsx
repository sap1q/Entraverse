"use client";

import Link from "next/link";
import type { CartItem as CartLineItem } from "@/types/cart.types";
import { CartItem } from "./CartItem";

interface CartItemListProps {
  items: CartLineItem[];
  allSelected: boolean;
  selectedCount: number;
  loading?: boolean;
  isPending: (itemId: string) => boolean;
  onToggleSelectAll: (selected: boolean) => void;
  onToggleItemSelection: (itemId: string, selected: boolean) => void;
  onChangeQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function CartItemList({
  items,
  allSelected,
  selectedCount,
  loading = false,
  isPending,
  onToggleSelectAll,
  onToggleItemSelection,
  onChangeQuantity,
  onRemove,
}: CartItemListProps) {
  const storedQuantity = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={loading || items.length === 0}
            onChange={(event) => onToggleSelectAll(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            aria-label="Pilih semua item keranjang"
          />
          <span className="text-sm font-semibold text-slate-900 sm:text-base">Pilih Semua ({selectedCount})</span>
        </label>
        <p className="text-xs text-slate-500 sm:text-sm">{storedQuantity} barang tersimpan</p>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">Keranjang kamu masih kosong</p>
          <p className="mt-2 text-sm text-slate-500">Tambahkan produk dulu, lalu atur jumlahnya di sini.</p>
          <Link
            href="/products"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Lihat Produk
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              pending={isPending(item.id)}
              onToggleSelection={onToggleItemSelection}
              onChangeQuantity={onChangeQuantity}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
