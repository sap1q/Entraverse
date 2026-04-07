"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAddress } from "@/hooks/useAddress";
import { useCart } from "@/hooks/useCart";
import { useRequireStorefrontAuth } from "@/hooks/useRequireStorefrontAuth";
import {
  checkoutApi,
  type CheckoutProcessItemPayload,
  type CheckoutShippingOption,
  type ProductSnapshot,
} from "@/lib/api/checkout";
import { customerOrdersApi } from "@/lib/api/customer-orders";
import {
  clearPendingPaymentSnapshot,
  normalizeMidtransPendingSnapshot,
  savePendingPaymentSnapshot,
} from "@/lib/payments/midtrans-pending";
import {
  buildPendingPaymentSessionFromCheckout,
  buildPendingPaymentSessionFromOrder,
  clearPendingPaymentSession,
  loadMidtransSnapScript,
  readPendingPaymentSession,
  redirectToMidtransPayment,
  savePendingPaymentSession,
  type PendingPaymentSession,
} from "@/lib/payments/midtrans-session";
import { formatCurrencyIDR } from "@/lib/utils/formatter";
import {
  resolveSelectedVariantRow,
  resolveVariantRowPrice,
} from "../products/[slug]/components/productPricing";

const formatDiscountCurrencyIDR = (value: number): string => {
  return formatCurrencyIDR(value).replace("Rp ", "Rp -");
};

const hasTradeInFlow = (item: { tradeInEnabled: boolean; tradeInTransactionId?: string | null }): boolean =>
  item.tradeInEnabled || Boolean(item.tradeInTransactionId);

const getDiscountPercent = (baseValue: number, discountValue: number): number => {
  if (baseValue <= 0 || discountValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((discountValue / baseValue) * 100)));
};

const formatEstimatedDelivery = (etd: string | null | undefined): string => {
  const normalized = etd?.trim();
  if (!normalized) return "-";

  const localized = normalized.replace(/\b(days?|hari)\b/gi, "").trim();
  if (localized.length > 0) {
    return `${localized} hari`;
  }

  return "hari";
};

const COURIER_OPTIONS = [
  { label: "JNE", value: "jne" },
  { label: "J&T Express", value: "jnt" },
  { label: "SiCepat (Belum Tersedia)", value: "sicepat", disabled: true },
  { label: "POS Indonesia", value: "pos" },
];

const redirectToTransactions = (orderId: string, orderNumber: string, status?: string, event?: string): void => {
  if (typeof window === "undefined") return;

  const target = new URL("/transaksi", window.location.origin);
  target.searchParams.set("highlight", orderId);
  target.searchParams.set("invoice", orderNumber);

  if (status) {
    target.searchParams.set("payment_status", status);
  }

  if (event) {
    target.searchParams.set("payment_event", event);
  }

  window.location.assign(target.toString());
};

const redirectToTransactionDetail = (orderId: string, orderNumber: string, status?: string, event?: string): void => {
  if (typeof window === "undefined") return;

  const target = new URL(`/transaksi/${orderId}`, window.location.origin);
  target.searchParams.set("invoice", orderNumber);

  if (status) {
    target.searchParams.set("payment_status", status);
  }

  if (event) {
    target.searchParams.set("payment_event", event);
  }

  window.location.assign(target.toString());
};

