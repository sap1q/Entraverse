"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Boxes, ClipboardList, RefreshCcw, Store } from "lucide-react";
import { useProductSyncStatus } from "@/hooks/useProductSyncStatus";
import { formatDateTimeID } from "@/lib/utils/formatter";

const dashboardShortcuts = [
  {
    title: "Master Produk",
    href: "/admin/master-produk",
    description: "Tarik data produk dari Mekari Jurnal dan kelola harga dasarnya.",
    icon: Boxes,
  },
  {
    title: "Marketplace Produk",
    href: "/admin/marketplace-produk",
    description: "Atur mapping SKU, koneksi akun, dan push ke marketplace.",
    icon: Store,
  },
  {
    title: "Pemesanan",
    href: "/admin/pemesanan",
    description: "Pantau pesanan, fulfillment, dan status transaksi.",
    icon: ClipboardList,
  },
  {
    title: "Trade-In",
    href: "/admin/trade-in",
    description: "Lihat pengajuan trade-in customer beserta foto perangkat.",
    icon: RefreshCcw,
  },
];

const formatSyncValue = (value: string | null): string => {
  if (!value) return "Belum ada data";

  try {
    return formatDateTimeID(value);
  } catch {
    return value;
  }
};

export default function AdminDashboardPage() {
  const { metrics, loading, error } = useProductSyncStatus();

  const overviewCards = [
    {
      label: "Master Products Loaded",
      value: loading ? "..." : `${metrics.masterProductCount}`,
      tint: "border-slate-200 bg-slate-50/80 text-slate-700",
    },
    {
      label: "Last Inbound Sync",
      value: loading ? "Memuat..." : formatSyncValue(metrics.latestInboundSync),
      tint: "border-blue-100 bg-blue-50/70 text-blue-700",
    },
    {
      label: "Last Outbound Push",
      value: loading ? "Memuat..." : formatSyncValue(metrics.latestOutboundPush),
      tint: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    },
    {
      label: "SKU Belum Termapping",
      value: loading ? "..." : `${metrics.unmappedSkuCount}`,
      tint: "border-amber-100 bg-amber-50/70 text-amber-700",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Ringkasan operasional Entraverse.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Master Produk menjadi sumber data utama dari Jurnal, sedangkan mapping, status sinkronisasi, dan push ke marketplace dikelola dari Marketplace Produk.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[560px]">
            {dashboardShortcuts.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <article key={card.label} className={`rounded-2xl border p-5 shadow-sm ${card.tint}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{card.value}</p>
          </article>
        ))}
      </section>

      {metrics.truncated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Ringkasan sinkronisasi dihitung dari sebagian data API yang terbaca saat ini.
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-900">Alur Kerja</h2>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">1. Master Produk</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Tarik dari Mekari Jurnal</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">2. Marketplace Produk</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Mapping SKU dan status koneksi</p>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">3. Push Marketplace</p>
            <p className="mt-2 text-base font-semibold text-slate-900">Dorong perubahan harga dan stok</p>
          </article>
        </div>
      </section>
    </div>
  );
}
