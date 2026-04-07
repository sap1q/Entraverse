"use client";

import Image from "next/image";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import {
  warrantyApi,
  type WarrantyPayload,
  type WarrantyProductOption,
  type WarrantyRecord,
} from "@/lib/api/warranty";

type NoticeState = {
  tone: "success" | "error";
  message: string;
};

type FormState = {
  customer_name: string;
  phone: string;
  address: string;
  invoice_number: string;
  serial_number: string;
  start_date: string;
  end_date: string;
  product_id: string;
};

const initialFormState: FormState = {
  customer_name: "",
  phone: "",
  address: "",
  invoice_number: "",
  serial_number: "",
  start_date: "",
  end_date: "",
  product_id: "",
};

const formatDate = (value: string | null): string => {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const statusBadgeClass: Record<WarrantyRecord["status"], string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-rose-200 bg-rose-50 text-rose-700",
  upcoming: "border-amber-200 bg-amber-50 text-amber-700",
  inactive: "border-slate-200 bg-slate-100 text-slate-700",
};

const statusLabel: Record<WarrantyRecord["status"], string> = {
  active: "Aktif",
  expired: "Expired",
  upcoming: "Akan Aktif",
  inactive: "Tidak Aktif",
};

const toPayload = (form: FormState): WarrantyPayload => ({
  customer_name: form.customer_name.trim(),
  phone: form.phone.trim() || undefined,
  address: form.address.trim() || undefined,
  invoice_number: form.invoice_number.trim(),
  serial_number: form.serial_number.trim(),
  start_date: form.start_date,
  end_date: form.end_date,
  product_id: form.product_id.trim(),
});

const mapWarrantyToForm = (item: WarrantyRecord): FormState => ({
  customer_name: item.customer_name,
  phone: item.phone ?? "",
  address: item.address ?? "",
  invoice_number: item.invoice_number,
  serial_number: item.serial_number,
  start_date: item.start_date ?? "",
  end_date: item.end_date ?? "",
  product_id: item.product_id,
});

