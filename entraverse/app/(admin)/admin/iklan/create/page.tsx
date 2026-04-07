"use client";

import { useRouter } from "next/navigation";
import { BannerForm } from "@/components/features/banners/BannerForm";

export default function CreateBannerPage() {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Tambah Banner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload banner baru dan langsung tampilkan di slider storefront.
        </p>
      </header>

      <BannerForm
        mode="create"
        onSuccess={() => {
          router.push("/admin/iklan");
        }}
      />
    </div>
  );
}
