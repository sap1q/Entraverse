"use client";

import type { CheckoutProcessResult } from "@/lib/api/checkout";
import type { CustomerOrderPaymentResult } from "@/lib/api/customer-orders";

export type MidtransSnapPayOptions = {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
};

type MidtransSnap = {
  pay: (token: string, options?: MidtransSnapPayOptions) => void;
};

export type PendingPaymentSession = {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  totalAmount: number;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  midtransClientKey: string;
  midtransSnapJsUrl: string;
  savedAt: string;
};

declare global {
  interface Window {
    snap?: MidtransSnap;
  }
}

const STORAGE_KEY = "entraverse.checkout.pending-payment";

const isPendingPaymentSession = (value: unknown): value is PendingPaymentSession => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PendingPaymentSession>;
  return (
    typeof candidate.orderId === "string" &&
    candidate.orderId.trim().length > 0 &&
    typeof candidate.orderNumber === "string" &&
    candidate.orderNumber.trim().length > 0 &&
    typeof candidate.paymentStatus === "string" &&
    typeof candidate.totalAmount === "number" &&
    Number.isFinite(candidate.totalAmount) &&
    (candidate.snapToken === null || typeof candidate.snapToken === "string") &&
    (candidate.snapRedirectUrl === null || typeof candidate.snapRedirectUrl === "string") &&
    typeof candidate.midtransClientKey === "string" &&
    typeof candidate.midtransSnapJsUrl === "string" &&
    typeof candidate.savedAt === "string"
  );
};

export const readPendingPaymentSession = (): PendingPaymentSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isPendingPaymentSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const savePendingPaymentSession = (payment: PendingPaymentSession): PendingPaymentSession => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payment));
  }

  return payment;
};

export const clearPendingPaymentSession = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const buildPendingPaymentSessionFromCheckout = (
  result: CheckoutProcessResult
): PendingPaymentSession => ({
  orderId: result.order.id,
  orderNumber: result.order.orderNumber,
  paymentStatus: result.order.paymentStatus,
  totalAmount: result.order.totalAmount,
  snapToken: result.snapToken.trim().length > 0 ? result.snapToken : null,
  snapRedirectUrl: result.snapRedirectUrl,
  midtransClientKey: result.midtransClientKey,
  midtransSnapJsUrl: result.midtransSnapJsUrl,
  savedAt: new Date().toISOString(),
});

export const buildPendingPaymentSessionFromOrder = (
  result: CustomerOrderPaymentResult
): PendingPaymentSession => ({
  orderId: result.orderId,
  orderNumber: result.orderNumber,
  paymentStatus: result.paymentStatus,
  totalAmount: result.totalAmount,
  snapToken: result.snapToken,
  snapRedirectUrl: result.snapRedirectUrl,
  midtransClientKey: result.midtransClientKey,
  midtransSnapJsUrl: result.midtransSnapJsUrl,
  savedAt: new Date().toISOString(),
});

export const loadMidtransSnapScript = async (src: string, clientKey: string): Promise<void> => {
  if (typeof window === "undefined") return;
  if (window.snap) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("midtrans-snap-script") as HTMLScriptElement | null;
    if (existing) {
      if (window.snap) {
        resolve();
        return;
      }

      if (existing.dataset.loaded === "true") {
        reject(new Error("Midtrans Snap.js termuat tetapi objek snap tidak tersedia."));
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Midtrans Snap.js.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "midtrans-snap-script";
    script.src = src;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap.js."));
    document.body.appendChild(script);
  });
};

export const redirectToMidtransPayment = (url: string): void => {
  if (typeof window === "undefined") return;
  window.location.assign(url);
};
