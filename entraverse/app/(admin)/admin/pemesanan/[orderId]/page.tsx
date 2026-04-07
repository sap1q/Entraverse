"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  MapPin,
  Package2,
  ReceiptText,
  Truck,
  UserRound,
} from "lucide-react";
import api from "@/lib/axios";
import { formatDisplayAddress } from "@/lib/utils/address";
import { formatCurrencyIDR, formatDateID, formatDateTimeID } from "@/lib/utils/formatter";

type AdminSalesOrderStatus = "dibayar" | "diproses" | "dikirim" | "terkirim" | "selesai" | "dibatalkan";

type AdminSalesOrderItem = {
  id: string;
  product_name: string;
  variant_name: string | null;
  variant_sku: string;
  warehouse: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type AdminSalesOrderInvoice = {
  id: string;
  invoice_number: string;
  payment_method: string | null;
  payment_va_number: string | null;
  payment_bill_key: string | null;
  amount_total: number;
  payment_status: "pending" | "paid" | "expired" | "failed";
  snap_token: string | null;
  expiry_time: string | null;
  paid_at: string | null;
};

type AdminSalesOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  status: AdminSalesOrderStatus;
  payment_status: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  subtotal: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  shipping_courier: string | null;
  shipping_service: string | null;
  shipping_etd: string | null;
  shipping_weight: number | null;
  notes: string | null;
  created_at: string;
  settled_at: string | null;
  invoice: AdminSalesOrderInvoice | null;
  items: AdminSalesOrderItem[];
  created_by: {
    id: string;
    name: string;
    email: string;
  } | null;
};

const endpoint = (): string => {
  const base = String(api.defaults.baseURL ?? "").toLowerCase();
  return base.endsWith("/v1") || base.includes("/api/v1") ? "/admin/sales-orders" : "/v1/admin/sales-orders";
};

const toFriendlyError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Terjadi gangguan saat memuat detail pesanan.";
};

const formatAddress = (value: string | null): string => formatDisplayAddress(value) ?? "-";

const resolveStatusMeta = (order: AdminSalesOrder | null): {
  label: string;
  badgeClassName: string;
  cardClassName: string;
} => {
  if (!order) {
    return {
      label: "-",
      badgeClassName: "border-slate-200 bg-slate-50 text-slate-600",
      cardClassName: "border-slate-200 bg-slate-50/70",
    };
  }

  if (order.status === "dibatalkan" || order.invoice?.payment_status === "failed" || order.invoice?.payment_status === "expired") {
    return {
      label: order.status === "dibatalkan" ? "Dibatalkan" : "Pembayaran Gagal",
      badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
      cardClassName: "border-rose-200 bg-rose-50/40",
    };
  }

  if (order.status === "selesai" || order.invoice?.payment_status === "paid") {
    return {
      label: order.status === "selesai" ? "Selesai" : "Dibayar",
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      cardClassName: "border-emerald-200 bg-emerald-50/40",
    };
  }

  if (order.status === "dibayar") {
    return {
      label: "Menunggu Pembayaran",
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
      cardClassName: "border-amber-200 bg-amber-50/40",
    };
  }

  return {
    label:
      order.status === "terkirim"
        ? "Pesanan Terkirim"
        : order.status === "dikirim"
          ? "Dikirim"
          : "Diproses",
    badgeClassName: "border-blue-200 bg-blue-50 text-blue-700",
    cardClassName: "border-blue-200 bg-blue-50/40",
  };
};

