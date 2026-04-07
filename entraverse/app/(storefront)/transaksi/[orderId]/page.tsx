"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Ban, CheckCheck, Clock3, Copy, Loader2, PackageSearch, RotateCcw } from "lucide-react";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { TradeInFulfillmentNotice } from "@/app/(storefront)/transaksi/components/TradeInFulfillmentNotice";
import { Button } from "@/components/ui/Button";
import { useRequireStorefrontAuth } from "@/hooks/useRequireStorefrontAuth";
import type { CustomerOrder } from "@/lib/api/customer-orders";
import {
  canCustomerOrderBeCancelled,
  canCustomerOrderRequestReturn,
  canCustomerOrderTrackShipment,
  customerOrdersApi,
} from "@/lib/api/customer-orders";
import {
  clearPendingPaymentSnapshot,
  getPendingPaymentSnapshot,
  normalizeMidtransPendingSnapshot,
  savePendingPaymentSnapshot,
} from "@/lib/payments/midtrans-pending";
import {
  buildPendingPaymentSessionFromOrder,
  clearPendingPaymentSession,
  loadMidtransSnapScript,
  redirectToMidtransPayment,
  savePendingPaymentSession,
  type PendingPaymentSession,
} from "@/lib/payments/midtrans-session";
import { formatDisplayAddress } from "@/lib/utils/address";
import { formatCurrencyIDR, formatDateID, formatDateTimeID } from "@/lib/utils/formatter";
import { resolveApiAssetUrl } from "@/lib/utils/media";

const toFriendlyError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Terjadi gangguan saat memuat detail transaksi.";
};

const statusBadgeClass = (statusGroup: CustomerOrder["statusGroup"]): string => {
  switch (statusGroup) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
};

const tradeInBadgeClass = "border-emerald-200 bg-emerald-50 text-emerald-700";

const isTradeInOrderItem = (
  item: Pick<CustomerOrder["items"][number], "tradeInEnabled" | "tradeInTransactionId">
): boolean => item.tradeInEnabled || Boolean(item.tradeInTransactionId);

const paymentTone = (
  isPending: boolean | undefined,
  statusGroup: CustomerOrder["statusGroup"]
): {
  shell: string;
  badge: string;
  accent: string;
  number: string;
  list: string;
} => {
  if (isPending) {
    return {
      shell: "border-amber-200 bg-amber-50/40",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      accent: "text-amber-700",
      number: "text-amber-700",
      list: "border-amber-100 bg-white",
    };
  }

  if (statusGroup === "success") {
    return {
      shell: "border-emerald-200 bg-emerald-50/40",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      accent: "text-emerald-700",
      number: "text-emerald-700",
      list: "border-emerald-100 bg-white",
    };
  }

  if (statusGroup === "cancelled") {
    return {
      shell: "border-rose-200 bg-rose-50/40",
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      accent: "text-rose-700",
      number: "text-rose-700",
      list: "border-rose-100 bg-white",
    };
  }

  return {
    shell: "border-blue-200 bg-blue-50/40",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    accent: "text-blue-700",
    number: "text-blue-700",
    list: "border-blue-100 bg-white",
  };
};

