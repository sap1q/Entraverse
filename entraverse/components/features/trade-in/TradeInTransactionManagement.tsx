"use client";

import Image from "next/image";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Images,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  Truck,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  tradeInTransactionApi,
  type TradeInTransaction,
  type TradeInTransactionPhoto,
  type TradeInTransactionStatus,
} from "@/lib/api/trade-in-transactions";
import { formatCurrencyIDR, formatDateTimeID } from "@/lib/utils/formatter";
import { cn } from "@/src/lib/utils";

type NoticeState = {
  tone: "success" | "error";
  message: string;
};

const STATUS_OPTIONS: Array<{ value: "all" | TradeInTransactionStatus; label: string }> = [
  { value: "all", label: "Semua status" },
  { value: "menunggu_review", label: "Menunggu Review" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
  { value: "menunggu_pengiriman", label: "Menunggu Pengiriman" },
  { value: "dikirim_pelanggan", label: "Dikirim Pelanggan" },
  { value: "kunjungan_toko", label: "Kunjungan Toko" },
  { value: "selesai", label: "Selesai" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

const STATUS_LABEL: Record<TradeInTransactionStatus, string> = {
  menunggu_review: "Menunggu Review",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  menunggu_pengiriman: "Menunggu Pengiriman",
  dikirim_pelanggan: "Dikirim Pelanggan",
  kunjungan_toko: "Kunjungan Toko",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const STATUS_BADGE: Record<TradeInTransactionStatus, string> = {
  menunggu_review: "border-amber-200 bg-amber-50 text-amber-700",
  disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ditolak: "border-rose-200 bg-rose-50 text-rose-700",
  menunggu_pengiriman: "border-sky-200 bg-sky-50 text-sky-700",
  dikirim_pelanggan: "border-indigo-200 bg-indigo-50 text-indigo-700",
  kunjungan_toko: "border-violet-200 bg-violet-50 text-violet-700",
  selesai: "border-slate-200 bg-slate-100 text-slate-700",
  dibatalkan: "border-rose-200 bg-rose-50 text-rose-700",
};

const FULFILLMENT_LABEL: Record<TradeInTransaction["fulfillment_method"], string> = {
  belum_dipilih: "Belum dipilih",
  pengiriman: "Pengiriman",
  offline_store: "Offline store",
};

const tradeInBodyGridClass =
  "md:grid-cols-2 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1.08fr)_minmax(0,0.88fr)_minmax(0,0.88fr)_76px]";

const formatDate = (value: string | null): string => {
  if (!value) return "-";

  try {
    return formatDateTimeID(value);
  } catch {
    return value;
  }
};

const getDeviceLabel = (transaction: TradeInTransaction): string => {
  return [transaction.device_brand, transaction.device_model, transaction.device_variant]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
};

const getTargetLabel = (transaction: TradeInTransaction): string => {
  return (
    transaction.requested_product?.name ??
    transaction.requested_product_name ??
    (transaction.trade_in_only ? "Trade-in saja" : "Belum ditentukan")
  );
};

const getAccessoryLabel = (transaction: TradeInTransaction): string => {
  if (!Array.isArray(transaction.accessory_summary) || transaction.accessory_summary.length === 0) {
    return "Tidak ada data";
  }

  return transaction.accessory_summary
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join(", ");
};

const formatAnswerLabel = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatAnswerValue = (value: unknown): string => {
  if (value == null) return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return `${value}`;
  if (typeof value === "string") return value.trim() || "-";

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => formatAnswerValue(item))
      .filter((item) => item !== "-");

    return normalized.length > 0 ? normalized.join(", ") : "-";
  }

  if (typeof value === "object") {
    const normalized = Object.values(value)
      .map((item) => formatAnswerValue(item))
      .filter((item) => item !== "-");

    return normalized.length > 0 ? normalized.join(", ") : "-";
  }

  return String(value);
};

const getAnswerEntries = (transaction: TradeInTransaction) =>
  Object.entries(transaction.answers ?? {}).filter(([, value]) => formatAnswerValue(value) !== "-");

const getTrackingText = (transaction: TradeInTransaction): string =>
  transaction.shipment_tracking_number?.trim() || "Belum ada resi dari pelanggan";

const getCourierText = (transaction: TradeInTransaction): string =>
  transaction.shipment_courier?.trim() || "Kurir belum diinput, cek dari resi saat tracking";

const zoomLabel = (value: number): string => `${value.toFixed(1)}x`;

export default function TradeInTransactionManagement() {
  const [transactions, setTransactions] = useState<TradeInTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | TradeInTransactionStatus>("all");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [detailTarget, setDetailTarget] = useState<TradeInTransaction | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const result = await tradeInTransactionApi.getAll({
          search: deferredSearch.trim() || undefined,
          status,
          page,
          perPage: 10,
        });

        if (cancelled) return;

        startTransition(() => {
          setTransactions(result.data);
          setPagination(result.pagination);
        });
      } catch (error) {
        if (cancelled) return;

        setNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Gagal memuat transaksi trade-in.",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, page, reloadKey, status]);

  useEffect(() => {
    setSelectedPhotoIndex(0);
    setPhotoZoom(1);
  }, [detailTarget?.id]);

  const metrics = useMemo(() => {
    return {
      listed: transactions.length,
      waiting: transactions.filter((item) => item.status === "menunggu_review").length,
      approved: transactions.filter((item) => item.status === "disetujui").length,
      photos: transactions.reduce((sum, item) => sum + item.photo_count, 0),
    };
  }, [transactions]);

  const listStart = pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1;
  const listEnd =
    pagination.total === 0 ? 0 : Math.min(pagination.total, listStart + Math.max(transactions.length - 1, 0));
  const selectedPhoto = detailTarget?.photos[selectedPhotoIndex] ?? detailTarget?.photos[0] ?? null;
  const answerEntries = detailTarget ? getAnswerEntries(detailTarget) : [];

  const handleStatusChange = async (transaction: TradeInTransaction, nextStatus: TradeInTransactionStatus) => {
    setUpdatingId(transaction.id);
    setNotice(null);

    try {
      const updated = await tradeInTransactionApi.updateStatus(transaction.id, { status: nextStatus });
      setTransactions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (detailTarget?.id === updated.id) {
        setDetailTarget(updated);
      }
      setNotice({
        tone: "success",
        message: `Status ${updated.transaction_number} diubah ke ${STATUS_LABEL[updated.status]}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Gagal memperbarui status trade-in.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openDetail = (transaction: TradeInTransaction) => {
    setDetailTarget(transaction);
  };

  const updatePhotoZoom = (nextValue: number) => {
    setPhotoZoom(Math.min(3, Math.max(1, Number(nextValue.toFixed(2)))));
  };

  const selectPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoZoom(1);
  };

  const renderPhotoCard = (photo: TradeInTransactionPhoto, index: number, deviceLabel: string) => (
    <button
      key={photo.id}
      type="button"
      onClick={() => selectPhoto(index)}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition",
        selectedPhoto?.id === photo.id
          ? "border-blue-300 bg-blue-50 shadow-[0_10px_22px_rgba(59,130,246,0.12)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {photo.image_url ? (
          <Image
            src={photo.image_url}
            alt={photo.label ?? deviceLabel}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 33vw, 180px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Images className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="space-y-1 px-3 py-3">
        <p className="text-sm font-semibold text-slate-900">{photo.label ?? "Foto perangkat"}</p>
        <p className="text-xs text-slate-500">{photo.slot_id ?? "slot-tidak-diketahui"}</p>
      </div>
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Trade-In</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Daftar pengajuan trade-in dengan detail pesanan yang lebih lengkap.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Admin bisa melihat ringkasan transaksi dari daftar utama, lalu membuka Detail Pesanan untuk cek foto
              trade-in, resi pelanggan, kelengkapan perangkat, dan catatan verifikasi dalam satu panel.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
            <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tampil di halaman</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.listed}</p>
            </article>
            <article className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Menunggu review</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.waiting}</p>
            </article>
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Disetujui</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.approved}</p>
            </article>
            <article className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Foto tersimpan</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.photos}</p>
            </article>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor transaksi, customer, atau device"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "all" | TradeInTransactionStatus)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Muat ulang
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`trade-in-loading-${index}`}
                className="h-64 animate-pulse rounded-[28px] border border-slate-200 bg-white shadow-sm"
              />
            ))
          ) : null}

          {!loading && transactions.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <PackageSearch className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-slate-700">Belum ada transaksi trade-in.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Daftar admin siap dipakai. Detail pesanan akan muncul ketika transaksi baru masuk.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!loading
            ? transactions.map((transaction) => {
                const deviceLabel = getDeviceLabel(transaction) || "Perangkat belum dilabeli";
                const previewImage = transaction.cover_photo_url ?? transaction.photos[0]?.image_url ?? null;

                return (
                  <article
                    key={transaction.id}
                    className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-col gap-5 px-5 py-5">
                      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <p className="break-words text-[1.1rem] font-semibold leading-7 tracking-[-0.02em] text-slate-900">
                              {transaction.transaction_number}
                            </p>
                            <span className="text-sm text-slate-500">{formatDate(transaction.created_at)}</span>
                          </div>
                          <p className="text-sm leading-6 text-slate-600">
                            <span className="font-medium text-slate-800">Target:</span> {getTargetLabel(transaction)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {transaction.trade_in_only ? "Trade-in saja" : "Trade-in + barang baru"}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[auto_minmax(180px,220px)] sm:items-start">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                STATUS_BADGE[transaction.status]
                              )}
                            >
                              {STATUS_LABEL[transaction.status]}
                            </span>
                            {updatingId === transaction.id ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                          </div>

                          <select
                            value={transaction.status}
                            onChange={(event) =>
                              void handleStatusChange(
                                transaction,
                                event.target.value as TradeInTransactionStatus
                              )
                            }
                            disabled={updatingId === transaction.id}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className={`grid grid-cols-1 gap-x-6 gap-y-5 ${tradeInBodyGridClass}`}>
                        <section className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pelanggan</p>
                          <div className="space-y-2 text-sm text-slate-600">
                            <p className="text-base font-semibold text-slate-900">{transaction.customer_name}</p>
                            <p>{transaction.customer_email ?? "Email belum diisi"}</p>
                            <p>{transaction.customer_phone ?? "No. HP belum diisi"}</p>
                            <p>{transaction.customer_city ?? "Kota belum diisi"}</p>
                            <p className="line-clamp-3">{transaction.customer_address ?? "Alamat belum diisi"}</p>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Perangkat</p>
                          <div className="space-y-2 text-sm text-slate-600">
                            <p className="text-base font-semibold leading-7 text-slate-900">{deviceLabel}</p>
                            <p>
                              <span className="font-medium text-slate-800">Produk target:</span> {getTargetLabel(transaction)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-800">Fulfillment:</span>{" "}
                              {FULFILLMENT_LABEL[transaction.fulfillment_method]}
                            </p>
                            <p className="line-clamp-2">
                              <span className="font-medium text-slate-800">Catatan customer:</span>{" "}
                              {transaction.customer_notes ?? "Belum ada catatan"}
                            </p>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Foto & Pengiriman
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                {previewImage ? (
                                  <Image src={previewImage} alt={deviceLabel} fill className="object-cover" sizes="96px" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-slate-400">
                                    <Images className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2 text-sm text-slate-600">
                                <p>{transaction.photo_count} foto tersimpan</p>
                                <p className="line-clamp-2">
                                  <span className="font-medium text-slate-800">Resi:</span> {getTrackingText(transaction)}
                                </p>
                                <p className="line-clamp-2">
                                  <span className="font-medium text-slate-800">Kurir:</span> {getCourierText(transaction)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Nilai & Review</p>
                          <div className="space-y-2 text-sm text-slate-600">
                            <p className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-900">
                              {formatCurrencyIDR(transaction.estimated_amount)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-800">Offer admin:</span>{" "}
                              {formatCurrencyIDR(transaction.offered_amount)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-800">Review:</span> {formatDate(transaction.reviewed_at)}
                            </p>
                            <p>
                              <span className="font-medium text-slate-800">Selesai:</span> {formatDate(transaction.completed_at)}
                            </p>
                          </div>
                        </section>

                        <section className="flex items-center justify-start xl:justify-end">
                          <button
                            type="button"
                            onClick={() => openDetail(transaction)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            title="Lihat Detail Pesanan"
                            aria-label={`Lihat Detail Pesanan ${transaction.transaction_number}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </section>
                      </div>
                    </div>
                  </article>
                );
              })
            : null}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan {listStart}-{listEnd} dari {pagination.total} transaksi.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>
            <span className="px-2 text-sm text-slate-600">
              Halaman {pagination.current_page} / {pagination.last_page}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
              disabled={page >= pagination.last_page || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {detailTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Detail Pesanan</p>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-semibold text-slate-950">{detailTarget.transaction_number}</h2>
                  <span className="text-sm text-slate-500">{formatDate(detailTarget.created_at)}</span>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  {detailTarget.customer_name} / {getDeviceLabel(detailTarget) || "Device belum dilabeli"} / Target{" "}
                  {getTargetLabel(detailTarget)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold",
                    STATUS_BADGE[detailTarget.status]
                  )}
                >
                  {STATUS_LABEL[detailTarget.status]}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {FULFILLMENT_LABEL[detailTarget.fulfillment_method]}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Tutup detail pesanan trade-in"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid max-h-[calc(92vh-104px)] gap-6 overflow-y-auto p-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Foto Produk Trade-In
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">
                        Klik gambar untuk pembesaran, lalu gunakan zoom.
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updatePhotoZoom(photoZoom - 0.25)}
                        disabled={!selectedPhoto || photoZoom <= 1}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Perkecil foto"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <span className="min-w-14 text-center text-sm font-medium text-slate-700">{zoomLabel(photoZoom)}</span>
                      <button
                        type="button"
                        onClick={() => updatePhotoZoom(photoZoom + 0.25)}
                        disabled={!selectedPhoto || photoZoom >= 3}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Perbesar foto"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <button
                      type="button"
                      onClick={() => updatePhotoZoom(photoZoom > 1 ? 1 : 1.75)}
                      disabled={!selectedPhoto}
                      className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white disabled:cursor-not-allowed"
                    >
                      {selectedPhoto?.image_url ? (
                        <Image
                          src={selectedPhoto.image_url}
                          alt={selectedPhoto.label ?? "Foto trade-in"}
                          fill
                          sizes="(max-width: 1280px) 100vw, 900px"
                          className={cn(
                            "object-contain p-5 transition-transform duration-300 ease-out",
                            photoZoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
                          )}
                          style={{ transform: `scale(${photoZoom})` }}
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
                          <Images className="h-9 w-9" />
                          <p className="text-sm text-slate-500">Belum ada foto untuk ditampilkan.</p>
                        </div>
                      )}
                    </button>

                    {detailTarget.photos.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {detailTarget.photos.map((photo, index) => renderPhotoCard(photo, index, getDeviceLabel(detailTarget)))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        Belum ada foto trade-in yang tersimpan untuk transaksi ini.
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Data Pelanggan</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">{detailTarget.customer_name}</h3>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Email</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.customer_email ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">No. HP</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.customer_phone ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Kota</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.customer_city ?? "-"}</p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Alamat</p>
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                          {detailTarget.customer_address ?? "-"}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                        <Truck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Data Produk Trade-In</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">
                          {getDeviceLabel(detailTarget) || "Perangkat belum dilabeli"}
                        </h3>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Brand</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.device_brand ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Model</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.device_model ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Varian</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.device_variant ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Kondisi</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.physical_condition ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Umur</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.device_age ?? "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Servis</p>
                        <p className="text-sm leading-6 text-slate-700">{detailTarget.service_history ?? "-"}</p>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Kelengkapan</p>
                        <p className="text-sm leading-6 text-slate-700">{getAccessoryLabel(detailTarget)}</p>
                      </div>
                    </div>
                  </section>
                </div>

                {answerEntries.length > 0 ? (
                  <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Jawaban Tambahan</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {answerEntries.map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {formatAnswerLabel(key)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{formatAnswerValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <aside className="space-y-5">
                <section className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ringkasan Pesanan</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Produk Target</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{getTargetLabel(detailTarget)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        SKU varian: {detailTarget.requested_product_variant_sku ?? "Belum ada"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Nilai Trade-In</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                        {formatCurrencyIDR(detailTarget.estimated_amount)}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Offer admin: <span className="font-medium text-slate-800">{formatCurrencyIDR(detailTarget.offered_amount)}</span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Review Internal</p>
                      <div className="mt-2 space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="font-medium text-slate-800">Reviewer:</span>{" "}
                          {detailTarget.reviewer?.name ?? "Belum ada reviewer"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Waktu review:</span> {formatDate(detailTarget.reviewed_at)}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Selesai:</span> {formatDate(detailTarget.completed_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pengiriman Pelanggan</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Metode Fulfillment</p>
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {FULFILLMENT_LABEL[detailTarget.fulfillment_method]}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Resi Pelanggan</p>
                      <p className="mt-2 break-all text-sm font-medium leading-6 text-slate-900">
                        {getTrackingText(detailTarget)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Gunakan nomor resi ini untuk cek pergerakan kurir dan validasi paket masuk.
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Kurir</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{getCourierText(detailTarget)}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catatan</p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Catatan Customer</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                        {detailTarget.customer_notes ?? "Belum ada catatan dari customer."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Catatan Admin</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                        {detailTarget.admin_notes ?? "Belum ada catatan admin."}
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
