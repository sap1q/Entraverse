"use client";

import type { DragEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ImagePlus,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
} from "lucide-react";
import { brandApi } from "@/lib/api/brand";
import { useToast } from "@/hooks/useToast";
import type { Brand } from "@/types/brand.types";

type BrandFormState = {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  logoFile: File | null;
  logoPreview: string | null;
  remove_logo: boolean;
};

const INITIAL_FORM: BrandFormState = {
  name: "",
  slug: "",
  description: "",
  is_active: true,
  logoFile: null,
  logoPreview: null,
  remove_logo: false,
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
};

const revokeBlobUrl = (url: string | null) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

export default function BrandManagementPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<BrandFormState>(INITIAL_FORM);
  const [slugLocked, setSlugLocked] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const { toast, toasts, dismiss } = useToast();

  const fetchBrands = useCallback(
    async (keyword = "") => {
      setLoading(true);
      try {
        const response = await brandApi.getAll({
          page: 1,
          perPage: 100,
          includeInactive: true,
          search: keyword || undefined,
        });
        setBrands(response.data);
      } catch (error) {
        toast({
          title: "Gagal Memuat Brand",
          description: getErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    return () => {
      revokeBlobUrl(form.logoPreview);
    };
  }, [form.logoPreview]);

  const resetForm = () => {
    revokeBlobUrl(form.logoPreview);
    setForm(INITIAL_FORM);
    setSlugLocked(true);
    setEditingId(null);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugLocked ? slugify(value) : prev.slug,
    }));
  };

  const handleLockToggle = () => {
    setSlugLocked((prev) => {
      const next = !prev;
      if (next) {
        setForm((current) => ({ ...current, slug: slugify(current.name) }));
      }
      return next;
    });
  };

  const applyLogoFile = (file: File | null) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => {
      revokeBlobUrl(prev.logoPreview);
      return {
        ...prev,
        logoFile: file,
        logoPreview: previewUrl,
        remove_logo: false,
      };
    });
  };

  const onDropLogo = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    applyLogoFile(file);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast({
        title: "Nama Wajib Diisi",
        description: "Silakan isi nama brand terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug.trim() || slugify(form.name)).trim(),
        description: form.description.trim(),
        is_active: form.is_active,
        logo: form.logoFile,
        remove_logo: form.remove_logo,
      };

      if (editingId) {
        await brandApi.update(editingId, payload);
      } else {
        await brandApi.create(payload);
      }

      toast({
        title: editingId ? "Brand Berhasil Diperbarui" : "Brand Berhasil Ditambahkan",
        description: "Perubahan data brand berhasil disimpan.",
        variant: "success",
      });

      resetForm();
      await fetchBrands(search);
    } catch (error) {
      toast({
        title: "Gagal Menyimpan Brand",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onDeleteBrand = async (brand: Brand) => {
    const confirmed = window.confirm(`Hapus brand "${brand.name}"?`);
    if (!confirmed) return;

    setDeletingId(brand.id);
    try {
      await brandApi.delete(brand.id);
      toast({
        title: "Brand Dihapus",
        description: `${brand.name} berhasil dihapus.`,
        variant: "success",
      });

      if (editingId === brand.id) {
        resetForm();
      }
      await fetchBrands(search);
    } catch (error) {
      toast({
        title: "Gagal Menghapus Brand",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const onEditBrand = (brand: Brand) => {
    revokeBlobUrl(form.logoPreview);
    setEditingId(brand.id);
    setSlugLocked(false);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? "",
      is_active: brand.is_active,
      logoFile: null,
      logoPreview: brand.logo_url ?? brand.logo,
      remove_logo: false,
    });
  };

  const onToggleStatus = async (brand: Brand) => {
    setStatusLoadingId(brand.id);
    try {
      const updated = await brandApi.update(brand.id, { is_active: !brand.is_active });
      setBrands((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast({
        title: "Status Brand Diperbarui",
        description: `${updated.name} sekarang ${updated.is_active ? "aktif" : "nonaktif"}.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Gagal Ubah Status",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setStatusLoadingId(null);
    }
  };

  const logoPreview = useMemo(() => form.logoPreview ?? null, [form.logoPreview]);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manajemen Brand</h1>
              <p className="mt-1 text-sm text-slate-500">
                Kelola identitas brand untuk katalog produk dan storefront.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari brand..."
                  className="bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                type="button"
                onClick={() => void fetchBrands(search)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_1.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Brand" : "Tambah Brand Baru"}
              </h2>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal Edit
                </button>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Nama Brand
                </label>
                <input
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                  placeholder=""
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Slug
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                    readOnly={slugLocked}
                    className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition ${
                      slugLocked
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-200 bg-slate-50 text-slate-700 focus:border-blue-300 focus:bg-white"
                    }`}
                    placeholder=""
                  />
                  <button
                    type="button"
                    onClick={handleLockToggle}
                    className="inline-flex h-11 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    title={slugLocked ? "Unlock slug" : "Lock slug"}
                  >
                    {slugLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {slugLocked ? "Locked" : "Unlocked"}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
                  placeholder="Deskripsi singkat brand..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Logo Brand
                </label>
                <label
                  htmlFor="brand-logo-input"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onDropLogo}
                  className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
                >
                  {logoPreview ? (
                    <div className="space-y-2">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={120}
                        height={120}
                        unoptimized
                        className="mx-auto h-24 w-24 rounded-xl border border-slate-200 bg-white object-contain p-2"
                      />
                      <p className="text-xs text-slate-500">Klik atau drop gambar lain untuk mengganti logo.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImagePlus className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600">Drop logo di sini atau klik untuk upload</p>
                      <p className="text-xs text-slate-400">Format: PNG/JPG/SVG/WebP, maksimal 2MB</p>
                    </div>
                  )}
                </label>
                <input
                  id="brand-logo-input"
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  className="hidden"
                  onChange={(event) => applyLogoFile(event.target.files?.[0] ?? null)}
                />
                {logoPreview ? (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => {
                        revokeBlobUrl(prev.logoPreview);
                        return {
                          ...prev,
                          logoFile: null,
                          logoPreview: null,
                          remove_logo: true,
                        };
                      })
                    }
                    className="mt-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Hapus logo
                  </button>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Status Aktif</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    form.is_active ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      form.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Menyimpan..." : editingId ? "Update Brand" : "Simpan Brand"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Daftar Brand</h2>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : brands.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Belum ada brand yang tersedia.
              </div>
            ) : (
              <div className="space-y-3">
                {brands.map((brand) => (
                  <article
                    key={brand.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {brand.logo_url || brand.logo ? (
                        <Image
                          src={brand.logo_url ?? (brand.logo as string)}
                          alt={brand.name}
                          width={48}
                          height={48}
                          unoptimized
                          className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                          <ImagePlus className="h-4 w-4" />
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-slate-900">{brand.name}</p>
                        <p className="text-xs text-slate-500">{brand.slug}</p>
                        <p className="mt-1 text-xs text-slate-400">{brand.product_count} produk</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          brand.is_active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {brand.is_active ? "Aktif" : "Nonaktif"}
                      </span>

                      <button
                        type="button"
                        onClick={() => void onToggleStatus(brand)}
                        disabled={statusLoadingId === brand.id}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {statusLoadingId === brand.id ? "..." : "Toggle Status"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditBrand(brand)}
                        className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void onDeleteBrand(brand)}
                        disabled={deletingId === brand.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === brand.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="fixed right-4 top-4 z-[9999] flex w-[320px] flex-col gap-2">
        {toasts.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dismiss(item.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm shadow-sm ${
              item.variant === "destructive"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : item.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            <p className="font-semibold">{item.title}</p>
            {item.description ? <p>{item.description}</p> : null}
          </button>
        ))}
      </div>
    </>
  );
}

