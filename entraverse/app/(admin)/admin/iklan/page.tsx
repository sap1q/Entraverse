"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BannerForm } from "@/components/features/banners/BannerForm";
import { BannerTable } from "@/components/features/banners/BannerTable";
import { bannerApi } from "@/lib/api/banner";
import type { Banner, BannerReorderItem } from "@/lib/api/types/banner.types";
import { useToast } from "@/hooks/useToast";

type BannerFilter = "all" | "active" | "inactive" | "deleted";

export default function IklanPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BannerFilter>("all");
  const { toast, toasts, dismiss } = useToast();

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await bannerApi.getAll({ withTrashed: true });
      setBanners(rows);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Gagal memuat banner.";
      setError(message);
      toast({
        title: "Gagal Memuat Banner",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  const handleReorder = async (payload: BannerReorderItem[]) => {
    try {
      await bannerApi.updateOrder(payload);
      setBanners((current) =>
        [...current].map((row) => {
          const found = payload.find((item) => item.id === row.id);
          return found ? { ...row, order: found.order } : row;
        })
      );
      toast({
        title: "Urutan Diperbarui",
        description: "Posisi banner berhasil disimpan.",
        variant: "success",
      });
    } catch (reorderError) {
      const message = reorderError instanceof Error ? reorderError.message : "Gagal memperbarui urutan.";
      toast({
        title: "Gagal Reorder",
        description: message,
        variant: "destructive",
      });
      throw reorderError;
    }
  };

  const handleDelete = async (banner: Banner) => {
    const ok = window.confirm("Hapus banner ini? Banner masih bisa direstore.");
    if (!ok) return;

    try {
      await bannerApi.delete(banner.id);
      await fetchBanners();
      toast({
        title: "Banner Dihapus",
        description: "Banner dipindahkan ke arsip terhapus.",
        variant: "success",
      });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Gagal menghapus banner.";
      toast({
        title: "Gagal Hapus Banner",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (banner: Banner) => {
    try {
      await bannerApi.restore(banner.id);
      await fetchBanners();
      toast({
        title: "Banner Direstore",
        description: "Banner aktif kembali.",
        variant: "success",
      });
    } catch (restoreError) {
      const message = restoreError instanceof Error ? restoreError.message : "Gagal restore banner.";
      toast({
        title: "Gagal Restore Banner",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleForceDelete = async (banner: Banner) => {
    const ok = window.confirm("Hapus banner secara permanen? File gambar juga akan dihapus.");
    if (!ok) return;

    try {
      await bannerApi.forceDelete(banner.id);
      await fetchBanners();
      toast({
        title: "Banner Dihapus Permanen",
        description: "Data dan file banner sudah dihapus.",
        variant: "success",
      });
    } catch (forceDeleteError) {
      const message = forceDeleteError instanceof Error ? forceDeleteError.message : "Gagal menghapus permanen.";
      toast({
        title: "Gagal Hapus Permanen",
        description: message,
        variant: "destructive",
      });
    }
  };

  const counts = {
    all: banners.length,
    active: banners.filter((row) => !row.deleted_at && row.is_active).length,
    inactive: banners.filter((row) => !row.deleted_at && !row.is_active).length,
    deleted: banners.filter((row) => Boolean(row.deleted_at)).length,
  };

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Iklan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola banner utama untuk halaman toko. Upload gambar tanpa teks agar tampil bersih di slider.
        </p>
      </header>

      <BannerForm
        mode="create"
        onSuccess={() => {
          toast({
            title: "Banner Ditambahkan",
            description: "Banner baru berhasil disimpan.",
            variant: "success",
          });
          void fetchBanners();
        }}
        onError={(message) =>
          toast({
            title: "Gagal Menyimpan Banner",
            description: message,
            variant: "destructive",
          })
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Daftar Banner</h2>
            <p className="text-sm text-slate-500">
              Atur urutan dengan drag/drop atau tombol panah. Banner yang dihapus bisa direstore.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === "all"
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-blue-200 bg-blue-50 text-blue-700"
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === "active"
                ? "border-emerald-500 bg-emerald-600 text-white"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            Aktif ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setFilter("inactive")}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === "inactive"
                ? "border-slate-500 bg-slate-600 text-white"
                : "border-slate-300 bg-slate-100 text-slate-700"
            }`}
          >
            Nonaktif ({counts.inactive})
          </button>
          <button
            type="button"
            onClick={() => setFilter("deleted")}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === "deleted"
                ? "border-rose-500 bg-rose-600 text-white"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            Terhapus ({counts.deleted})
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <BannerTable
          banners={banners}
          loading={loading}
          filter={filter}
          allowReorder={filter === "all"}
          onReorder={handleReorder}
          onDelete={(banner) => {
            void handleDelete(banner);
          }}
          onRestore={(banner) => {
            void handleRestore(banner);
          }}
          onForceDelete={(banner) => {
            void handleForceDelete(banner);
          }}
          onEdit={(banner) => router.push(`/admin/iklan/${banner.id}/edit`)}
        />
      </section>
    </div>

      <div className="fixed right-4 top-4 z-[9999] flex w-[300px] flex-col gap-2">
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