export default function WarrantyManagement() {
  const [items, setItems] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarrantyRecord | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<WarrantyProductOption[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const deferredProductSearch = useDeferredValue(productSearch);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const result = await warrantyApi.getAdminList({
          search: deferredSearch.trim() || undefined,
          page,
          perPage: 10,
        });

        if (cancelled) return;

        startTransition(() => {
          setItems(result.data);
          setPagination(result.pagination);
        });
      } catch (error) {
        if (cancelled) return;
        setNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Gagal memuat data garansi.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, page, reloadKey]);

  useEffect(() => {
    if (!modalOpen) return;

    let cancelled = false;

    const loadProducts = async () => {
      setProductSearchLoading(true);

      try {
        const result = await warrantyApi.searchProducts(deferredProductSearch.trim() || "");
        if (cancelled) return;
        setProductOptions(result);
      } catch {
        if (!cancelled) setProductOptions([]);
      } finally {
        if (!cancelled) setProductSearchLoading(false);
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [deferredProductSearch, modalOpen]);

  const metrics = useMemo(
    () => ({
      total: pagination.total,
      active: items.filter((item) => item.status === "active").length,
      expired: items.filter((item) => item.status === "expired").length,
      upcoming: items.filter((item) => item.status === "upcoming").length,
    }),
    [items, pagination.total]
  );

  const selectedProduct = useMemo(() => {
    const fromOptions = productOptions.find((option) => option.id === form.product_id);
    if (fromOptions) return fromOptions;

    const fromItems = items
      .map((item) => item.product)
      .find((product): product is NonNullable<WarrantyRecord["product"]> => Boolean(product && product.id === form.product_id));

    if (!fromItems) return null;

    return {
      id: fromItems.id,
      name: fromItems.name,
      spu: fromItems.spu,
      main_image: fromItems.main_image,
    } satisfies WarrantyProductOption;
  }, [form.product_id, items, productOptions]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(initialFormState);
    setProductSearch("");
    setNotice(null);
    setModalOpen(true);
  };

  const openEditModal = (item: WarrantyRecord) => {
    setEditingItem(item);
    setForm(mapWarrantyToForm(item));
    setProductSearch(item.product?.name ?? item.product_id);
    setNotice(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setForm(initialFormState);
    setProductSearch("");
    setProductSearchOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      const payload = toPayload(form);
      const saved = editingItem
        ? await warrantyApi.update(editingItem.id, payload)
        : await warrantyApi.create(payload);

      setNotice({
        tone: "success",
        message: editingItem
          ? `Garansi ${saved.invoice_number} berhasil diperbarui.`
          : `Garansi ${saved.invoice_number} berhasil ditambahkan.`,
      });
      closeModal();
      setReloadKey((current) => current + 1);
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Gagal menyimpan data garansi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: WarrantyRecord) => {
    const confirmed = window.confirm(`Hapus data garansi untuk invoice ${item.invoice_number}?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setNotice(null);

    try {
      await warrantyApi.remove(item.id);
      setNotice({
        tone: "success",
        message: `Garansi ${item.invoice_number} berhasil dihapus.`,
      });
      setReloadKey((current) => current + 1);
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Gagal menghapus data garansi.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const listStart = pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1;
  const listEnd = pagination.total === 0 ? 0 : Math.min(pagination.total, listStart + Math.max(items.length - 1, 0));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Garansi Produk</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Kelola data garansi berdasarkan invoice dan serial number.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Data garansi disimpan terpisah, tetapi gambar produk selalu mengikuti data produk terbaru karena admin dan storefront membaca relasi produk yang sama.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Muat ulang
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Tambah garansi
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total data</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.total}</p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Aktif</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.active}</p>
          </article>
          <article className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Expired</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.expired}</p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Akan aktif</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{metrics.upcoming}</p>
          </article>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari customer, invoice, serial number, atau produk"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`warranty-loading-${index}`}
                className="h-48 animate-pulse rounded-[28px] border border-slate-200 bg-white shadow-sm"
              />
            ))
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <PackageSearch className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-slate-700">Belum ada data garansi.</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tambahkan data dari admin agar halaman cek garansi di storefront bisa dipakai customer.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!loading
            ? items.map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-1 gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)] lg:grid-cols-[110px_minmax(0,1fr)_auto]"
                >
                  <div className="relative h-[110px] w-[110px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                    {item.product?.main_image ? (
                      <Image
                        src={item.product.main_image}
                        alt={item.product?.name ?? "Produk"}
                        fill
                        className="object-cover"
                        sizes="110px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-300">
                        <Shield className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass[item.status]}`}
                      >
                        {statusLabel[item.status]}
                      </span>
                      <span className="text-sm text-slate-500">{item.invoice_number}</span>
                    </div>

                    <div>
                      <p className="text-xl font-semibold text-slate-950">{item.product?.name ?? "Produk tidak ditemukan"}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Product ID: {item.product_id}
                        {item.product?.spu ? ` / SPU: ${item.product.spu}` : ""}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                      <p><span className="font-medium text-slate-800">Customer:</span> {item.customer_name}</p>
                      <p><span className="font-medium text-slate-800">Phone:</span> {item.phone ?? "-"}</p>
                      <p><span className="font-medium text-slate-800">Serial:</span> {item.serial_number}</p>
                      <p><span className="font-medium text-slate-800">Mulai:</span> {formatDate(item.start_date)}</p>
                      <p className="md:col-span-2"><span className="font-medium text-slate-800">Alamat:</span> {item.address ?? "-"}</p>
                      <p><span className="font-medium text-slate-800">Berakhir:</span> {formatDate(item.end_date)}</p>
                    </div>
                  </div>

                  <div className="flex flex-row gap-2 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Hapus
                    </button>
                  </div>
                </article>
              ))
            : null}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            Menampilkan {listStart}-{listEnd} dari {pagination.total} data.
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

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[20px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  {editingItem ? "Edit Garansi" : "Tambah Garansi"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {editingItem ? editingItem.invoice_number : "Data garansi baru"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Tutup form garansi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.15fr)_320px]">
              <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Customer Name</span>
                  <input
                    value={form.customer_name}
                    onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">No Invoice</span>
                  <input
                    value={form.invoice_number}
                    onChange={(event) => setForm((current) => ({ ...current, invoice_number: event.target.value.toUpperCase() }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm uppercase text-slate-700 outline-none transition focus:border-blue-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Serial Number</span>
                  <input
                    value={form.serial_number}
                    onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value.toUpperCase() }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm uppercase text-slate-700 outline-none transition focus:border-blue-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Start Date</span>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">End Date</span>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                    required
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Product ID</span>
                  <input
                    value={form.product_id}
                    onChange={(event) => setForm((current) => ({ ...current, product_id: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                    placeholder="Pilih dari pencarian produk di panel kanan"
                    required
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
                  <textarea
                    value={form.address}
                    onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                  />
                </label>
              </div>

              <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="relative">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cari Produk</p>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      value={productSearch}
                      onChange={(event) => {
                        setProductSearch(event.target.value);
                        setProductSearchOpen(true);
                      }}
                      onFocus={() => setProductSearchOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setProductSearchOpen(false), 120);
                      }}
                      placeholder="Cari nama produk atau SPU"
                      className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  {productSearchOpen && (productSearchLoading || productOptions.length > 0 || deferredProductSearch.trim()) ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      {productSearchLoading ? (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mencari produk...
                        </div>
                      ) : null}

                      {!productSearchLoading && productOptions.length === 0 ? (
                        <div className="rounded-lg px-3 py-2 text-sm text-slate-500">
                          Produk tidak ditemukan untuk keyword ini.
                        </div>
                      ) : null}

                      {!productSearchLoading
                        ? productOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onMouseDown={() => {
                                setForm((current) => ({ ...current, product_id: option.id }));
                                setProductSearch(option.name);
                                setProductSearchOpen(false);
                              }}
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                                form.product_id === option.id
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                {option.main_image ? (
                                  <Image src={option.main_image} alt={option.name} fill className="object-cover" sizes="40px" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-slate-300">
                                    <Shield className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{option.name}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {option.spu ? `${option.spu} / ` : ""}
                                  {option.id}
                                </p>
                              </div>
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Produk terpilih</p>
                  {selectedProduct ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {selectedProduct.main_image ? (
                          <Image
                            src={selectedProduct.main_image}
                            alt={selectedProduct.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <Shield className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{selectedProduct.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {selectedProduct.spu ? `${selectedProduct.spu} / ` : ""}
                          {selectedProduct.id}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">Belum ada produk dipilih.</p>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editingItem ? "Simpan perubahan" : "Tambah garansi"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Batal
                  </button>
                </div>
              </aside>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
