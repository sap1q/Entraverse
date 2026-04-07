"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  FileText,
  LifeBuoy,
  Loader2,
  MoreVertical,
  PackageSearch,
  ReceiptText,
  RefreshCcw,
  RotateCcw,
  X,
} from "lucide-react";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { TradeInFulfillmentNotice } from "@/app/(storefront)/transaksi/components/TradeInFulfillmentNotice";
import { Button } from "@/components/ui/Button";
import { useRequireStorefrontAuth } from "@/hooks/useRequireStorefrontAuth";
import type {
  CustomerOrder,
  CustomerOrderFilterKey,
  CustomerOrderFilterOption,
  CustomerOrderPaymentDetails,
  CustomerOrderProgressStage,
} from "@/lib/api/customer-orders";
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

const DEFAULT_PROGRESS_STAGES: CustomerOrderProgressStage[] = [
  { step: 1, code: "waiting_payment", label: "Menunggu Pembayaran" },
  { step: 2, code: "waiting_confirmation", label: "Dikonfirmasi" },
  { step: 3, code: "order_shipped", label: "Pesanan Dikirim" },
  { step: 4, code: "order_delivered", label: "Pesanan Terkirim" },
  { step: 5, code: "completed", label: "Selesai" },
];

const DEFAULT_FILTERS: CustomerOrderFilterOption[] = [
  { key: "all", label: "Semua" },
  { key: "ongoing", label: "Berlangsung" },
  { key: "success", label: "Berhasil" },
  { key: "cancelled", label: "Dibatalkan" },
];

const normalizeFilterKey = (value: string): CustomerOrderFilterKey => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "ongoing" || normalized === "berlangsung") return "ongoing";
  if (normalized === "success" || normalized === "berhasil") return "success";
  if (normalized === "cancelled" || normalized === "canceled" || normalized === "dibatalkan") return "cancelled";
  return "all";
};

