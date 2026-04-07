"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Link as LinkIcon, Type } from "lucide-react";
import { bannerApi } from "@/lib/api/banner";
import type { Banner, BannerFormData } from "@/lib/api/types/banner.types";
import { Button } from "@/components/ui/Button";

type BannerFormProps = {
  mode?: "create" | "edit";
  initialData?: Banner | null;
  onSuccess?: (banner: Banner) => void;
  onError?: (message: string) => void;
  onCancel?: () => void;
};

const emptyForm: Required<Pick<BannerFormData, "title" | "alt_text" | "link_url" | "is_active">> = {
  title: "",
  alt_text: "",
  link_url: "",
  is_active: true,
};

export function BannerForm({
  mode = "create",
  initialData = null,
  onSuccess,
  onError,
  onCancel,
}: BannerFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      setForm(emptyForm);
      setImage(null);
      return;
    }

    setForm({
      title: initialData.title ?? "",
      alt_text: initialData.alt_text ?? "",
      link_url: initialData.link_url ?? "",
      is_active: initialData.is_active,
    });
    setImage(null);
  }, [initialData]);

  const previewUrl = useMemo(() => {
    if (image) return URL.createObjectURL(image);
    if (initialData?.image_url) return initialData.image_url;
    return null;
  }, [image, initialData?.image_url]);

  useEffect(() => {
    if (!previewUrl || !image) return;

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, image]);

  const updateField = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onImageChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0] ?? null;
    setImage(file);
  };

  const submit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: BannerFormData = {
        title: form.title || undefined,
        alt_text: form.alt_text || undefined,
        link_url: form.link_url || undefined,
        is_active: form.is_active,
        image,
      };

      const banner =
        mode === "edit" && initialData
          ? await bannerApi.update(initialData.id, payload)
          : await bannerApi.create(payload);

      if (mode === "create") {
        setForm(emptyForm);
        setImage(null);
      }

      onSuccess?.(banner);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Gagal menyimpan banner.";
      setError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        {mode === "edit" ? "Edit Banner" : "Tambah Banner Baru"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Unggah gambar promosi untuk ditampilkan di halaman utama Entraverse.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Judul (opsional)</label>
          <div className="relative">
            <Type className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              type="text"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500"
              placeholder="Promo Ramadan Entraverse"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Gambar Banner</label>
          <div className="relative">
            <ImagePlus className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="block w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Semua gambar banner diperbolehkan. Untuk hasil terbaik di storefront, gunakan gambar horizontal dengan rasio mendekati 2:1.
          </p>
        </div>

        {previewUrl ? (
          <div className="aspect-[2/1] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview banner" className="h-full w-full object-contain" />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Deskripsi Alt (opsional)</label>
          <input
            value={form.alt_text}
            onChange={(event) => updateField("alt_text", event.target.value)}
            type="text"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
            placeholder="Contoh: Promo kacamata terbaru"
          />
          <p className="mt-1 text-xs text-slate-500">
            Deskripsi singkat untuk aksesibilitas. Tidak ditampilkan di tampilan publik.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Link Tujuan (opsional)</label>
          <div className="relative">
            <LinkIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={form.link_url}
              onChange={(event) => updateField("link_url", event.target.value)}
              type="url"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500"
              placeholder="https://entraverse.com/promo"
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => updateField("is_active", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Aktifkan banner ini
        </label>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" loading={submitting}>
            {mode === "edit" ? "Simpan Perubahan" : "Simpan Banner"}
          </Button>
          {mode === "edit" ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
