"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { hasStorefrontSession, buildStorefrontLoginRedirect } from "@/src/lib/auth/access";
import { CartItemList } from "./components/CartItemList";
import { CartSummary } from "./components/CartSummary";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    allSelected,
    summary,
    loading,
    error,
    toggleSelectAll,
    toggleItemSelection,
    updateItemQuantity,
    removeItem,
    isPending,
    refreshCart,
    clearError,
  } = useCart();

  useEffect(() => {
    void refreshCart({ silent: true });
  }, [refreshCart]);

  const zeroPriceItems = useMemo(
    () =>
      items.filter((item) => {
        const isPurchaseItem = !item.tradeInEnabled && !item.tradeInTransactionId;
        return item.selected && isPurchaseItem && item.price <= 0;
      }),
    [items]
  );
  const checkoutBlockedByZeroPrice = zeroPriceItems.length > 0;
  const checkoutBlockedMessage = checkoutBlockedByZeroPrice
    ? "Ada produk terpilih dengan harga jual 0. Produk tersebut tidak bisa dilanjutkan ke checkout."
    : null;

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">Keranjang</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
          Cek kembali barang yang akan dibeli, atur jumlahnya, atau hapus jika tidak diperlukan.
        </p>

        {error ? (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="shrink-0 text-xs font-semibold text-orange-700 transition hover:text-orange-800"
            >
              Tutup
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-8">
            <CartItemList
              items={items}
              allSelected={allSelected}
              selectedCount={summary.selectedLineCount}
              loading={loading}
              isPending={isPending}
              onToggleSelectAll={toggleSelectAll}
              onToggleItemSelection={toggleItemSelection}
              onChangeQuantity={(itemId, quantity) => {
                void updateItemQuantity(itemId, quantity);
              }}
              onRemove={(itemId) => {
                void removeItem(itemId);
              }}
            />
          </div>

          <div className="lg:col-span-4">
            <CartSummary
              summary={summary}
              disabled={summary.selectedLineCount === 0 || loading || checkoutBlockedByZeroPrice}
              disabledReason={checkoutBlockedMessage}
              onCheckout={() => {
                if (checkoutBlockedByZeroPrice) {
                  return;
                }

                if (!hasStorefrontSession()) {
                  router.push(buildStorefrontLoginRedirect("/checkout"));
                  return;
                }

                router.push("/checkout");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