const statusBadgeClass = (group: string): string => {
  switch (group) {
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

const isTradeInOnlyOrder = (order: CustomerOrder): boolean => {
  if (order.kind === "trade_in") return true;

  const tradeInItemCount = order.items.filter((item) => isTradeInOrderItem(item)).length;
  return order.hasTradeIn && !order.requiresPayment && tradeInItemCount > 0 && tradeInItemCount === order.items.length;
};

const resolveTradeInReferenceAmount = (order: CustomerOrder): number => {
  if (order.primaryItem && isTradeInOrderItem(order.primaryItem) && (order.primaryItem.tradeInEstimatedAmount ?? 0) > 0) {
    return order.primaryItem.tradeInEstimatedAmount ?? 0;
  }

  return order.items.reduce((total, item) => {
    if (!isTradeInOrderItem(item)) return total;
    return total + Math.max(0, item.tradeInEstimatedAmount ?? 0);
  }, 0);
};

const resolveOrderHeadlineLabel = (order: CustomerOrder): string =>
  isTradeInOnlyOrder(order) ? "Nilai Trade-In" : "Total Harga";

const resolveOrderHeadlineAmount = (order: CustomerOrder): number =>
  isTradeInOnlyOrder(order) ? resolveTradeInReferenceAmount(order) : order.totalAmount;

const toFriendlyError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Terjadi gangguan saat menghubungkan ke API Laravel.";
};

const resolveOrderPaymentDetails = (order: CustomerOrder): CustomerOrderPaymentDetails | null => {
  if (!order.requiresPayment) {
    return order.paymentDetails;
  }

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
};

const resolveInvoiceNumber = (order: CustomerOrder): string => order.invoiceNumber ?? order.orderNumber;

function OrderProgress({
  currentStep,
  stages,
}: {
  currentStep: number;
  stages: CustomerOrderProgressStage[];
}) {
  const orderedStages = useMemo(() => [...stages].sort((left, right) => left.step - right.step), [stages]);
  const safeStages = orderedStages.length > 0 ? orderedStages : DEFAULT_PROGRESS_STAGES;
  const stepCount = safeStages.length > 0 ? safeStages.length : DEFAULT_PROGRESS_STAGES.length;
  const safeStep = Math.min(Math.max(1, Math.round(currentStep || 1)), stepCount);

  return (
    <div className="mt-5 overflow-x-auto pb-1">
      <div className="min-w-[640px]">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${safeStages.length}, minmax(120px, 1fr))` }}
        >
          {safeStages.map((stage, index) => {
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

                  {index < safeStages.length - 1 ? (
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

function OrderDetailModal({
  order,
  onClose,
}: {
  order: CustomerOrder | null;
  onClose: () => void;
}) {
  if (!order) return null;

  const headlineLabel = resolveOrderHeadlineLabel(order);
  const headlineAmount = resolveOrderHeadlineAmount(order);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Detail Transaksi</h2>
            <p className="mt-1 text-sm text-slate-500">Invoice: {resolveInvoiceNumber(order)}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Tutup detail transaksi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Tanggal:</span>{" "}
            {order.createdAt ? formatDateID(order.createdAt) : "-"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Status:</span> {order.statusLabel}
          </p>
          {order.hasTradeIn ? (
            <p>
              <span className="font-semibold text-slate-900">Tipe:</span>{" "}
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tradeInBadgeClass}`}>
                Trade-In
              </span>
            </p>
          ) : null}
          <p>
            <span className="font-semibold text-slate-900">Pembayaran:</span> {order.paymentMethodLabel}
          </p>
          <p>
            <span className="font-semibold text-slate-900">{headlineLabel}:</span> {formatCurrencyIDR(headlineAmount)}
          </p>
          {order.customerAddress ? (
            <p className="sm:col-span-2">
              <span className="font-semibold text-slate-900">Alamat:</span> {formatDisplayAddress(order.customerAddress)}
            </p>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{item.productName}</p>
                    {isTradeInOrderItem(item) ? (
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tradeInBadgeClass}`}>
                        Trade-In
                      </span>
                    ) : null}
                  </div>
                  <p className={`text-xs text-slate-500 ${isTradeInOrderItem(item) ? "hidden" : ""}`}>
                    {item.variantName ? `${item.variantName} • ` : ""}
                    {item.quantity} x {formatCurrencyIDR(item.unitPrice)}
                  </p>
                  {isTradeInOrderItem(item) ? (
                    <p className="text-xs text-slate-500">{item.variantName || "Item trade-in untuk review admin"}</p>
                  ) : null}
                  {isTradeInOrderItem(item) ? (
                    <p className="mt-1 text-xs text-emerald-700">
                      Estimasi trade-in: {formatCurrencyIDR(item.tradeInEstimatedAmount ?? 0)}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {isTradeInOrderItem(item)
                    ? formatCurrencyIDR(item.tradeInEstimatedAmount ?? 0)
                    : formatCurrencyIDR(item.lineTotal)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking } = useRequireStorefrontAuth("/transaksi");
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState<CustomerOrderFilterKey>("all");
  const [availableFilters, setAvailableFilters] = useState<CustomerOrderFilterOption[]>(DEFAULT_FILTERS);
  const [progressStages, setProgressStages] = useState<CustomerOrderProgressStage[]>(DEFAULT_PROGRESS_STAGES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<CustomerOrder | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);
  const [confirmReceiveOrderId, setConfirmReceiveOrderId] = useState<string | null>(null);
  const [tradeInFulfillmentOrderId, setTradeInFulfillmentOrderId] = useState<string | null>(null);
  const highlightedOrderKey = searchParams.get("highlight");
  const highlightedInvoice = searchParams.get("invoice");
  const highlightedPaymentStatus = searchParams.get("payment_status");
  const highlightedPaymentEvent = searchParams.get("payment_event");

  useEffect(() => {
    if (!openMenuOrderId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("[data-order-menu-root='true']")) {
        setOpenMenuOrderId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuOrderId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenuOrderId]);

  useEffect(() => {
    if (!detailOrder) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailOrder(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [detailOrder]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;

    const loadOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await customerOrdersApi.getOrders({
          filter: activeFilter,
          per_page: 20,
        });

        if (isCancelled) return;
        setOrders(result.items);
        setAvailableFilters(result.filters.items.length > 0 ? result.filters.items : DEFAULT_FILTERS);
        setProgressStages(result.statusCatalog.steps.length > 0 ? result.statusCatalog.steps : DEFAULT_PROGRESS_STAGES);
      } catch (loadError) {
        if (isCancelled) return;
        setError(toFriendlyError(loadError));
      } finally {
        if (isCancelled) return;
        setLoading(false);
      }
    };

    void loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, activeFilter, reloadTick]);

  const filterTabs = useMemo(() => {
    const serverMap = new Map(availableFilters.map((filter) => [normalizeFilterKey(filter.key), filter]));

    return DEFAULT_FILTERS.map((baseFilter) => {
      const normalizedKey = normalizeFilterKey(baseFilter.key);
      const fromServer = serverMap.get(normalizedKey);
      if (!fromServer) return baseFilter;
      return {
        key: normalizedKey,
        label: fromServer.label,
      };
    });
  }, [availableFilters]);

  useEffect(() => {
    if (!highlightedOrderKey && !highlightedInvoice) return;

    const matched = orders.find(
      (order) =>
        order.id === highlightedOrderKey ||
        order.orderNumber === highlightedInvoice ||
        order.orderNumber === highlightedOrderKey ||
        order.invoiceNumber === highlightedInvoice ||
        order.invoiceNumber === highlightedOrderKey
    );

    if (!matched) return;

    if (highlightedPaymentEvent === "closed") {
      setInfo("Anda belum menyelesaikan pembayaran. Pesanan tetap tersimpan di riwayat dan bisa dibayar lagi kapan saja.");
      return;
    }

    if (highlightedPaymentStatus === "finish" || highlightedPaymentEvent === "success") {
      setInfo(`Pembayaran untuk pesanan ${matched.orderNumber} berhasil dikirim. Status pesanan sedang disinkronkan.`);
      return;
    }

    if (highlightedPaymentEvent === "trade_in_submitted") {
      setInfo(`Pengajuan trade-in ${matched.orderNumber} berhasil masuk ke riwayat transaksi dan menunggu review admin.`);
      return;
    }

    if (highlightedPaymentStatus === "pending" || resolveOrderPaymentDetails(matched)?.isPending) {
      setInfo(`Pesanan ${matched.orderNumber} berada pada status menunggu pembayaran.`);
    }
  }, [highlightedInvoice, highlightedOrderKey, highlightedPaymentEvent, highlightedPaymentStatus, orders]);

  const syncOrderState = useCallback((nextOrder: CustomerOrder) => {
    setOrders((current) => current.map((order) => (order.id === nextOrder.id ? nextOrder : order)));
    setDetailOrder((current) => (current?.id === nextOrder.id ? nextOrder : current));
  }, []);

  const persistPendingPayment = useCallback((payment: PendingPaymentSession): PendingPaymentSession => {
    const nextPayment = {
      ...payment,
      savedAt: new Date().toISOString(),
    };

    savePendingPaymentSession(nextPayment);
    return nextPayment;
  }, []);

  const openMidtransSnap = useCallback(
    async (payment: PendingPaymentSession, order: CustomerOrder) => {
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
      } catch (error) {
        if (activePayment.snapRedirectUrl) {
          setInfo("Popup Midtrans tidak tersedia, mengalihkan ke halaman pembayaran...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        throw error;
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
          setReloadTick((previous) => previous + 1);
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
          setInfo(`Metode pembayaran untuk order ${activePayment.orderNumber} berhasil dibuat. Lanjutkan pembayaran dari detail pesanan.`);
          setReloadTick((previous) => previous + 1);
          router.push(`/transaksi/${order.id}?invoice=${activePayment.orderNumber}&payment_status=pending&payment_event=pending`);
        },
        onError: () => {
          persistPendingPayment(activePayment);
          setInfo(null);
          setError(`Pembayaran untuk order ${activePayment.orderNumber} belum berhasil. Pesanan tetap tersimpan dan bisa dicoba lagi.`);
        },
        onClose: () => {
          persistPendingPayment(activePayment);
          setError(null);
          setInfo("Anda belum menyelesaikan pembayaran. Pesanan tetap tersimpan di riwayat dan bisa dibayar lagi kapan saja.");
        },
      });
    },
    [persistPendingPayment, router]
  );

  const handleResumePayment = useCallback(
    async (order: CustomerOrder) => {
      if (!order.id.trim()) return;

      setResumeOrderId(order.id);
      setError(null);
      setInfo(null);

      try {
        const paymentResult = await customerOrdersApi.getPayment(order.id);
        const activePayment = persistPendingPayment(buildPendingPaymentSessionFromOrder(paymentResult));
        await openMidtransSnap(activePayment, order);
      } catch (resumeError) {
        const message = toFriendlyError(resumeError);
        setInfo(null);
        setError(message);
      } finally {
        setResumeOrderId(null);
      }
    },
    [openMidtransSnap, persistPendingPayment]
  );

  const handleConfirmReceived = useCallback(
    async (order: CustomerOrder) => {
      if (!order.id.trim()) return;

      setConfirmReceiveOrderId(order.id);
      setError(null);
      setInfo(null);

      try {
        const nextOrder = await customerOrdersApi.confirmReceived(order.id);
        syncOrderState(nextOrder);
        setInfo(`Pesanan ${nextOrder.orderNumber} berhasil dikonfirmasi telah diterima.`);
      } catch (confirmError) {
        setInfo(null);
        setError(toFriendlyError(confirmError));
      } finally {
        setConfirmReceiveOrderId(null);
      }
    },
    [syncOrderState]
  );

  const handleCancelTradeIn = useCallback(
    async (order: CustomerOrder) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          `Batalkan pengajuan trade-in ${order.orderNumber}? Tindakan ini final dan tidak bisa di-undo.`
        );

        if (!confirmed) return;
      }

      try {
        setCancelOrderId(order.id);
        setError(null);
        setInfo(null);
        const nextOrder = await customerOrdersApi.cancelOrder(order.id);
        syncOrderState(nextOrder);
        setOpenMenuOrderId(null);
        setInfo(`Pengajuan trade-in ${order.orderNumber} berhasil dibatalkan.`);
      } catch (cancelError) {
        setInfo(null);
        setError(toFriendlyError(cancelError));
      } finally {
        setCancelOrderId(null);
      }
    },
    [syncOrderState]
  );

  const handleSubmitTradeInFulfillment = useCallback(
    async (
      order: CustomerOrder,
      payload: {
        fulfillment_method: "pengiriman" | "offline_store";
        shipment_tracking_number?: string | null;
      }
    ) => {
      if (!order.id.trim()) return;

      setTradeInFulfillmentOrderId(order.id);
      setError(null);
      setInfo(null);

      try {
        const nextOrder = await customerOrdersApi.submitTradeInFulfillment(order.id, payload);
        syncOrderState(nextOrder);
        setInfo(
          payload.fulfillment_method === "pengiriman"
            ? `Resi trade-in ${nextOrder.orderNumber} berhasil dikirim. Status masuk ke verifikasi fisik.`
            : `Pilihan datang ke store untuk trade-in ${nextOrder.orderNumber} berhasil disimpan.`
        );
      } catch (submitError) {
        setInfo(null);
        setError(toFriendlyError(submitError));
      } finally {
        setTradeInFulfillmentOrderId(null);
      }
    },
    [syncOrderState]
  );

  const openHelpCenter = (order: CustomerOrder) => {
    if (typeof window === "undefined") return;

    const subject = encodeURIComponent(`Bantuan Pesanan ${order.orderNumber}`);
    const body = encodeURIComponent(
      `Halo Tim Entraverse,\nSaya membutuhkan bantuan untuk pesanan ${order.orderNumber}.\nTerima kasih.`
    );

    window.location.href = `mailto:support@entraverse.id?subject=${subject}&body=${body}`;
  };

  const openOrderActionSupport = (
    order: CustomerOrder,
    action: "cancel" | "return"
  ) => {
    if (typeof window === "undefined") return;

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
  };

  const handleTrackPackage = (order: CustomerOrder) => {
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
  };

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
      title="Pesanan Saya"
      description="Lihat riwayat belanja Anda, pantau progres pesanan, dan akses tindakan transaksi sesuai status terbaru."
    >
      <OrderDetailModal
        order={detailOrder}
        onClose={() => {
          setDetailOrder(null);
        }}
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {filterTabs.map((filter) => {
              const key = normalizeFilterKey(filter.key);
              const isActive = key === activeFilter;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(key);
                    setOpenMenuOrderId(null);
                    setInfo(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setReloadTick((previous) => previous + 1);
            }}
            className="h-10 rounded-xl border-slate-300"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
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

        <div className="space-y-4">
          {loading && orders.length === 0 ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))
          ) : null}

          {!loading && orders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
              <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">Belum ada pesanan</h2>
              <p className="mt-2 text-sm text-slate-500">
                Riwayat pesanan akan muncul di halaman ini setelah Anda menyelesaikan checkout.
              </p>
            </div>
          ) : null}

          {orders.map((order) => {
            const primaryItem = order.primaryItem ?? order.items[0] ?? null;
            const imageSource = resolveApiAssetUrl(primaryItem?.productImage) ?? "/product-placeholder.svg";
            const paymentDetails = resolveOrderPaymentDetails(order);
            const headlineLabel = resolveOrderHeadlineLabel(order);
            const headlineAmount = resolveOrderHeadlineAmount(order);
            const canResumePayment = order.requiresPayment && Boolean(order.canResumePayment || paymentDetails?.canResumePayment);
            const canCancelOrder = canCustomerOrderBeCancelled(order);
            const canTrackShipment = canCustomerOrderTrackShipment(order);
            const canRequestReturn = canCustomerOrderRequestReturn(order);
            const canConfirmReceived = !paymentDetails?.isPending && order.canConfirmReceived;
            const showInlineActions = canResumePayment || canConfirmReceived || canRequestReturn;
            const isHighlighted =
              highlightedOrderKey === order.id ||
              highlightedOrderKey === order.orderNumber ||
              highlightedInvoice === order.orderNumber ||
              highlightedInvoice === order.invoiceNumber ||
              highlightedOrderKey === order.invoiceNumber;

            return (
              <article
                key={order.id}
                className={`relative rounded-2xl border bg-white p-5 shadow-sm ${
                  order.hasTradeIn ? "pt-8" : ""
                } ${
                  isHighlighted ? "border-blue-300 shadow-[0_18px_44px_rgba(59,130,246,0.16)]" : "border-slate-200"
                }`}
              >
                {order.hasTradeIn ? (
                  <div className="pointer-events-none absolute left-5 -top-3 z-10">
                    <div className="overflow-hidden rounded-b-[18px] shadow-[0_16px_28px_rgba(16,185,129,0.22)]">
                      <div className="h-1 w-full bg-emerald-300" />
                      <div className="bg-emerald-500 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                        Trade-In
                      </div>
                    </div>
                  </div>
                ) : null}

                <header className="grid gap-4 border-b border-slate-200 pb-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Tanggal Transaksi</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {order.createdAt ? formatDateID(order.createdAt) : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">No. Pesanan</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{order.orderNumber}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{headlineLabel}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrencyIDR(headlineAmount)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Status</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.statusGroup)}`}>
                        {order.statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="relative justify-self-end" data-order-menu-root="true">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      aria-label={`Buka menu aksi pesanan ${order.orderNumber}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuOrderId === order.id}
                      onClick={() => {
                        setOpenMenuOrderId((previous) => (previous === order.id ? null : order.id));
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openMenuOrderId === order.id ? (
                      <div
                        className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
                        role="menu"
                        aria-label={`Aksi untuk pesanan ${order.orderNumber}`}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          role="menuitem"
                          onClick={() => {
                            setDetailOrder(order);
                            setOpenMenuOrderId(null);
                          }}
                        >
                          <FileText className="h-4 w-4 text-slate-500" />
                          Detail Transaksi
                        </button>

                        {canCancelOrder ? (
                          <button
                            type="button"
                            disabled={cancelOrderId === order.id}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                            role="menuitem"
                            onClick={() => {
                              if (order.kind === "trade_in") {
                                void handleCancelTradeIn(order);
                                return;
                              }

                              setOpenMenuOrderId(null);
                              openOrderActionSupport(order, "cancel");
                            }}
                          >
                            {cancelOrderId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                            Batalkan Pesanan
                          </button>
                        ) : null}

                        {canTrackShipment ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuOrderId(null);
                              handleTrackPackage(order);
                            }}
                          >
                            <PackageSearch className="h-4 w-4 text-slate-500" />
                            Lacak Pesanan
                          </button>
                        ) : null}

                        {canRequestReturn ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-amber-50"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuOrderId(null);
                              openOrderActionSupport(order, "return");
                            }}
                          >
                            <RotateCcw className="h-4 w-4 text-amber-600" />
                            Ajukan Retur
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuOrderId(null);
                            openHelpCenter(order);
                          }}
                        >
                          <LifeBuoy className="h-4 w-4 text-slate-500" />
                          Pusat Bantuan
                        </button>
                      </div>
                    ) : null}
                  </div>
                </header>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <Image
                        src={imageSource}
                        alt={primaryItem?.productName ?? "Produk utama pesanan"}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-900">
                          {primaryItem?.productName ?? "Produk tidak tersedia"}
                        </p>
                      </div>
                      <p className="mt-0.5 text-sm text-emerald-700">
                        Pembayaran: {paymentDetails?.methodLabel ?? order.paymentMethodLabel}
                      </p>
                      {primaryItem && isTradeInOrderItem(primaryItem) ? (
                        <p className="mt-0.5 text-xs text-emerald-700">
                          Estimasi trade-in: {formatCurrencyIDR(primaryItem.tradeInEstimatedAmount ?? 0)}
                        </p>
                      ) : null}
                      {paymentDetails?.isPending && paymentDetails.expiryTime ? (
                        <p className="mt-0.5 text-xs text-amber-700">
                          Bayar sebelum {formatDateTimeID(paymentDetails.expiryTime)}
                        </p>
                      ) : null}
                      {order.trackingNumber && order.canTrackPackage ? (
                        <p className="mt-0.5 text-xs text-slate-500">Resi: {order.trackingNumber}</p>
                      ) : null}
                    </div>
                  </div>

                  {showInlineActions ? (
                    <div className="flex flex-wrap gap-3">
                      {canResumePayment ? (
                        <Button
                          type="button"
                          disabled={resumeOrderId === order.id}
                          onClick={() => {
                            void handleResumePayment(order);
                          }}
                          className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold hover:bg-blue-700"
                        >
                          {resumeOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Bayar Sekarang
                        </Button>
                      ) : null}

                      {canRequestReturn ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            openOrderActionSupport(order, "return");
                          }}
                          className="h-10 rounded-xl border-amber-200 px-4 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Ajukan Retur
                        </Button>
                      ) : null}

                      {canConfirmReceived ? (
                        <Button
                          type="button"
                          disabled={confirmReceiveOrderId === order.id}
                          onClick={() => {
                            void handleConfirmReceived(order);
                          }}
                          className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold hover:bg-emerald-700"
                        >
                          {confirmReceiveOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Pesanan Diterima
                        </Button>
                      ) : null}

                    </div>
                  ) : null}
                </div>

                {order.statusGroup !== "cancelled" ? (
                  <OrderProgress
                    stages={order.progressStages.length > 0 ? order.progressStages : progressStages}
                    currentStep={order.statusStep}
                  />
                ) : null}

                <TradeInFulfillmentNotice
                  key={`${order.id}:${order.tradeInFulfillmentMethod ?? ""}:${order.tradeInShipmentTrackingNumber ?? ""}:${order.tradeInStatus ?? ""}`}
                  order={order}
                  submitting={tradeInFulfillmentOrderId === order.id}
                  onSubmit={(payload) => handleSubmitTradeInFulfillment(order, payload)}
                />
              </article>
            );
          })}
        </div>

        {!loading && orders.length > 0 ? (
          <p className="text-sm text-slate-500">Menampilkan {orders.length} pesanan.</p>
        ) : null}
      </div>
    </AccountShell>
  );
}
