"use client";

import { MapPin } from "lucide-react";
import type { UserAddress } from "@/lib/api/types/user-address.types";

interface AddressCardProps {
  address: UserAddress;
  active: boolean;
  saving?: boolean;
  onSelect: (addressId: string) => void;
  onEdit: (addressId: string) => void;
  onDelete: (addressId: string) => void;
}

const resolveAddressDetail = (address: UserAddress): string => {
  return address.full_address || address.address_detail || address.address_line;
};

export function AddressCard({
  address,
  active,
  saving = false,
  onSelect,
  onEdit,
  onDelete,
}: AddressCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(address.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(address.id);
        }
      }}
      className={`rounded-2xl border bg-white p-4 transition ${
        active
          ? "border-blue-600 shadow-[0_0_0_1px_rgba(37,99,235,0.22)]"
          : "border-slate-200 hover:border-blue-300"
      } ${saving ? "cursor-wait opacity-80" : "cursor-pointer"}`}
      aria-label={`Pilih alamat ${address.recipient_name}`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
          {address.address_label ?? address.label ?? "Alamat"}
        </span>
        {active ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            UTAMA
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">{address.recipient_name}</h3>
      <p className="mt-1 text-sm text-slate-500">{address.recipient_phone ?? address.phone_number ?? "-"}</p>

      <div className="mt-3 flex items-start gap-2 text-sm text-slate-700">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
        <p className="leading-relaxed">{resolveAddressDetail(address)}</p>
      </div>

      {address.location_note ? (
        <p className="mt-2 text-xs italic text-slate-500">{address.location_note}</p>
      ) : null}

      <div className="mt-4 border-t border-slate-200 pt-3">
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(address.id);
          }}
        >
          Edit
        </button>
        <span className="mx-2 text-slate-300">|</span>
        <button
          type="button"
          className="text-sm font-semibold text-rose-600 hover:text-rose-700"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(address.id);
          }}
        >
          Hapus
        </button>
      </div>
    </article>
  );
}


