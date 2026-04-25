"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Share2, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { createWishlistSnapshotFromProduct } from "@/lib/wishlist";
import { cn } from "@/lib/utils";
import { formatCurrencyIDR } from "@/lib/utils/formatter";
import { buildStorefrontLoginRedirect, hasStorefrontSession } from "@/src/lib/auth/access";
import type { ProductDetail } from "@/types/product.types";

interface OrderSidebarProps {
  product: ProductDetail;
  selectedPrice: number;
  selectedVariants: Record<string, string>;
  selectedStock: number;
  selectedVariantSku?: string | null;
}

const STOCK_STYLE: Record<ProductDetail["stock_status"], { label: string; className: string }> = {
  in_stock: { label: "Stok tersedia", className: "text-blue-600" },
  low_stock: { label: "Stok menipis", className: "text-orange-600" },
  out_of_stock: { label: "Stok habis", className: "text-rose-600" },
};

export const OrderSidebar = ({
  product,
  selectedPrice,
  selectedVariants,
  selectedStock,
  selectedVariantSku,
}: OrderSidebarProps) => {
  const router = useRouter();
  const tradeInAvailable = Boolean(product.trade_in);
  const minOrder = Math.max(1, product.min_order ?? 1);
  const availableStock = Math.max(0, selectedStock);
  const quantityLimit = availableStock > 0 ? Math.min(product.max_order ?? availableStock, availableStock) : 0;
  const quantityMax = Math.max(minOrder, quantityLimit);
  const selectedStockStatus: ProductDetail["stock_status"] =
    availableStock <= 0 ? "out_of_stock" : availableStock <= 5 ? "low_stock" : "in_stock";
  const [quantity, setQuantity] = useState(minOrder);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const { addToCart, loading, error } = useCart();
  const { hasHydrated, isInWishlist, isPending, toggleWishlist } = useWishlist();

  const stockInfo = STOCK_STYLE[selectedStockStatus];
  const outOfStock = selectedStockStatus === "out_of_stock" || availableStock < minOrder;
  const priceUnavailable = !Number.isFinite(selectedPrice) || selectedPrice <= 0;
  const purchaseDisabled = outOfStock || priceUnavailable || loading;
  const purchaseBlockedMessage = priceUnavailable
    ? "Produk ini belum bisa dibeli karena harga jual belum tersedia."
    : outOfStock
      ? `Minimal pembelian ${minOrder} item, tetapi stok yang tersedia hanya ${availableStock}.`
      : null;
  const isWishlisted = hasHydrated && isInWishlist(product.id);
  const wishlistPending = hasHydrated && isPending(product.id);
  const normalizedQuantity = useMemo(() => {
    if (availableStock <= 0) return minOrder;
    return Math.min(Math.max(quantity, minOrder), quantityMax);
  }, [availableStock, minOrder, quantity, quantityMax]);
  const subtotal = useMemo(() => normalizedQuantity * selectedPrice, [normalizedQuantity, selectedPrice]);
  const variantSummary = Object.values(selectedVariants)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(", ");

  useEffect(() => {
    if (!shareFeedback) return undefined;

    const timeoutId = window.setTimeout(() => setShareFeedback(null), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [shareFeedback]);

  const handleAddToCart = async () => {
    if (priceUnavailable) {
      return;
    }

    await addToCart(product.id, normalizedQuantity, selectedVariants, {
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: selectedPrice,
      variantSku: selectedVariantSku ?? undefined,
      stock: availableStock,
      minOrder,
      tradeInEnabled: false,
    });
  };

  const handleBuyNow = async () => {
    if (priceUnavailable) {
      return;
    }

    const result = await addToCart(product.id, normalizedQuantity, selectedVariants, {
      name: product.name,
      slug: product.slug,
      image: product.image,
      price: selectedPrice,
      variantSku: selectedVariantSku ?? undefined,
      stock: availableStock,
      minOrder,
      tradeInEnabled: false,
    });
    if (result.success) {
      router.push("/checkout");
    }
  };

  const handleTradeIn = () => {
    const params = new URLSearchParams();

    if (selectedVariantSku) {
      params.set("variant_sku", selectedVariantSku);
    }

    const query = params.toString();
    const tradeInPath = query ? `/trade-in/question/${product.slug}?${query}` : `/trade-in/question/${product.slug}`;

    if (!hasStorefrontSession()) {
      router.push(buildStorefrontLoginRedirect(tradeInPath));
      return;
    }

    router.push(tradeInPath);
  };

  const handleToggleWishlist = async () => {
    await toggleWishlist(product.id, createWishlistSnapshotFromProduct(product));
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : `/products/${product.slug}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `Lihat ${product.name} di Entraverse`,
          url: shareUrl,
        });
        setShareFeedback("Link produk berhasil dibagikan.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback("Link produk disalin.");
        return;
      }

      setShareFeedback("Browser belum mendukung fitur share.");
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        return;
      }
      setShareFeedback("Gagal membagikan link produk.");
    }
  };

  return (
    <>
      <aside className="rounded-3xl border border-transparent bg-white p-5 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.45)] lg:sticky lg:top-24">
        <h2 className="text-2xl font-semibold text-slate-900">Rincian Pesanan</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Pilih varian terlebih dahulu untuk melihat total dan stok secara akurat.
        </p>

        <div className="mt-5 text-sm">
          <div className="flex items-center justify-between border-b border-slate-200 py-3">
            <span className="text-slate-500">{stockInfo.label}</span>
            <span className={cn("text-lg font-semibold", stockInfo.className)}>{availableStock}</span>
          </div>

          <div className="hidden items-center justify-between border-b border-slate-200 py-3 lg:flex">
            <span className="text-slate-500">Jumlah</span>
            <QuantitySelector value={normalizedQuantity} onChange={setQuantity} min={minOrder} max={quantityMax} />
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 py-3">
            <span className="text-slate-500">Varian dipilih</span>
            <span className="max-w-[58%] truncate text-right text-base font-semibold text-slate-900">
              {variantSummary || "Belum dipilih"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 py-3">
            <span className="text-slate-500">Harga</span>
            <span className="text-base font-semibold text-slate-900">{formatCurrencyIDR(selectedPrice)}</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-slate-500">Total</span>
            <span className="text-2xl font-bold text-slate-900">{formatCurrencyIDR(subtotal)}</span>
          </div>

          <div className="mt-3 hidden lg:block">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={handleAddToCart}
                loading={loading}
                disabled={purchaseDisabled}
                className={cn(
                  "h-12 rounded-2xl bg-blue-100 text-lg text-blue-700 hover:bg-blue-200",
                  tradeInAvailable ? "flex-1" : "w-full"
                )}
              >
                + Keranjang
              </Button>

              {tradeInAvailable ? (
                <Button
                  type="button"
                  onClick={handleTradeIn}
                  disabled={loading}
                  className="h-12 flex-1 rounded-2xl bg-emerald-600 text-lg hover:bg-emerald-700"
                >
                  Trade In
                </Button>
              ) : null}
            </div>
          </div>

          {purchaseBlockedMessage ? <p className="mt-2 text-xs font-medium text-amber-600">{purchaseBlockedMessage}</p> : null}
          {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleToggleWishlist}
              disabled={wishlistPending}
              className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Heart className={cn("h-4 w-4", isWishlisted && "fill-rose-500 text-rose-500")} />
              Wishlist
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 transition hover:text-blue-700"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {shareFeedback ? <p className="mt-2 text-xs text-slate-500">{shareFeedback}</p> : null}

          <div className="mt-3 flex items-center gap-2.5 border-t border-slate-200 pt-3">
            <Image
              src="/assets/images/hero/e-logo.png?v=3"
              alt="Entraverse"
              width={53}
              height={82}
              className="h-6 w-4 shrink-0 object-contain"
              unoptimized
            />
            <p className="text-[15px] font-medium leading-none text-slate-500">Dijual dan dikirim oleh Entraverse</p>
          </div>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 overflow-x-hidden border-t border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,250,255,0.98)_100%)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_36px_-20px_rgba(15,23,42,0.5)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/88 p-3 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
          {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

          <div className="flex items-end justify-between gap-3 px-1 pb-0.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">Total</p>
              <p className="truncate text-lg font-bold text-slate-900">{formatCurrencyIDR(subtotal)}</p>
            </div>
            <p className="text-[11px] font-medium text-slate-400">Siap checkout cepat</p>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <QuantitySelector
              value={normalizedQuantity}
              onChange={setQuantity}
              min={minOrder}
              max={quantityMax}
              className="shrink-0 shadow-sm"
            />
          </div>

          <div className="mt-2.5 flex min-w-0 items-center justify-end gap-2.5">
            <Button
              type="button"
              onClick={handleAddToCart}
              loading={loading}
              disabled={purchaseDisabled}
              aria-label="Tambahkan ke keranjang"
              className="h-10 w-10 shrink-0 rounded-xl border border-blue-200 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] px-0 text-blue-700 shadow-[0_10px_24px_-18px_rgba(37,99,235,0.75)] hover:bg-[linear-gradient(180deg,#dbeafe_0%,#bfdbfe_100%)]"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              onClick={handleBuyNow}
              loading={loading}
              disabled={purchaseDisabled}
              className={cn(
                "h-10 min-w-0 rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#315efb_60%,#1d4ed8_100%)] px-3 text-sm shadow-[0_18px_30px_-18px_rgba(37,99,235,0.9)] hover:bg-[linear-gradient(135deg,#1d4ed8_0%,#315efb_55%,#1e40af_100%)]",
                tradeInAvailable ? "order-3 flex-[1.15]" : "order-2 flex-[1.35]"
              )}
            >
              <span className="inline-flex min-w-0 items-center gap-2 leading-none">
                <Zap className="h-4 w-4 shrink-0" />
                <span className="truncate whitespace-nowrap">Beli Langsung</span>
              </span>
            </Button>

            {tradeInAvailable ? (
              <Button
                type="button"
                onClick={handleTradeIn}
                disabled={loading}
                className="order-2 h-10 min-w-0 flex-[0.95] rounded-xl bg-emerald-600 px-3 text-sm hover:bg-emerald-700"
              >
                <span className="truncate whitespace-nowrap">Trade In</span>
              </Button>
            ) : null}
          </div>

          {purchaseBlockedMessage ? <p className="mt-2 text-xs font-medium text-amber-600">{purchaseBlockedMessage}</p> : null}
        </div>
      </div>
    </>
  );
};