export default function AdminSalesOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<AdminSalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`${endpoint()}/${String(params.orderId ?? "")}`);
        if (cancelled) return;

        if (!response.data?.data) {
          throw new Error("Detail pesanan tidak valid.");
        }

        setOrder(response.data.data as AdminSalesOrder);
      } catch (loadError) {
        if (cancelled) return;
        setError(toFriendlyError(loadError));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [params.orderId]);

  useEffect(() => {
    if (!copiedKey) return;

    const timeoutId = window.setTimeout(() => setCopiedKey(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copiedKey]);

  const statusMeta = useMemo(() => resolveStatusMeta(order), [order]);
  const formattedAddress = useMemo(() => formatAddress(order?.customer_address ?? null), [order?.customer_address]);

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
    } catch {
      setError("Gagal menyalin data pembayaran.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Admin / Pemesanan / Detail Pesanan</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Detail Pesanan</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-500">
            Tinjau rincian pembayaran, alamat pelanggan, pengiriman, dan item pesanan dalam satu tampilan admin.
          </p>
        </div>

        <Link
          href="/admin/pemesanan"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Pemesanan
        </Link>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-[32px] border border-slate-200 bg-white" />
          <div className="h-96 animate-pulse rounded-[32px] border border-slate-200 bg-white" />
        </div>
      ) : null}

      {order ? (
        <>
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Order ID</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{order.order_number}</h2>
                  <button
                    type="button"
                    onClick={() => void handleCopy(order.order_number, "order")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Salin order ID"
                  >
                    {copiedKey === "order" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Dibuat pada {order.created_at ? formatDateTimeID(order.created_at) : "-"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Invoice: <span className="font-medium text-slate-700">{order.invoice?.invoice_number ?? "-"}</span>
                </p>
              </div>

              <div className="space-y-2 text-left sm:text-right">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusMeta.badgeClassName}`}
                >
                  {statusMeta.label}
                </span>
                <p className="text-sm text-slate-500">
                  Pembayaran: <span className="font-medium text-slate-700">{order.invoice?.payment_method ?? order.payment_method ?? "-"}</span>
                </p>
                <p className="text-sm text-slate-500">
                  Dibuat oleh: <span className="font-medium text-slate-700">{order.created_by?.name ?? "Admin"}</span>
                </p>
              </div>
            </div>

            <div className={`mt-6 rounded-[28px] border p-5 ${statusMeta.cardClassName}`}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-700">
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-semibold text-slate-800">{order.invoice?.payment_method ?? order.payment_method ?? "Pembayaran"}</p>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{formatCurrencyIDR(order.total_amount)}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Referensi pembayaran: <span className="font-medium text-slate-700">{order.payment_reference ?? order.invoice?.invoice_number ?? "-"}</span>
                  </p>
                </div>

                <div className="space-y-2 text-left sm:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Batas Waktu</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {order.invoice?.expiry_time ? formatDateTimeID(order.invoice.expiry_time) : "-"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Status invoice: <span className="font-medium text-slate-700">{order.invoice?.payment_status ?? order.payment_status ?? "-"}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nomor Pembayaran</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold tracking-tight text-slate-900">
                      {order.invoice?.payment_va_number ?? order.invoice?.payment_bill_key ?? order.payment_reference ?? "-"}
                    </p>
                    {order.invoice?.payment_va_number || order.invoice?.payment_bill_key ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(order.invoice?.payment_va_number ?? order.invoice?.payment_bill_key ?? "", "payment")
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        aria-label="Salin nomor pembayaran"
                      >
                        {copiedKey === "payment" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pelunasan</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {order.invoice?.paid_at
                      ? formatDateTimeID(order.invoice.paid_at)
                      : order.settled_at
                        ? formatDateTimeID(order.settled_at)
                        : "-"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Package2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Produk Dipesan</h2>
                <p className="text-sm text-slate-500">Detail item pesanan yang tercatat di sistem admin.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/60 px-4 py-4 md:grid-cols-[minmax(0,1fr)_140px_170px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{item.product_name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.variant_name ?? "Default"} - {item.variant_sku}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Warehouse: {item.warehouse}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Qty</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{item.quantity}</p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Line Total</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrencyIDR(item.line_total)}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatCurrencyIDR(item.unit_price)} / item</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Alamat Pelanggan</h2>
                <p className="text-sm text-slate-500">Informasi kontak dan alamat pengiriman pesanan.</p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/60 px-5 py-5">
              <p className="text-xl font-semibold text-slate-900">{order.customer_name}</p>
              <p className="mt-2 text-sm text-slate-600">{order.customer_phone || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{order.customer_email || "-"}</p>
              <div className="mt-4 flex gap-3 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="whitespace-pre-line leading-7">{formattedAddress}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="h-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Rincian Biaya</h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">{formatCurrencyIDR(order.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Ongkir</span>
                  <span className="font-medium text-slate-900">{formatCurrencyIDR(order.shipping_cost)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Diskon</span>
                  <span className="font-medium text-slate-900">{formatCurrencyIDR(order.discount_amount)}</span>
                </div>
              </div>
              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold text-slate-900">Total</span>
                  <span className="text-3xl font-semibold tracking-tight text-blue-600">{formatCurrencyIDR(order.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="h-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Pengiriman</h2>
                  <p className="text-sm text-slate-500">Ringkasan kurir, layanan, dan estimasi pengiriman.</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Kurir</span>
                  <span className="font-medium uppercase text-slate-900">{order.shipping_courier || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Layanan</span>
                  <span className="font-medium text-slate-900">{order.shipping_service || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Estimasi</span>
                  <span className="font-medium text-slate-900">{order.shipping_etd || "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Berat</span>
                  <span className="font-medium text-slate-900">{order.shipping_weight ? `${order.shipping_weight} gram` : "-"}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                  <span>Tanggal</span>
                  <span className="font-medium text-slate-900">{order.created_at ? formatDateID(order.created_at) : "-"}</span>
                </div>
              </div>

              {order.notes ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Catatan Admin</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{order.notes}</p>
                </div>
              ) : null}

              {order.invoice?.expiry_time ? (
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <p>Pembayaran berlaku sampai {formatDateTimeID(order.invoice.expiry_time)}.</p>
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {!loading && !order && !error ? (
        <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
          Detail pesanan tidak tersedia.
        </div>
      ) : null}
    </div>
  );
}
