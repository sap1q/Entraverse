"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { useAddress } from "@/hooks/useAddress";
import type { UserAddressPayload } from "@/lib/api/types/user-address.types";
import { AddressForm } from "../components/AddressForm";

const MAX_ADDRESSES = 5;

export default function CreateAddressPage() {
  const router = useRouter();
  const { addresses, loading, error, fetchAddresses, createAddress } = useAddress();

  useEffect(() => {
    void fetchAddresses();
  }, [fetchAddresses]);

  const handleSave = async (payload: UserAddressPayload) => {
    if (addresses.length >= MAX_ADDRESSES) {
      return {
        success: false,
        message: `Maksimal ${MAX_ADDRESSES} alamat tersimpan.`,
      };
    }

    const result = await createAddress(payload);
    if (!result.success) {
      return {
        success: false,
        message: result.message ?? "Gagal menyimpan alamat.",
      };
    }

    router.push("/account/addresses");
    return { success: true };
  };

  const hasReachedLimit = addresses.length >= MAX_ADDRESSES;

  return (
    <AccountShell
      title="Tambah Alamat"
      description="Simpan alamat baru untuk mempercepat proses checkout dan pengiriman berikutnya."
    >
      <div className="max-w-4xl">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {loading && addresses.length === 0 ? (
          <div className="h-[420px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ) : null}

        {!loading && hasReachedLimit ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            Maksimal {MAX_ADDRESSES} alamat tersimpan sudah tercapai. Hapus salah satu alamat terlebih dulu sebelum
            menambahkan alamat baru.
          </div>
        ) : null}

        {!hasReachedLimit ? (
          <AddressForm mode="create" onSave={handleSave} cancelHref="/account/addresses" />
        ) : null}
      </div>
    </AccountShell>
  );
}
