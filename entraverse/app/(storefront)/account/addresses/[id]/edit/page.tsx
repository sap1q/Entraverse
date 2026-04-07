"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { useAddress } from "@/hooks/useAddress";
import type { UserAddressPayload } from "@/lib/api/types/user-address.types";
import { AddressForm } from "../../components/AddressForm";

export default function EditAddressPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const addressId = typeof params?.id === "string" ? params.id : "";
  const { addresses, isLoaded, loading, error, fetchAddresses, updateAddress } = useAddress();
  const [isSyncingLatest, setIsSyncingLatest] = useState(true);
  const isReady = !loading && !isSyncingLatest;

  useEffect(() => {
    let active = true;

    const syncLatestAddress = async () => {
      setIsSyncingLatest(true);
      await fetchAddresses({ force: true });
      if (active) {
        setIsSyncingLatest(false);
      }
    };

    void syncLatestAddress();

    return () => {
      active = false;
    };
  }, [fetchAddresses]);

  const initialAddress = useMemo(
    () => addresses.find((address) => address.id === addressId) ?? null,
    [addressId, addresses]
  );

  const handleSave = async (payload: UserAddressPayload) => {
    if (!addressId) {
      return { success: false, message: "Alamat tidak valid." };
    }

    const result = await updateAddress(addressId, payload);
    if (!result.success) {
      return {
        success: false,
        message: result.message ?? "Gagal memperbarui alamat.",
      };
    }

    router.push("/account/addresses");
    return { success: true };
  };

  return (
    <AccountShell title="Edit Alamat" description="Perbarui detail alamat pengiriman Anda agar checkout tetap akurat.">
      <div className="max-w-4xl">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!isReady ? (
          <div className="h-[420px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ) : null}

        {isLoaded && isReady && !error && !initialAddress ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Alamat tidak ditemukan atau sudah dihapus.
          </div>
        ) : null}

        {isReady && !error && initialAddress ? (
          <AddressForm
            key={initialAddress.id}
            mode="edit"
            initialAddress={initialAddress}
            onSave={handleSave}
            cancelHref="/account/addresses"
          />
        ) : null}
      </div>
    </AccountShell>
  );
}
