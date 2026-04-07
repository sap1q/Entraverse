"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountShell } from "@/app/(storefront)/account/components/AccountShell";
import { useAddress } from "@/hooks/useAddress";
import { AddAddressCard } from "./components/AddAddressCard";
import { AddressCard } from "./components/AddressCard";

const MAX_ADDRESSES = 5;

export default function SavedAddressesPage() {
  const router = useRouter();
  const {
    addresses,
    selectedAddressId,
    loading,
    savingId,
    error,
    fetchAddresses,
    setMainAddress,
    removeAddress,
  } = useAddress();

  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchAddresses();
  }, [fetchAddresses]);

  const handleDelete = async (addressId: string) => {
    const approved = typeof window === "undefined" ? true : window.confirm("Hapus alamat ini?");
    if (!approved) return;

    const result = await removeAddress(addressId);
    if (!result.success) {
      setLocalMessage(result.message ?? "Gagal menghapus alamat.");
    }
  };

  const addressCountText = `${addresses.length} Alamat`;

  return (
    <AccountShell
      title="Alamat"
      description={`Simpan hingga ${MAX_ADDRESSES} alamat pengiriman agar proses checkout lebih cepat.`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm text-slate-500">
          Pilih alamat utama, atur alamat cadangan, dan pastikan detail pengiriman Anda selalu siap dipakai.
        </p>

        <div className="flex items-center gap-4 self-end">
          <p className="text-lg font-semibold text-slate-900">{addressCountText}</p>
          <button
            type="button"
            disabled={addresses.length >= MAX_ADDRESSES}
            onClick={() => {
              router.push("/account/addresses/create");
            }}
            className="inline-flex h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Tambah Alamat Baru
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {localMessage ? (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {localMessage}
        </div>
      ) : null}

      {loading && addresses.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[230px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              active={selectedAddressId === address.id}
              saving={savingId === address.id}
              onSelect={(addressId) => {
                void setMainAddress(addressId);
              }}
              onEdit={(addressId) => {
                router.push(`/account/addresses/${addressId}/edit`);
              }}
              onDelete={(addressId) => {
                void handleDelete(addressId);
              }}
            />
          ))}

          {addresses.length < MAX_ADDRESSES ? (
            <AddAddressCard
              onClick={() => {
                router.push("/account/addresses/create");
              }}
            />
          ) : null}
        </div>
      )}
    </AccountShell>
  );
}
