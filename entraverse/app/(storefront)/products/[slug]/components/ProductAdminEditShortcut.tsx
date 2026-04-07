"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { AUTH_STATE_EVENT_NAME, TokenService } from "@/src/lib/auth/tokens";

interface ProductAdminEditShortcutProps {
  productId: string;
}

type AdminEditSnapshot = {
  canEdit: boolean;
};

const serverSnapshot: AdminEditSnapshot = {
  canEdit: false,
};
let cachedSnapshot: AdminEditSnapshot = serverSnapshot;

const getServerSnapshot = (): AdminEditSnapshot => serverSnapshot;

const getSnapshot = (): AdminEditSnapshot => {
  const profile = TokenService.getUserType() === "admin" ? TokenService.getUserProfile() : null;
  const role = profile?.role ?? null;
  const nextSnapshot: AdminEditSnapshot = {
    canEdit: role === "superadmin" || role === "admin",
  };

  if (cachedSnapshot.canEdit === nextSnapshot.canEdit) {
    return cachedSnapshot;
  }

  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
};

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const notify = () => callback();

  window.addEventListener("storage", notify);
  window.addEventListener(AUTH_STATE_EVENT_NAME, notify as EventListener);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(AUTH_STATE_EVENT_NAME, notify as EventListener);
  };
};

export const ProductAdminEditShortcut = ({ productId }: ProductAdminEditShortcutProps) => {
  const { canEdit } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!canEdit || !productId) {
    return null;
  }

  return (
    <Link
      href={`/admin/master-produk/${encodeURIComponent(productId)}/edit`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      aria-label="Edit produk di Master Produk"
      title="Edit produk di Master Produk"
    >
      <Pencil className="h-5 w-5" />
    </Link>
  );
};
