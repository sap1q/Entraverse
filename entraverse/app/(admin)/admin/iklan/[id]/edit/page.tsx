"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BannerForm } from "@/components/features/banners/BannerForm";
import { bannerApi } from "@/lib/api/banner";
import type { Banner } from "@/lib/api/types/banner.types";

export default function EditBannerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id;
    if (!id || typeof id !== "string") {
      setError("ID banner tidak valid.");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const row = await bannerApi.getById(id);
        if (!row) {
          setError("Banner tidak ditemukan.");
        } else {
          setBanner(row);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Gagal memuat data banner.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params?.id]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Edit Banner</h1>
        <p className="mt-1 text-sm text-slate-500">Perbarui gambar atau metadata banner.</p>
      </header>

      {loading ? (
        <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : banner ? (
        <BannerForm
          mode="edit"
          initialData={banner}
          onSuccess={() => router.push("/admin/iklan")}
          onCancel={() => router.push("/admin/iklan")}
        />
      ) : null}
    </div>
  );
}