export default function CheckoutPage() {
  const { isAuthenticated, isChecking } = useRequireStorefrontAuth("/checkout");
  const {
    items,
    consumeItems,
    refreshCart,
    loading: cartLoading,
  } = useCart();
  const {
    addresses,
    selectedAddress,
    selectedAddressId,
    loading: addressLoading,
    savingId,
    error: addressError,
    fetchAddresses,
    setMainAddress,
  } = useAddress();

  const [productSnapshots, setProductSnapshots] = useState<Record<string, ProductSnapshot | null>>({});
  const [productsSyncing, setProductsSyncing] = useState(false);
  const [courier, setCourier] = useState<string>(COURIER_OPTIONS[0].value);
  const [shippingOptions, setShippingOptions] = useState<CheckoutShippingOption[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [quotedShippingWeight, setQuotedShippingWeight] = useState<number | null>(null);
  const [shippingStrictMode, setShippingStrictMode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutInfo, setCheckoutInfo] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPaymentSession | null>(null);
  const [pendingPaymentHydrated, setPendingPaymentHydrated] = useState(false);
  const [pendingPaymentLoading, setPendingPaymentLoading] = useState(false);
  const [snapModalActive, setSnapModalActive] = useState(false);
  const submitGuardRef = useRef(false);
  const autoResumeAttemptedRef = useRef(false);

  const selectedCartItems = useMemo(() => items.filter((item) => item.selected), [items]);
  const selectedProductIds = useMemo(
    () => Array.from(new Set(selectedCartItems.map((item) => item.productId))),
    [selectedCartItems]
  );
  const hasPendingProductSnapshots = useMemo(
    () => selectedProductIds.some((productId) => !Object.prototype.hasOwnProperty.call(productSnapshots, productId)),
    [productSnapshots, selectedProductIds]
  );
  const pricingReady = selectedProductIds.length === 0 || !hasPendingProductSnapshots;

  useEffect(() => {
    if (isChecking || !isAuthenticated) {
      return;
    }

    void refreshCart({ silent: true });
    void fetchAddresses({ silent: true });
  }, [fetchAddresses, isAuthenticated, isChecking, refreshCart]);

  useEffect(() => {
    if (isChecking || !isAuthenticated) {
      setProductSnapshots({});
      setProductsSyncing(false);
      return;
    }

    if (selectedProductIds.length === 0) {
      setProductSnapshots({});
      return;
    }

    let active = true;

    setProductsSyncing(true);
    setCheckoutError(null);

    Promise.all(
      selectedProductIds.map(async (productId) => {
        try {
          const snapshot = await checkoutApi.getProductSnapshot(productId);
          return [productId, snapshot] as const;
        } catch {
          return [productId, null] as const;
        }
      })
    )
      .then((rows) => {
        if (!active) return;
        setProductSnapshots((prev) => {
          const next = selectedProductIds.reduce<Record<string, ProductSnapshot | null>>((result, productId) => {
            if (Object.prototype.hasOwnProperty.call(prev, productId)) {
              result[productId] = prev[productId] ?? null;
            }
            return result;
          }, {});

          rows.forEach(([productId, snapshot]) => {
            next[productId] = snapshot;
          });
          return next;
        });
      })
      .finally(() => {
        if (!active) return;
        setProductsSyncing(false);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, isChecking, selectedProductIds]);

  const checkoutItems = useMemo(() => {
    return selectedCartItems.map((item) => {
      const snapshot = productSnapshots[item.productId];
      const selectedVariantRow = snapshot
        ? resolveSelectedVariantRow(
            { variant_pricing: snapshot.variant_pricing },
            item.variants,
            item.variantSku ?? null
          )
        : null;
      const itemHasTradeInFlow = hasTradeInFlow(item);
      const unitPrice =
        (selectedVariantRow ? resolveVariantRowPrice(selectedVariantRow) : null) ??
        snapshot?.price ??
        item.price;
      const lineTotal = unitPrice * item.quantity;
      const tradeInValue = item.tradeInValue;

      return {
        id: item.id,
        productId: item.productId,
        name: snapshot?.name ?? item.name,
        image: snapshot?.image ?? item.image,
        quantity: item.quantity,
        variantSku: item.variantSku,
        variants: item.variants,
        unitPrice,
        lineTotal,
        tradeInEnabled: itemHasTradeInFlow,
        tradeInTransactionId: item.tradeInTransactionId,
        tradeInValue,
        kind: itemHasTradeInFlow ? "trade_in" : "purchase",
      };
    });
  }, [productSnapshots, selectedCartItems]);

  const checkoutRequestItems = useMemo<CheckoutProcessItemPayload[]>(
    () =>
      selectedCartItems.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        variant_sku: item.variantSku,
        variants: item.variants,
        trade_in_enabled: hasTradeInFlow(item),
        trade_in_transaction_id: item.tradeInTransactionId,
      })),
    [selectedCartItems]
  );

  const subtotal = useMemo(
    () => checkoutItems.filter((item) => item.kind === "purchase").reduce((total, item) => total + item.lineTotal, 0),
    [checkoutItems]
  );
  const tradeInDiscount = useMemo(
    () =>
      selectedCartItems
        .filter((item) => hasTradeInFlow(item))
        .reduce((total, item) => total + item.tradeInValue, 0),
    [selectedCartItems]
  );
  const appliedTradeInDiscount = useMemo(() => Math.min(subtotal, tradeInDiscount), [subtotal, tradeInDiscount]);
  const tradeInDiscountPercent = useMemo(
    () => getDiscountPercent(subtotal, appliedTradeInDiscount),
    [appliedTradeInDiscount, subtotal]
  );
  const containsTradeInItem = useMemo(
    () => selectedCartItems.some((item) => hasTradeInFlow(item)),
    [selectedCartItems]
  );
  const containsPurchaseItem = useMemo(
    () => selectedCartItems.some((item) => !hasTradeInFlow(item)),
    [selectedCartItems]
  );
  const isTradeInOnlyCheckout = containsTradeInItem && !containsPurchaseItem;
  const purchaseCheckoutItems = useMemo(
    () => checkoutItems.filter((item) => item.kind === "purchase"),
    [checkoutItems]
  );
  const tradeInCheckoutItems = useMemo(
    () => checkoutItems.filter((item) => item.kind === "trade_in"),
    [checkoutItems]
  );
  const shippingRequestItems = useMemo<CheckoutProcessItemPayload[]>(
    () => checkoutRequestItems.filter((item) => !item.trade_in_enabled && !item.trade_in_transaction_id),
    [checkoutRequestItems]
  );

  const selectedShipping = useMemo(
    () => shippingOptions.find((option) => option.service === selectedService) ?? null,
    [selectedService, shippingOptions]
  );

  const shippingCost = containsPurchaseItem ? selectedShipping?.cost ?? 0 : 0;
  const totalAmount = Math.max(0, subtotal - appliedTradeInDiscount + shippingCost);

  const persistPendingPayment = useCallback((payment: PendingPaymentSession): PendingPaymentSession => {
    const nextPayment = {
      ...payment,
      savedAt: new Date().toISOString(),
    };

    savePendingPaymentSession(nextPayment);
    setPendingPayment(nextPayment);
    return nextPayment;
  }, []);

  const clearPendingPayment = useCallback(() => {
    clearPendingPaymentSession();
    setPendingPayment(null);
  }, []);

  useEffect(() => {
    setPendingPayment(readPendingPaymentSession());
    setPendingPaymentHydrated(true);
  }, []);

  useEffect(() => {
    if (isChecking || !isAuthenticated) {
      setShippingOptions([]);
      setSelectedService("");
      setShippingLoading(false);
      setShippingError(null);
      setQuotedShippingWeight(null);
      setShippingStrictMode(false);
      return;
    }

    const addressId = String(selectedAddress?.id ?? "").trim();

    if (!containsPurchaseItem || !addressId || shippingRequestItems.length === 0) {
      setShippingOptions([]);
      setSelectedService("");
      setShippingError(null);
      setQuotedShippingWeight(null);
      setShippingStrictMode(false);
      return;
    }

    let active = true;
    setShippingLoading(true);
    setShippingError(null);

    checkoutApi
      .getShippingCost({
        address_id: addressId,
        courier,
        items: shippingRequestItems,
      })
      .then((result) => {
        if (!active) return;
        setQuotedShippingWeight(result.weight);
        setShippingStrictMode(result.strictMode);
        setShippingOptions(result.options);
        setSelectedService((prev) => {
          if (prev && result.options.some((option) => option.service === prev)) {
            return prev;
          }

          return result.options[0]?.service ?? "";
        });
      })
      .catch((error) => {
        if (!active) return;
        setQuotedShippingWeight(null);
        setShippingStrictMode(false);
        setShippingOptions([]);
        setSelectedService("");
        setShippingError(error instanceof Error ? error.message : "Gagal mengambil ongkir.");
      })
      .finally(() => {
        if (!active) return;
        setShippingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [containsPurchaseItem, courier, isAuthenticated, isChecking, selectedAddress?.id, shippingRequestItems]);

  const openMidtransSnap = useCallback(
    async (payment: PendingPaymentSession) => {
      const activePayment = persistPendingPayment(payment);
      setSnapModalActive(true);

      if (!activePayment.snapToken && activePayment.snapRedirectUrl) {
        setCheckoutInfo(`Mengalihkan pembayaran order ${activePayment.orderNumber} ke Midtrans...`);
        redirectToMidtransPayment(activePayment.snapRedirectUrl);
        return;
      }

      if (!activePayment.snapToken) {
        setSnapModalActive(false);
        throw new Error("Token pembayaran Midtrans tidak tersedia untuk order ini.");
      }

      if (!activePayment.midtransClientKey) {
        if (activePayment.snapRedirectUrl) {
          setCheckoutInfo("Mengalihkan ke halaman pembayaran Midtrans...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        setSnapModalActive(false);
        throw new Error("MIDTRANS_CLIENT_KEY belum dikonfigurasi di backend.");
      }

      try {
        await loadMidtransSnapScript(activePayment.midtransSnapJsUrl, activePayment.midtransClientKey);
      } catch (error) {
        if (activePayment.snapRedirectUrl) {
          setCheckoutInfo("Popup Midtrans tidak tersedia, mengalihkan ke halaman pembayaran...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        setSnapModalActive(false);
        throw error;
      }

      if (!window.snap) {
        if (activePayment.snapRedirectUrl) {
          setCheckoutInfo("Midtrans Snap belum siap, mengalihkan ke halaman pembayaran...");
          redirectToMidtransPayment(activePayment.snapRedirectUrl);
          return;
        }

        setSnapModalActive(false);
        throw new Error("Midtrans Snap belum siap.");
      }

      window.snap.pay(activePayment.snapToken, {
        onSuccess: () => {
          setSnapModalActive(false);
          clearPendingPayment();
          clearPendingPaymentSnapshot(activePayment.orderNumber);
          setCheckoutError(null);
          setCheckoutInfo(`Pembayaran berhasil untuk order ${activePayment.orderNumber}.`);
          redirectToTransactions(activePayment.orderId, activePayment.orderNumber, "finish", "success");
        },
        onPending: (result) => {
          setSnapModalActive(false);
          persistPendingPayment(activePayment);
          const snapshot = normalizeMidtransPendingSnapshot(result, {
            orderNumber: activePayment.orderNumber,
            totalAmount: activePayment.totalAmount,
          });
          if (snapshot) {
            savePendingPaymentSnapshot(snapshot);
          }
          setCheckoutError(null);
          setCheckoutInfo(
            `Pembayaran order ${activePayment.orderNumber} masih menunggu penyelesaian. Pesanan tetap tersimpan di riwayat Anda.`
          );
          redirectToTransactionDetail(activePayment.orderId, activePayment.orderNumber, "pending", "pending");
        },
        onError: () => {
          setSnapModalActive(false);
          persistPendingPayment(activePayment);
          setCheckoutInfo(null);
          setCheckoutError(
            `Pembayaran untuk order ${activePayment.orderNumber} belum berhasil. Pesanan tidak dibatalkan dan Anda bisa melanjutkan pembayaran lagi.`
          );
        },
        onClose: () => {
          setSnapModalActive(false);
          persistPendingPayment(activePayment);
          setCheckoutError(null);
          setCheckoutInfo(
            `Popup pembayaran ditutup. Pesanan ${activePayment.orderNumber} sudah tersimpan di riwayat dan bisa dilanjutkan kapan saja.`
          );
          redirectToTransactions(activePayment.orderId, activePayment.orderNumber, "pending", "closed");
        },
      });
    },
    [clearPendingPayment, persistPendingPayment]
  );

  const resumePendingPayment = useCallback(
    async (orderId: string, options?: { autoOpen?: boolean }) => {
      if (!orderId.trim()) {
        return;
      }

      setPendingPaymentLoading(true);
      setCheckoutError(null);

      try {
        const paymentResult = await customerOrdersApi.getPayment(orderId);
        const activePayment = persistPendingPayment(buildPendingPaymentSessionFromOrder(paymentResult));

        setCheckoutInfo(
          options?.autoOpen
            ? `Menampilkan kembali pembayaran untuk order ${activePayment.orderNumber}.`
            : `Melanjutkan pembayaran untuk order ${activePayment.orderNumber}.`
        );

        await openMidtransSnap(activePayment);
      } catch (error) {
        setSnapModalActive(false);
        const message = error instanceof Error ? error.message : "Gagal memuat pembayaran pesanan.";
        const normalizedMessage = message.toLowerCase();
        const shouldClearPending =
          normalizedMessage.includes("tidak memerlukan pembayaran ulang") ||
          normalizedMessage.includes("pesanan tidak ditemukan") ||
          normalizedMessage.includes("token pembayaran midtrans tidak tersedia");

        if (shouldClearPending) {
          clearPendingPayment();
        }

        setCheckoutInfo(null);
        setCheckoutError(
          shouldClearPending
            ? message
            : `${message} Pesanan tetap tersimpan. Coba lanjutkan pembayaran lagi beberapa saat lagi.`
        );
      } finally {
        setPendingPaymentLoading(false);
      }
    },
    [clearPendingPayment, openMidtransSnap, persistPendingPayment]
  );

  useEffect(() => {
    if (isChecking || !isAuthenticated || autoResumeAttemptedRef.current) {
      return;
    }

    autoResumeAttemptedRef.current = true;

    const storedPayment = readPendingPaymentSession();
    if (!storedPayment?.orderId) {
      return;
    }

    setPendingPayment(storedPayment);
    setCheckoutInfo(`Menemukan pembayaran tertunda untuk order ${storedPayment.orderNumber}. Memulihkan sesi pembayaran...`);
    void resumePendingPayment(storedPayment.orderId, { autoOpen: true });
  }, [isAuthenticated, isChecking, resumePendingPayment]);

  const handleCheckout = async () => {
    if (submitGuardRef.current || submitLoading) {
      return;
    }

    if (pendingPayment?.orderId) {
      setCheckoutInfo(null);
      setCheckoutError(
        `Masih ada pembayaran tertunda untuk order ${pendingPayment.orderNumber}. Lanjutkan pembayaran yang sama agar tidak membuat order ganda.`
      );
      return;
    }

    if (containsPurchaseItem && !selectedAddress?.id) {
      setCheckoutError("Pilih alamat pengiriman terlebih dahulu.");
      return;
    }

    if (containsPurchaseItem && !selectedShipping) {
      setCheckoutError("Pilih layanan pengiriman terlebih dahulu.");
      return;
    }

    if (checkoutItems.length === 0) {
      setCheckoutError("Keranjang checkout kosong.");
      return;
    }

    submitGuardRef.current = true;
    setSubmitLoading(true);
    setCheckoutError(null);
    setCheckoutInfo(
      isTradeInOnlyCheckout
        ? "Mengirim pengajuan trade-in ke riwayat transaksi..."
        : "Membuat order dan menyiapkan pembayaran Midtrans..."
    );

    let createdPaymentSession: PendingPaymentSession | null = null;

    try {
      const result = await checkoutApi.processCheckout({
        ...(containsPurchaseItem
          ? {
              address_id: selectedAddress?.id ?? "",
              courier,
              service: selectedShipping?.service ?? "",
            }
          : {}),
        trade_in_discount: appliedTradeInDiscount,
        items: checkoutRequestItems,
      });

      consumeItems(selectedCartItems.map((item) => item.id));
      clearPendingPayment();

      if (!result.requiresPayment) {
        const highlightedTradeIn = result.entryKind === "trade_in" ? (result.tradeInTransactions[0] ?? null) : null;
        const targetId = highlightedTradeIn?.id ?? result.order.id;
        const targetNumber = highlightedTradeIn?.transactionNumber ?? result.order.orderNumber;

        setCheckoutInfo(
          isTradeInOnlyCheckout
            ? `Pengajuan trade-in ${targetNumber} berhasil dikirim dan masuk ke riwayat transaksi.`
            : `Pesanan ${result.order.orderNumber} berhasil dibuat tanpa pembayaran dan menunggu review trade-in.`
        );

        if (targetId && targetNumber) {
          redirectToTransactions(targetId, targetNumber, "paid", "trade_in_submitted");
          return;
        }

        window.location.assign("/transaksi");
        return;
      }

      const paymentSession = persistPendingPayment(buildPendingPaymentSessionFromCheckout(result));
      createdPaymentSession = paymentSession;
      setCheckoutInfo(`Pesanan ${paymentSession.orderNumber} berhasil dibuat. Menyiapkan pembayaran...`);
      await openMidtransSnap(paymentSession);
    } catch (error) {
      setSnapModalActive(false);
      const message = error instanceof Error ? error.message : "Checkout gagal diproses.";
      setCheckoutInfo(null);
      setCheckoutError(
        createdPaymentSession?.orderNumber
          ? `${message} Pesanan ${createdPaymentSession.orderNumber} tetap tersimpan dan bisa dilanjutkan pembayarannya.`
          : message
      );
    } finally {
      submitGuardRef.current = false;
      setSubmitLoading(false);
    }
  };

  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f1f5f9]">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Memeriksa sesi login...
          </div>
        </div>
      </div>
    );
  }

  if (selectedCartItems.length === 0 && !cartLoading && !pendingPaymentHydrated) {
    return (
      <div className="min-h-screen bg-[#f1f5f9]">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Memeriksa pembayaran tertunda...
          </div>
        </div>
      </div>
    );
  }

  if (selectedCartItems.length === 0 && !cartLoading && pendingPayment && !snapModalActive) {
    return (
      <div className="min-h-screen bg-[#f1f5f9]">
        <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pembayaran Tertunda</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Pesanan sudah tersimpan di riwayat</h1>
            <p className="mt-3 text-sm text-slate-600">
              Order {pendingPayment.orderNumber} masih menunggu pembayaran. Lanjutkan dengan token Midtrans yang sama
              atau buka riwayat transaksi Anda.
            </p>

            {checkoutError ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {checkoutError}
              </div>
            ) : null}
            {checkoutInfo ? (
              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {checkoutInfo}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                loading={pendingPaymentLoading}
                disabled={pendingPaymentLoading}
                onClick={() => {
                  void resumePendingPayment(pendingPayment.orderId);
                }}
                className="h-11 rounded-xl bg-blue-600 px-5 hover:bg-blue-700"
              >
                Lanjutkan Pembayaran
              </Button>
              <Link
                href="/transaksi"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Buka Riwayat Pesanan
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedCartItems.length === 0 && !cartLoading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9]">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
          <p className="mt-3 text-sm text-slate-500">Belum ada produk yang dipilih untuk checkout.</p>
          <Link
            href="/cart"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Kembali ke Keranjang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">Checkout</h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          {isTradeInOnlyCheckout
            ? "Periksa kembali item trade-in Anda. Pengajuan ini akan langsung masuk ke transaksi tanpa pembayaran Midtrans."
            : "Periksa detail pesanan dan alamat pengiriman sebelum lanjut ke pembayaran."}
        </p>

        {addressError ? (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {addressError}
          </div>
        ) : null}
        {shippingError ? (
          <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {shippingError}
          </div>
        ) : null}
        {checkoutError ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {checkoutError}
          </div>
        ) : null}
        {checkoutInfo ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {checkoutInfo}
          </div>
        ) : null}
        {pendingPayment && !snapModalActive ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
            <p className="font-semibold">Pembayaran order {pendingPayment.orderNumber} masih tertunda.</p>
            <p className="mt-1">
              Pesanan sudah tersimpan di riwayat. Lanjutkan pembayaran dengan token yang sama agar tidak membuat order
              baru.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                type="button"
                loading={pendingPaymentLoading}
                disabled={pendingPaymentLoading}
                onClick={() => {
                  void resumePendingPayment(pendingPayment.orderId);
                }}
                className="h-10 rounded-xl bg-blue-600 px-4 hover:bg-blue-700"
              >
                Lanjutkan Pembayaran
              </Button>
              <Link
                href="/transaksi"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Buka Riwayat Pesanan
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-8">
            {containsPurchaseItem ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Alamat</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">Alamat Pengiriman</h2>
                  </div>
                  <Link
                    href="/account/addresses"
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Kelola Alamat
                  </Link>
                </div>

                <div className="mt-4 grid gap-3">
                  {addressLoading && addresses.length === 0 ? (
                    <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
                  ) : null}

                  {addresses.map((address) => {
                    const active = selectedAddressId === address.id;
                    return (
                      <button
                        key={address.id}
                        type="button"
                        disabled={savingId === address.id}
                        onClick={() => {
                          void setMainAddress(address.id);
                        }}
                        className={`rounded-xl border p-4 text-left transition ${
                          active
                            ? "border-blue-500 bg-blue-50/60"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{address.recipient_name}</p>
                          {savingId === address.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{address.recipient_phone ?? "-"}</p>
                        <p className="mt-1 text-sm text-slate-700">{address.full_address}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Trade-In Only</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Tanpa Alamat Pengiriman Saat Ini</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Checkout ini hanya berisi pengajuan trade-in. Tidak ada produk baru yang dikirim sekarang, jadi
                  alamat pengiriman dan ongkir belum diperlukan. Setelah trade-in disetujui, admin akan mengarahkan
                  Anda untuk kirim device ke origin atau datang ke offline store.
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Barang</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {containsPurchaseItem ? "Ringkasan Checkout" : "Item Trade-In"}
                  </h2>
                </div>
                {hasPendingProductSnapshots || productsSyncing ? (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sinkronisasi harga master produk...
                  </div>
                ) : null}
              </div>

              <div className="mt-4 space-y-3">
                {purchaseCheckoutItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Produk Baru</p>
                      <p className="text-xs text-slate-500">Item yang akan dibayar dan dikirim</p>
                    </div>
                    {purchaseCheckoutItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex gap-3">
                          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                            {pricingReady ? (
                              <>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.quantity} x {formatCurrencyIDR(item.unitPrice)}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {formatCurrencyIDR(item.lineTotal)}
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="mt-2 h-3.5 w-28 animate-pulse rounded bg-slate-200" />
                                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-slate-200" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {tradeInCheckoutItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Produk Trade-In</p>
                      <p className="text-xs text-slate-500">Nilai estimasi akan direview admin terlebih dahulu</p>
                    </div>
                    {tradeInCheckoutItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                        <div className="flex gap-3">
                          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-emerald-200 bg-white">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              sizes="64px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</p>
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                Trade-In
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.tradeInTransactionId ? `ID pengajuan: ${item.tradeInTransactionId}` : "Menunggu review admin"}
                            </p>
                            {pricingReady ? (
                              <p className="mt-1 text-sm font-semibold text-emerald-700">
                                Estimasi kredit {formatCurrencyIDR(item.tradeInValue)}
                              </p>
                            ) : (
                              <div className="mt-2 h-4 w-28 animate-pulse rounded bg-emerald-100" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {containsPurchaseItem ? (
                <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Kurir</p>
                  <select
                    value={courier}
                    onChange={(event) => setCourier(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    {COURIER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Layanan</p>
                  <select
                    value={selectedService}
                    disabled={shippingLoading || shippingOptions.length === 0}
                    onChange={(event) => setSelectedService(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {shippingOptions.length === 0 ? <option value="">Pilih layanan</option> : null}
                    {shippingOptions.map((option) => (
                      <option key={option.service} value={option.service}>
                        {option.service} - {formatCurrencyIDR(option.cost)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {shippingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                <span>Estimasi tiba: {formatEstimatedDelivery(selectedShipping?.etd)}</span>
                <span className="text-slate-400">•</span>
                <span>
                  Berat server: {quotedShippingWeight !== null ? `${quotedShippingWeight} gram` : shippingLoading ? "memverifikasi..." : "-"}
                </span>
              </div>
              {!shippingStrictMode && selectedShipping?.note === "cached" ? (
                <p className="mt-2 text-xs text-amber-600">
                  Estimasi ongkir memakai cache terakhir karena RajaOngkir sedang tidak merespons.
                </p>
              ) : null}
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-800">
                  Trade-in only tidak membutuhkan ongkir dan pengiriman keluar saat ini. Status lanjutan akan muncul di
                  halaman transaksi setelah admin memeriksa foto dan kondisi device Anda.
                </div>
              )}
            </section>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-24 lg:col-span-4">
            <h2 className="text-3xl font-bold text-slate-900">Ringkasan Pesanan</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">
                  {containsPurchaseItem ? "Harga Produk Baru" : "Nilai Trade-In Tersimpan"}
                </p>
                {pricingReady ? (
                  <p className="font-semibold text-slate-900">
                    {formatCurrencyIDR(containsPurchaseItem ? subtotal : tradeInDiscount)}
                  </p>
                ) : (
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                )}
              </div>
              {containsTradeInItem && containsPurchaseItem ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-emerald-600">Nilai Trade-In</p>
                    {tradeInDiscountPercent > 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        -{tradeInDiscountPercent}%
                      </span>
                    ) : null}
                  </div>
                  {pricingReady ? (
                    <p className="font-semibold text-emerald-600">{formatDiscountCurrencyIDR(appliedTradeInDiscount)}</p>
                  ) : (
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                  )}
                </div>
              ) : null}
              {containsPurchaseItem ? (
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">Ongkos Kirim</p>
                  <p className="font-semibold text-slate-900">{formatCurrencyIDR(shippingCost)}</p>
                </div>
              ) : null}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-900">
                    {containsPurchaseItem
                      ? containsTradeInItem
                        ? "Total Setelah Trade-In"
                        : "Total"
                      : "Total Pembayaran"}
                  </p>
                  {pricingReady ? (
                    <p className="text-xl font-bold text-blue-600">{formatCurrencyIDR(totalAmount)}</p>
                  ) : (
                    <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
              <p className="text-sm font-semibold text-blue-900">Alur Checkout</p>
              <p className="mt-1 text-xs text-blue-700">
                {containsPurchaseItem
                  ? "Produk baru tetap lewat checkout. Nilai trade-in akan jadi potongan, lalu admin review device lama Anda."
                  : "Checkout ini hanya menyimpan pengajuan trade-in ke transaksi. Tidak ada pembayaran Midtrans."}
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                <MapPin className="h-3.5 w-3.5" />
                {containsPurchaseItem ? "Midtrans aktif jika masih ada sisa tagihan" : "Tanpa pembayaran"}
              </div>
            </div>
            <Button
              type="button"
              loading={submitLoading}
              disabled={
                submitLoading ||
                pendingPaymentLoading ||
                (containsPurchaseItem && shippingLoading) ||
                cartLoading ||
                (containsPurchaseItem && addressLoading) ||
                !pricingReady ||
                checkoutItems.length === 0 ||
                (containsPurchaseItem && !selectedAddress?.id) ||
                (containsPurchaseItem && !selectedShipping) ||
                Boolean(pendingPayment?.orderId)
              }
              onClick={() => {
                void handleCheckout();
              }}
              className="mt-5 h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {isTradeInOnlyCheckout ? "Ajukan Trade-In" : "Buat Pesanan"}
            </Button>

            {submitLoading ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                Order sedang dibuat. Tombol dikunci untuk mencegah Order ID ganda.
              </div>
            ) : null}
            {pendingPayment && !snapModalActive ? (
              <p className="mt-3 text-xs text-amber-700">
                Tombol checkout dinonaktifkan sementara karena order {pendingPayment.orderNumber} masih menunggu pembayaran.
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
