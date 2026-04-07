"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, MapPin, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CustomerOrder } from "@/lib/api/customer-orders";
import { formatDisplayAddress, toTitleCaseAddress } from "@/lib/utils/address";

type TradeInFulfillmentNoticeProps = {
  order: CustomerOrder;
  submitting?: boolean;
  onSubmit: (payload: {
    fulfillment_method: "pengiriman" | "offline_store";
    shipment_tracking_number?: string | null;
  }) => Promise<void> | void;
};

const normalize = (value: string | null | undefined): string => String(value ?? "").trim().toLowerCase();

export function TradeInFulfillmentNotice({
  order,
  submitting = false,
  onSubmit,
}: TradeInFulfillmentNoticeProps) {
  const tradeInStatus = normalize(order.tradeInStatus);
  const savedMethod = normalize(order.tradeInFulfillmentMethod);
  const initialMethod = savedMethod === "offline_store" ? "offline_store" : "pengiriman";
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pengiriman" | "offline_store">(initialMethod);
  const [trackingNumber, setTrackingNumber] = useState(order.tradeInShipmentTrackingNumber ?? "");

  const shouldRender = useMemo(() => {
    if (!order.hasTradeIn || order.statusGroup === "cancelled") return false;

    return ["disetujui", "menunggu_pengiriman", "kunjungan_toko", "dikirim_pelanggan"].includes(tradeInStatus);
  }, [order.hasTradeIn, order.statusGroup, tradeInStatus]);

  const canSubmit = tradeInStatus === "disetujui" || tradeInStatus === "menunggu_pengiriman" || tradeInStatus === "kunjungan_toko";
  const isPhysicalVerification = tradeInStatus === "dikirim_pelanggan";
  const isStoreVisit = fulfillmentMethod === "offline_store" || tradeInStatus === "kunjungan_toko";

  if (!shouldRender) return null;

  const title = isPhysicalVerification
    ? "Produk trade-in sedang menunggu verifikasi fisik"
    : isStoreVisit
      ? "Datang ke store untuk verifikasi trade-in"
      : "Kirim produk trade-in ke toko kami";

  const description = isPhysicalVerification
    ? "Device lama Anda sudah ditandai dalam perjalanan ke toko. Tim kami akan lanjut ke pengecekan fisik setelah paket diterima."
    : isStoreVisit
      ? "Trade-in Anda sudah disetujui. Bawa device, aksesorinya, dan data transaksi ini ke store kami agar tim bisa lanjut ke verifikasi fisik."
      : "Trade-in Anda sudah disetujui. Kirim device lama ke alamat toko di bawah lalu isi nomor resi agar tim kami bisa lanjut ke verifikasi fisik.";

  const buttonLabel =
    fulfillmentMethod === "offline_store" ? "Simpan Pilihan Datang ke Store" : "Kirim Resi Trade-In";
  const storeAddress =
    formatDisplayAddress(order.tradeInStoreOrigin?.fullAddress) ??
    "Alamat toko belum tersedia. Hubungi tim Entraverse untuk konfirmasi tujuan kirim.";
  const storeLocationNote = formatDisplayAddress(order.tradeInStoreOrigin?.locationNote);
  const recipientName = order.tradeInStoreOrigin?.recipientName
    ? toTitleCaseAddress(order.tradeInStoreOrigin.recipientName)
    : null;

  return (
    <section className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/90 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <AlertTriangle className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">{description}</p>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.9fr)]">
            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4 text-sm text-slate-700">
              <div className="flex items-center gap-2 text-slate-900">
                <MapPin className="h-4 w-4 text-amber-700" />
                <p className="font-semibold">Alamat Toko Entraverse</p>
              </div>

              <div className="mt-3 space-y-1.5">
                {recipientName ? <p>{recipientName}</p> : null}
                {order.tradeInStoreOrigin?.recipientPhone ? <p>{order.tradeInStoreOrigin.recipientPhone}</p> : null}
                <p className="whitespace-pre-line leading-6 text-slate-600">
                  {storeAddress}
                </p>
                {storeLocationNote ? (
                  <p className="text-xs leading-5 text-slate-500">{storeLocationNote}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Aksi Customer</p>

              {canSubmit ? (
                <form
                  className="mt-3 space-y-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await onSubmit({
                      fulfillment_method: fulfillmentMethod,
                      shipment_tracking_number:
                        fulfillmentMethod === "pengiriman" ? trackingNumber.trim() || null : null,
                    });
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("pengiriman")}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition ${
                        fulfillmentMethod === "pengiriman"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Truck className="h-4 w-4" />
                      Kirim ke Toko
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod("offline_store")}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition ${
                        fulfillmentMethod === "offline_store"
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Store className="h-4 w-4" />
                      Datang ke Store
                    </button>
                  </div>

                  {fulfillmentMethod === "pengiriman" ? (
                    <div className="space-y-2">
                      <label htmlFor={`trade-in-tracking-${order.id}`} className="text-sm font-medium text-slate-800">
                        Nomor resi pengiriman
                      </label>
                      <input
                        id={`trade-in-tracking-${order.id}`}
                        value={trackingNumber}
                        onChange={(event) => setTrackingNumber(event.target.value)}
                        placeholder="Contoh: JX3492837492"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300"
                      />
                      <p className="text-xs leading-5 text-slate-500">
                        Setelah resi dikirim, status trade-in akan berpindah ke verifikasi fisik.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-slate-600">
                      Pilihan ini akan menandai transaksi Anda ke tahap kunjungan store. Tim kami akan cek fisik device saat Anda datang.
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting || (fulfillmentMethod === "pengiriman" && trackingNumber.trim() === "")}
                    className="h-11 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {buttonLabel}
                  </Button>
                </form>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-medium text-slate-800">Metode:</span>{" "}
                    {savedMethod === "offline_store" ? "Datang ke Store" : "Kirim ke Toko"}
                  </p>
                  {order.tradeInShipmentTrackingNumber ? (
                    <p>
                      <span className="font-medium text-slate-800">Resi:</span> {order.tradeInShipmentTrackingNumber}
                    </p>
                  ) : null}
                  <p>Status trade-in Anda sedang menunggu proses lanjutan dari tim Entraverse.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
