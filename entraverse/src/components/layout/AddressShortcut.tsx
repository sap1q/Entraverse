"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAddress } from "@/hooks/useAddress";
import { cn } from "@/lib/utils";

const panelMotion = {
  hidden: { opacity: 0, scale: 0, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 34, mass: 0.7 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -6,
    transition: { duration: 0.16, ease: "easeInOut" },
  },
} as const;

type AddressShortcutProps = {
  mode?: "icon" | "pill";
  compact?: boolean;
  variant?: "default" | "overlay";
};

const getAddressLabel = (location: string | null): string => {
  if (!location) {
    return "Alamat Anda";
  }

  return `Dikirim ke ${location}`;
};

export function AddressShortcut({
  mode = "icon",
  variant = "default",
}: AddressShortcutProps) {
  const [open, setOpen] = useState(false);
  const {
    addresses,
    selectedAddress,
    selectedAddressId,
    selectedAddressLocation,
    isLoaded,
    loading,
    savingId,
    error,
    fetchAddresses,
    setMainAddress,
  } = useAddress();
  const rootRef = useRef<HTMLDivElement>(null);
  const addressLabel = useMemo(() => getAddressLabel(selectedAddressLocation), [selectedAddressLocation]);

  useEffect(() => {
    if (!open) return;
    if (!isLoaded) {
      void fetchAddresses();
    }
  }, [fetchAddresses, isLoaded, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelectAddress = (addressId: string) => {
    if (addressId === selectedAddressId || savingId) return;
    void setMainAddress(addressId);
  };

  return (
    <div ref={rootRef} className="relative">
      {mode === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-[background-color,color,box-shadow] duration-300",
            variant === "overlay"
              ? "bg-white/[0.14] text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)] hover:bg-white/[0.2]"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          )}
          aria-label="Ubah alamat pengiriman"
          aria-expanded={open}
          aria-haspopup="dialog"
          title={selectedAddress ? `Alamat aktif: ${selectedAddress.label ?? selectedAddress.recipient_name}` : "Pilih alamat pengiriman"}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{addressLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            "rounded-full p-2 transition-[background-color,color,border-color] duration-300",
            variant === "overlay"
              ? "border border-white/12 bg-white/[0.08] text-white hover:bg-white/[0.14]"
              : "text-slate-700 hover:text-blue-600"
          )}
          aria-label="Ubah alamat pengiriman"
          aria-expanded={open}
          aria-haspopup="dialog"
          title={selectedAddress ? `Alamat aktif: ${selectedAddress.label ?? selectedAddress.recipient_name}` : "Pilih alamat pengiriman"}
        >
          <MapPin className="h-5 w-5" strokeWidth={1.5} />
        </button>
      )}

      <AnimatePresence>
        {open ? (
          <motion.div
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-label="Pilih alamat pengiriman"
            className={`absolute top-[calc(100%+10px)] z-[70] w-[calc(100vw-2rem)] max-w-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.2)] ${
              mode === "pill" ? "left-0 origin-top-left" : "right-0 origin-top-right"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Alamat Pengiriman</h3>
              <button
                type="button"
                onClick={() => {
                  void fetchAddresses({ force: true });
                }}
                className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : null}

            {!loading && error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}

            {!loading && !error && addresses.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                Belum ada alamat tersimpan.
                <Link
                  href="/account/addresses/create"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Tambah Alamat
                </Link>
              </div>
            ) : null}

            {!loading && !error && addresses.length > 0 ? (
              <ul className="max-h-[320px] space-y-2 overflow-auto pr-1">
                {addresses.map((address) => {
                  const isSelected = selectedAddressId === address.id;
                  const isSaving = savingId === address.id;

                  return (
                    <li key={address.id}>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void handleSelectAddress(address.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                        } ${isSaving ? "cursor-wait opacity-70" : ""}`}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{address.recipient_name}</p>
                          {address.is_main ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                              Utama
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600">
                          {address.full_address || address.address_line}
                        </p>
                        {address.label ? (
                          <p className="mt-1 text-[11px] font-medium text-slate-500">{address.label}</p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className="mt-3 border-t border-slate-200 pt-3">
              <Link
                href="/account/addresses"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
              >
                Kelola Daftar Alamat
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
