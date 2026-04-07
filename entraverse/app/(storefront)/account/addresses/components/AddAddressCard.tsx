"use client";

import { MapPin } from "lucide-react";

interface AddAddressCardProps {
  disabled?: boolean;
  onClick: () => void;
}

export function AddAddressCard({ disabled = false, onClick }: AddAddressCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[230px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white text-center text-slate-500 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="inline-flex items-center gap-1 text-xl">
        <MapPin className="h-5 w-5 text-rose-500" />
        <span className="font-semibold text-blue-400">+</span>
      </div>
      <p className="mt-2 text-lg font-semibold">Tambah Alamat Baru</p>
    </button>
  );
}