function OrderProgress({
  currentStep,
  stages,
}: {
  currentStep: number;
  stages: CustomerOrder["progressStages"];
}) {
  const orderedStages = [...stages].sort((left, right) => left.step - right.step);
  const safeStep = Math.min(Math.max(1, Math.round(currentStep || 1)), orderedStages.length || 1);

  return (
    <div className="mt-6 overflow-x-auto pb-1">
      <div className="min-w-[640px]">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(orderedStages.length, 1)}, minmax(120px, 1fr))` }}
        >
          {orderedStages.map((stage, index) => {
            const isPointActive = stage.step <= safeStep;
            const isLeftLineActive = stage.step <= safeStep;
            const isRightLineActive = stage.step < safeStep;

            return (
              <div key={`${stage.code}-${stage.step}`} className="relative flex flex-col items-center gap-2 text-center">
                <div className="relative flex w-full items-center justify-center">
                  {index > 0 ? (
                    <span
                      className={`absolute left-0 right-1/2 h-[3px] rounded-full ${
                        isLeftLineActive ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    />
                  ) : null}

                  {index < orderedStages.length - 1 ? (
                    <span
                      className={`absolute left-1/2 right-0 h-[3px] rounded-full ${
                        isRightLineActive ? "bg-blue-600" : "bg-slate-200"
                      }`}
                    />
                  ) : null}

                  <span
                    className={`relative z-10 h-3.5 w-3.5 rounded-full border-2 ${
                      isPointActive ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white"
                    }`}
                  />
                </div>

                <p className={`text-[11px] leading-4 ${isPointActive ? "font-semibold text-blue-700" : "text-slate-500"}`}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TransactionDetailPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isChecking } = useRequireStorefrontAuth("/transaksi");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [confirmReceiveLoading, setConfirmReceiveLoading] = useState(false);
  const [tradeInFulfillmentLoading, setTradeInFulfillmentLoading] = useState(false);

  const loadOrder = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isAuthenticated) return;

      if (!options?.silent) {
        setLoading(true);
      }

      setError(null);

      try {
        const result = await customerOrdersApi.getOrder(String(params.orderId ?? ""));
        setOrder(result);
      } catch (loadError) {
        setError(toFriendlyError(loadError));
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, params.orderId]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadOrder();
  }, [isAuthenticated, loadOrder]);

  useEffect(() => {
    const paymentEvent = searchParams.get("payment_event");
    const paymentStatus = searchParams.get("payment_status");

    if (paymentEvent === "pending") {
      setInfo("Metode pembayaran berhasil dibuat. Selesaikan pembayaran menggunakan data yang tertera pada detail pesanan ini.");
      return;
    }

    if (paymentEvent === "success" || paymentStatus === "finish") {
      setInfo("Pembayaran berhasil dikirim. Status pesanan sedang disinkronkan.");
      return;
    }
  }, [searchParams]);

  const paymentDetails = useMemo(() => {
    if (!order) return null;
    if (!order.requiresPayment) return order.paymentDetails;
    const snapshot = getPendingPaymentSnapshot(order.orderNumber);

    if (order.paymentDetails?.accountNumber || !snapshot) {
      return order.paymentDetails;
    }

    return {
      statusLabel: snapshot.statusLabel,
      isPending: true,
      paymentType: snapshot.paymentType,
      methodCode: snapshot.methodCode,
      methodLabel: snapshot.methodLabel,
      channelCode: snapshot.channelCode,
      channelLabel: snapshot.channelLabel,
      accountLabel: snapshot.accountLabel,
      accountNumber: snapshot.accountNumber,
      secondaryLabel: snapshot.secondaryLabel,
      secondaryValue: snapshot.secondaryValue,
      expiryTime: snapshot.expiryTime,
      totalAmount: snapshot.totalAmount,
      pdfUrl: null,
      statusMessage: null,
      canResumePayment: true,
      instructions: snapshot.instructions,
    };
  }, [order]);

  const invoiceNumber = order?.invoiceNumber ?? order?.orderNumber ?? "-";
  const paymentBadgeTone = paymentTone(paymentDetails?.isPending, order?.statusGroup ?? "ongoing");
  const shippingAddress = formatDisplayAddress(order?.customerAddress ?? null);
  const canResumePayment = Boolean(order?.requiresPayment && (order.canResumePayment || paymentDetails?.canResumePayment));
  const canCancelOrder = order ? canCustomerOrderBeCancelled(order) : false;
  const canTrackShipment = order ? canCustomerOrderTrackShipment(order) : false;
  const canRequestReturn = order ? canCustomerOrderRequestReturn(order) : false;
  const canConfirmReceived = Boolean(order && !paymentDetails?.isPending && order.canConfirmReceived);
  const hasPurchaseItem = Boolean(order?.items.some((item) => !isTradeInOrderItem(item)));

  const handleCancelTradeIn = useCallback(async () => {
    if (!order || order.kind !== "trade_in") return;

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Batalkan pengajuan trade-in ${order.orderNumber}? Tindakan ini final dan tidak bisa di-undo.`
      );

      if (!confirmed) return;
    }

    try {
      setCancelLoading(true);
      setError(null);
      setInfo(null);
      const nextOrder = await customerOrdersApi.cancelOrder(order.id);
      setOrder(nextOrder);
      setInfo(`Pengajuan trade-in ${order.orderNumber} berhasil dibatalkan.`);
    } catch (cancelError) {
      setInfo(null);
      setError(toFriendlyError(cancelError));
    } finally {
      setCancelLoading(false);
    }
  }, [order]);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setInfo(`${label} berhasil disalin.`);
      window.setTimeout(() => {
        setCopiedValue((previous) => (previous === value ? null : previous));
      }, 1800);
    } catch {
      setInfo(`Gagal menyalin ${label.toLowerCase()}.`);
    }
  };

  const persistPendingPayment = useCallback((payment: PendingPaymentSession): PendingPaymentSession => {
    const nextPayment = {
      ...payment,
      savedAt: new Date().toISOString(),
    };

    savePendingPaymentSession(nextPayment);
    return nextPayment;
  }, []);

  const handleTrackPackage = useCallback(() => {
    if (!order) return;

    setInfo(null);

    if (typeof window === "undefined") return;

    if (order.trackingUrl) {
      window.open(order.trackingUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (order.trackingNumber) {
      setInfo(`Nomor resi: ${order.trackingNumber}. Tautan tracking belum tersedia dari kurir.`);
      return;
    }

    setInfo("Nomor resi belum tersedia. Silakan cek kembali beberapa saat lagi.");
  }, [order]);

  const openOrderActionSupport = useCallback(
    (action: "cancel" | "return") => {
      if (!order || typeof window === "undefined") return;

      const definitions = {
        cancel: {
          subject: `Pembatalan Pesanan ${order.orderNumber}`,
          body: `Halo Tim Entraverse,\nSaya ingin mengajukan pembatalan untuk pesanan ${order.orderNumber}.\nMohon bantu proses pembatalannya.\nTerima kasih.`,
          info: `Membuka email bantuan untuk pembatalan pesanan ${order.orderNumber}.`,
        },
        return: {
          subject: `Pengajuan Retur Pesanan ${order.orderNumber}`,
          body: `Halo Tim Entraverse,\nSaya ingin mengajukan retur/pengembalian untuk pesanan ${order.orderNumber}.\nMohon informasikan langkah selanjutnya.\nTerima kasih.`,
          info: `Membuka email bantuan untuk pengajuan retur pesanan ${order.orderNumber}.`,
        },
      } as const;

      const selected = definitions[action];
      setError(null);
      setInfo(selected.info);
      window.location.href = `mailto:support@entraverse.id?subject=${encodeURIComponent(selected.subject)}&body=${encodeURIComponent(selected.body)}`;
    },
    [order]
  );

  const openMidtransSnap = useCallback(
    async (payment: PendingPaymentSession) => {
      if (!order) return;

      const activePayment = persistPendingPayment(payment);

      if (!activePayment.snapToken && activePayment.snapRedirectUrl) {
        setInfo(`Mengalihkan pembayaran order ${activePayment.orderNumber} ke Midtrans...`);
        redirectToMidtransPayment(activePayment.snapRedirectUrl);
        return;
      }

      if (!activePayment.snapToken) {
        throw new Error("Token pembayaran Midtrans tidak tersedia untuk pesanan ini.");
      }

      if (!activePayment.midtransClientKey) {
        if (activePayment.snapRedirectUrl) {
          setInfo("Mengalihkan ke halaman pembayaran Midtrans...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        throw new Error("MIDTRANS_CLIENT_KEY belum dikonfigurasi di backend.");
      }

      try {
        await loadMidtransSnapScript(activePayment.midtransSnapJsUrl, activePayment.midtransClientKey);
      } catch (loadError) {
        if (activePayment.snapRedirectUrl) {
          setInfo("Popup Midtrans tidak tersedia, mengalihkan ke halaman pembayaran...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        throw loadError;
      }

      if (!window.snap) {
        if (activePayment.snapRedirectUrl) {
          setInfo("Midtrans Snap belum siap, mengalihkan ke halaman pembayaran...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        throw new Error("Midtrans Snap belum siap.");
      }

      window.snap.pay(activePayment.snapToken, {
        onSuccess: () => {
          clearPendingPaymentSession();
          clearPendingPaymentSnapshot(activePayment.orderNumber);
          setError(null);
          setInfo(`Pembayaran berhasil untuk order ${activePayment.orderNumber}. Status pesanan sedang disinkronkan.`);
          void loadOrder({ silent: true });
          router.replace(`/transaksi/${order.id}?invoice=${activePayment.orderNumber}&payment_status=finish&payment_event=success`);
        },
        onPending: (result) => {
          persistPendingPayment(activePayment);
          const snapshot = normalizeMidtransPendingSnapshot(result, {
            orderNumber: activePayment.orderNumber,
            totalAmount: activePayment.totalAmount,
          });

          if (snapshot) {
            savePendingPaymentSnapshot(snapshot);
          }

          setError(null);
          setInfo("Metode pembayaran berhasil dibuat. Gunakan nomor pembayaran di bawah untuk menyelesaikan transaksi.");
          void loadOrder({ silent: true });
        },
        onError: () => {
          persistPendingPayment(activePayment);
          setInfo(null);
          setError(`Pembayaran untuk order ${activePayment.orderNumber} belum berhasil. Pesanan tetap tersimpan dan bisa dicoba lagi.`);
        },
        onClose: () => {
          persistPendingPayment(activePayment);
          setError(null);
          router.push(`/transaksi?highlight=${order.id}&invoice=${activePayment.orderNumber}&payment_status=pending&payment_event=closed`);
        },
      });
    },
    [loadOrder, order, persistPendingPayment, router]
  );

  const handleResumePayment = useCallback(async () => {
    if (!order) return;

    setResumeLoading(true);
    setError(null);
    setInfo(null);

    try {
      const paymentResult = await customerOrdersApi.getPayment(order.id);
      const activePayment = persistPendingPayment(buildPendingPaymentSessionFromOrder(paymentResult));
      await openMidtransSnap(activePayment);
    } catch (resumeError) {
      setInfo(null);
      setError(toFriendlyError(resumeError));
    } finally {
      setResumeLoading(false);
    }
  }, [openMidtransSnap, order, persistPendingPayment]);

  const handleConfirmReceived = useCallback(async () => {
    if (!order) return;

    setConfirmReceiveLoading(true);
    setError(null);
    setInfo(null);

    try {
      const nextOrder = await customerOrdersApi.confirmReceived(order.id);
      setOrder(nextOrder);
      setInfo(`Pesanan ${nextOrder.orderNumber} berhasil dikonfirmasi telah diterima.`);
    } catch (confirmError) {
      setInfo(null);
      setError(toFriendlyError(confirmError));
    } finally {
      setConfirmReceiveLoading(false);
    }
  }, [order]);

  const handleSubmitTradeInFulfillment = useCallback(
    async (payload: {
      fulfillment_method: "pengiriman" | "offline_store";
      shipment_tracking_number?: string | null;
    }) => {
      if (!order) return;

      setTradeInFulfillmentLoading(true);
      setError(null);
      setInfo(null);

      try {
        const nextOrder = await customerOrdersApi.submitTradeInFulfillment(order.id, payload);
        setOrder(nextOrder);
        setInfo(
          payload.fulfillment_method === "pengiriman"
            ? `Resi trade-in ${nextOrder.orderNumber} berhasil dikirim. Status masuk ke verifikasi fisik.`
            : `Pilihan datang ke store untuk trade-in ${nextOrder.orderNumber} berhasil disimpan.`
        );
      } catch (submitError) {
        setInfo(null);
        setError(toFriendlyError(submitError));
      } finally {
        setTradeInFulfillmentLoading(false);
      }
    },
    [order]
  );

  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Memeriksa sesi login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccountShell
      title="Detail Pesanan"
      description="Lihat invoice resmi, rincian pengiriman, dan data pembayaran untuk pesanan Anda."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/transaksi"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Kembali ke Transaksi
          </Link>
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}
        {info ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{info}</div>
        ) : null}

        {loading && !order ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
          </div>
        ) : null}

        {order ? (
          <>
            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.06)] sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nomor Invoice</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.15rem]">
                    {invoiceNumber}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">Order ID {order.orderNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Dibuat pada {order.createdAt ? formatDateTimeID(order.createdAt) : "-"}
                  </p>
                </div>

                <div className="space-y-2 text-left sm:text-right">
                  <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusBadgeClass(
                        order.statusGroup
                      )}`}
                    >
                      {paymentDetails?.statusLabel ?? order.statusLabel}
                    </span>
                    {order.hasTradeIn ? (
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tradeInBadgeClass}`}>
                        Trade-In
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-500">
                    Pembayaran: <span className="font-medium text-slate-700">{paymentDetails?.methodLabel ?? order.paymentMethodLabel}</span>
                  </p>
                </div>
              </div>

              {order.statusGroup !== "cancelled" ? (
                <OrderProgress currentStep={order.statusStep} stages={order.progressStages} />
              ) : null}

              <TradeInFulfillmentNotice
                key={`${order.id}:${order.tradeInFulfillmentMethod ?? ""}:${order.tradeInShipmentTrackingNumber ?? ""}:${order.tradeInStatus ?? ""}`}
                order={order}
                submitting={tradeInFulfillmentLoading}
                onSubmit={handleSubmitTradeInFulfillment}
              />

              {order.requiresPayment ? (
                <div className={`mt-6 rounded-[28px] border p-5 sm:p-6 ${paymentBadgeTone.shell}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="inline-flex items-center gap-2">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white ${paymentBadgeTone.accent}`}>
                      <Clock3 className="h-3.5 w-3.5" />
                    </span>
                    <span className={`text-sm font-semibold ${paymentBadgeTone.accent}`}>
                      {paymentDetails?.statusLabel ?? order.statusLabel}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Batas Waktu</p>
                    <p className={`mt-1 text-sm font-semibold ${paymentBadgeTone.number}`}>
                      {paymentDetails?.expiryTime ? formatDateTimeID(paymentDetails.expiryTime) : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-[1.75rem] font-bold tracking-tight text-slate-950">
                    {paymentDetails?.methodLabel ?? order.paymentMethodLabel}
                  </h3>
                  {paymentDetails?.channelLabel ? (
                    <p className="mt-1 text-sm text-slate-500">{paymentDetails.channelLabel}</p>
                  ) : null}
                </div>

                <div className="mt-6 rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_auto] lg:items-center">
                    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          {paymentDetails?.accountLabel ?? "Nomor Pembayaran"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <p className="text-2xl font-bold tracking-[0.04em] text-slate-950">
                            {paymentDetails?.accountNumber ?? "Menunggu nomor pembayaran"}
                          </p>
                          {paymentDetails?.accountNumber ? (
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopy(
                                  paymentDetails.accountNumber as string,
                                  paymentDetails.accountLabel ?? "Nomor pembayaran"
                                );
                              }}
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              {copiedValue === paymentDetails.accountNumber ? (
                                <CheckCheck className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              {copiedValue === paymentDetails.accountNumber ? "Tersalin" : "Copy"}
                            </button>
                          ) : null}
                        </div>
                        {paymentDetails?.secondaryValue ? (
                          <p className="mt-2 text-sm text-slate-500">
                            {paymentDetails.secondaryLabel}:{" "}
                            <span className="font-semibold text-slate-900">{paymentDetails.secondaryValue}</span>
                          </p>
                        ) : null}
                      </div>

                      <div className="sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total Tagihan</p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">
                          {formatCurrencyIDR(paymentDetails?.totalAmount || order.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {canResumePayment || canCancelOrder || canTrackShipment || canConfirmReceived || canRequestReturn ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {canResumePayment ? (
                      <Button
                        type="button"
                        disabled={resumeLoading}
                        onClick={() => {
                          void handleResumePayment();
                        }}
                        className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold hover:bg-blue-700"
                      >
                        {resumeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Bayar Sekarang
                      </Button>
                    ) : null}

                    {canCancelOrder ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={cancelLoading}
                        onClick={() => {
                          if (order.kind === "trade_in") {
                            void handleCancelTradeIn();
                            return;
                          }

                          openOrderActionSupport("cancel");
                        }}
                        className="h-11 rounded-xl border-rose-200 px-5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        Batalkan
                      </Button>
                    ) : null}

                    {canTrackShipment ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTrackPackage}
                        className="h-11 rounded-xl border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <PackageSearch className="h-4 w-4" />
                        Lacak Pesanan
                      </Button>
                    ) : null}

                    {canConfirmReceived ? (
                      <Button
                        type="button"
                        disabled={confirmReceiveLoading}
                        onClick={() => {
                          void handleConfirmReceived();
                        }}
                        className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold hover:bg-emerald-700"
                      >
                        {confirmReceiveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Pesanan Diterima
                      </Button>
                    ) : null}

                    {canRequestReturn ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          openOrderActionSupport("return");
                        }}
                        className="h-11 rounded-xl border-amber-200 px-5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Ajukan Retur
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {paymentDetails?.instructions.length ? (
                  <div className="mt-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Cara Pembayaran</p>
                    <div className="mt-3 space-y-3">
                      {paymentDetails.instructions.map((step, index) => (
                        <div
                          key={`detail-instruction-${index}`}
                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${paymentBadgeTone.list}`}
                        >
                          <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${paymentBadgeTone.badge}`}>
                            {index + 1}
                          </span>
                          <p className="text-sm leading-6 text-slate-700">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-blue-200 bg-blue-50/70 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-blue-900">Pengajuan trade-in sedang diproses</p>
                      <p className="mt-1 text-sm leading-6 text-blue-800">
                        Tidak ada pembayaran Midtrans untuk transaksi ini. Admin akan review foto dan data device Anda
                        terlebih dahulu. Setelah disetujui, status akan berubah menjadi trade-in diterima lalu Anda
                        bisa kirim paket ke origin atau datang ke offline store kami.
                      </p>
                    </div>
                  </div>

                  {canCancelOrder || canTrackShipment || canConfirmReceived || canRequestReturn ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                    {canCancelOrder ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={cancelLoading}
                        onClick={() => {
                          if (order.kind === "trade_in") {
                            void handleCancelTradeIn();
                            return;
                          }

                          openOrderActionSupport("cancel");
                        }}
                        className="h-11 rounded-xl border-rose-200 px-5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        Batalkan
                      </Button>
                    ) : null}

                      {canTrackShipment ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTrackPackage}
                          className="h-11 rounded-xl border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <PackageSearch className="h-4 w-4" />
                          Lacak Pesanan
                        </Button>
                      ) : null}

                      {canConfirmReceived ? (
                        <Button
                          type="button"
                          disabled={confirmReceiveLoading}
                          onClick={() => {
                            void handleConfirmReceived();
                          }}
                          className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold hover:bg-emerald-700"
                        >
                          {confirmReceiveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Pesanan Diterima
                        </Button>
                      ) : null}

                      {canRequestReturn ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            openOrderActionSupport("return");
                          }}
                          className="h-11 rounded-xl border-amber-200 px-5 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Ajukan Retur
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.06)] sm:p-6">
              <h3 className="text-2xl font-bold tracking-tight text-slate-950">Produk Dipesan</h3>
              <div className="mt-5 space-y-4">
                {order.items.map((item) => (
                  <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <Image
                          src={resolveApiAssetUrl(item.productImage) ?? "/product-placeholder.svg"}
                          alt={item.productName}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-950">{item.productName}</p>
                          {isTradeInOrderItem(item) ? (
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tradeInBadgeClass}`}>
                              Trade-In
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-1 text-sm text-slate-500 ${isTradeInOrderItem(item) ? "hidden" : ""}`}>
                          {item.variantName ? `${item.variantName} • ` : ""}
                          {item.quantity} x {formatCurrencyIDR(item.unitPrice)}
                        </p>
                        {isTradeInOrderItem(item) ? (
                          <p className="mt-1 text-sm text-slate-500">{item.variantName || "Item trade-in untuk review admin"}</p>
                        ) : null}
                        {isTradeInOrderItem(item) ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            Estimasi trade-in: {formatCurrencyIDR(item.tradeInEstimatedAmount ?? 0)}
                          </p>
                        ) : null}
                        {!isTradeInOrderItem(item) ? (
                          <p className="mt-1 text-xs text-slate-400">1x Rp {item.unitPrice.toLocaleString("id-ID")}</p>
                        ) : null}
                      </div>

                      <p className="shrink-0 text-base font-semibold text-slate-950">
                        {isTradeInOrderItem(item)
                          ? formatCurrencyIDR(item.tradeInEstimatedAmount ?? 0)
                          : formatCurrencyIDR(item.lineTotal)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.06)] sm:p-6">
              <h3 className="text-2xl font-bold tracking-tight text-slate-950">
                {hasPurchaseItem ? "Alamat Pengiriman" : "Data Verifikasi Customer"}
              </h3>
              <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
                <p className="text-base font-semibold text-slate-950">{order.customerName}</p>
                {order.customerPhone ? <p className="mt-1">{order.customerPhone}</p> : null}
                {order.customerEmail ? <p className="mt-1">{order.customerEmail}</p> : null}
                {shippingAddress ? <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{shippingAddress}</p> : null}
              </div>
            </section>

            {hasPurchaseItem ? (
              <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
              <section className="flex h-full flex-col rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.06)] sm:p-6">
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Rincian Biaya</h3>
                <div className="mt-6 grid flex-1 auto-rows-min gap-y-4 text-sm">
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-slate-500">Subtotal</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{formatCurrencyIDR(order.subtotal)}</p>
                  </div>
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-slate-500">Ongkir</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{formatCurrencyIDR(order.shippingCost)}</p>
                  </div>
                  <div className="mt-auto border-t border-slate-200 pt-5">
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                      <p className="text-xl font-semibold text-slate-950">Total</p>
                      <p className="justify-self-end text-right text-[2rem] font-bold tracking-tight text-blue-600">
                        {formatCurrencyIDR(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex h-full flex-col rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.06)] sm:p-6">
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Pengiriman</h3>
                <div className="mt-6 grid flex-1 auto-rows-min gap-y-4 text-sm">
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Kurir:</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{order.shippingCourier ? order.shippingCourier.toUpperCase() : "-"}</p>
                  </div>

                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Layanan:</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{order.shippingService ? order.shippingService.toUpperCase() : "-"}</p>
                  </div>

                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Estimasi:</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{order.shippingEtd ?? "-"}</p>
                  </div>

                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tanggal:</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{order.createdAt ? formatDateID(order.createdAt) : "-"}</p>
                  </div>

                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Resi:</p>
                    <p className="justify-self-end text-right font-semibold text-slate-950">{order.trackingNumber ?? "-"}</p>
                  </div>
                </div>
              </section>
              </div>
            ) : (
              <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.06)] sm:p-6">
                <h3 className="text-2xl font-bold tracking-tight text-slate-950">Langkah Selanjutnya</h3>
                <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50/70 px-5 py-4 text-sm leading-7 text-blue-900">
                  Pengajuan trade-in ini belum menagih pembayaran. Tunggu admin meninjau foto dan data perangkat Anda.
                  Jika trade-in diterima, status transaksi akan bergerak ke tahap pengiriman device lama ke origin atau
                  kunjungan ke offline store kami untuk verifikasi fisik.
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </AccountShell>
  );
}
