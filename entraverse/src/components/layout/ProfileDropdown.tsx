"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  ShoppingBag,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/src/lib/utils";

const panelMotion = {
  hidden: { opacity: 0, scale: 0.96, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 460, damping: 34, mass: 0.72 },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: -6,
    transition: { duration: 0.16, ease: "easeInOut" },
  },
} as const;

type ProfileDropdownItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
};

type ProfileDropdownUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  initials?: string;
  isOnline?: boolean;
};

type ProfileDropdownProps = {
  variant?: "default" | "overlay";
  isLoggedIn: boolean;
  user?: ProfileDropdownUser;
  onLogout?: () => void;
  guestRegisterHref?: string;
  guestLoginHref?: string;
  accountHref?: string;
  addressHref?: string;
  ordersHref?: string;
  wishlistHref?: string;
  adminDashboardHref?: string | null;
  className?: string;
};

const getInitials = (value: string, fallback = "G") => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return fallback;
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

type MenuItemButtonProps = {
  item: ProfileDropdownItem;
  onClose: () => void;
};

function MenuItemButton({ item, onClose }: MenuItemButtonProps) {
  const Icon = item.icon;
  const isDanger = item.tone === "danger";
  const itemClassName = cn(
    "group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left font-sans transition-colors duration-150 focus-visible:outline-none",
    isDanger
      ? "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50"
      : "text-slate-700 hover:bg-purple-50 hover:text-purple-600 focus-visible:bg-purple-50 focus-visible:text-purple-600"
  );

  const iconClassName = cn(
    "h-[18px] w-[18px] shrink-0 transition-colors",
    isDanger ? "text-current" : "text-slate-500 group-hover:text-purple-600 group-focus-visible:text-purple-600"
  );

  const content = (
    <>
      <Icon className={iconClassName} strokeWidth={1.9} />
      <span className="truncate text-sm font-medium">{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={itemClassName} role="menuitem" onClick={onClose}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={itemClassName}
      role="menuitem"
      onClick={() => {
        onClose();
        item.onSelect?.();
      }}
    >
      {content}
    </button>
  );
}

export function ProfileDropdown({
  variant = "default",
  isLoggedIn,
  user,
  onLogout,
  guestRegisterHref = "/auth/register",
  guestLoginHref = "/auth/login",
  accountHref = "/account/profile",
  addressHref = "/account/addresses",
  ordersHref = "/transaksi",
  wishlistHref = "/account/wishlist",
  adminDashboardHref = null,
  className,
}: ProfileDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState<string | null>(null);

  const displayName = isLoggedIn ? user?.name?.trim() || "Godzilla D. White" : "Guest";
  const displayEmail = isLoggedIn ? user?.email?.trim() || "user@example.com" : null;
  const initials = isLoggedIn
    ? user?.initials?.trim() || getInitials(displayName, "U")
    : "G";
  const activeAvatarUrl = user?.avatarUrl ?? null;
  const showAvatarImage = Boolean(activeAvatarUrl && brokenAvatarUrl !== activeAvatarUrl);
  const isOverlay = variant === "overlay";

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const groups = useMemo<ProfileDropdownItem[][]>(() => {
    if (!isLoggedIn) {
      return [];
    }

    return [
      [
        ...(adminDashboardHref
          ? [{ label: "Dashboard Admin", icon: LayoutDashboard, href: adminDashboardHref } satisfies ProfileDropdownItem]
          : []),
        { label: "Akun Saya", icon: User, href: accountHref },
        { label: "Alamat", icon: MapPin, href: addressHref },
      ],
      [
        { label: "Pesanan Saya", icon: ShoppingBag, href: ordersHref },
        { label: "Wishlist", icon: Heart, href: wishlistHref },
      ],
      [
        { label: "Logout", icon: LogOut, onSelect: onLogout, tone: "danger" },
      ],
    ];
  }, [
    accountHref,
    addressHref,
    isLoggedIn,
    onLogout,
    ordersHref,
    wishlistHref,
    adminDashboardHref,
  ]);

  return (
    <div ref={rootRef} className={cn("relative font-sans", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-[background-color,color,border-color,box-shadow] duration-300",
          isOverlay
            ? "border-white/15 bg-white/[0.08] text-white shadow-[0_12px_30px_rgba(15,23,42,0.14)] hover:border-white/30 hover:bg-white/[0.14]"
            : "border-slate-200 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:border-purple-200 hover:text-purple-600"
        )}
        aria-label="Menu profil"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((previous) => !previous)}
      >
        {showAvatarImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeAvatarUrl ?? ""}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
            onError={() => setBrokenAvatarUrl(activeAvatarUrl)}
          />
        ) : (
          <span
            className={cn(
              "inline-flex h-full w-full items-center justify-center rounded-full text-xs font-semibold tracking-wide",
              isOverlay ? "bg-white/[0.18] text-white" : "bg-slate-900 text-white"
            )}
          >
            {initials}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={panelMotion}
            className="absolute right-0 top-[calc(100%+12px)] z-[80] w-[min(92vw,340px)] origin-top-right rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-[0_22px_65px_rgba(15,23,42,0.16)]"
            role="menu"
            aria-label="Menu profil"
          >
            {!isLoggedIn ? (
              <div className="space-y-4 p-1">
                <Link
                  href={guestLoginHref}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>

                <p className="text-center text-sm text-slate-500">
                  Belum ada akun?{" "}
                  <Link
                    href={guestRegisterHref}
                    className="font-semibold uppercase tracking-wide text-slate-800 underline underline-offset-2 transition-colors hover:text-blue-600"
                    onClick={() => setOpen(false)}
                  >
                    register
                  </Link>
                </p>
              </div>
            ) : null}

            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 px-1.5 pb-3 pt-1">
                  <div className="relative shrink-0">
                    {showAvatarImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeAvatarUrl ?? ""}
                        alt={displayName}
                        className="h-12 w-12 rounded-full object-cover"
                        onError={() => setBrokenAvatarUrl(activeAvatarUrl)}
                      />
                    ) : (
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold tracking-wide text-white">
                        {initials}
                      </div>
                    )}

                    {user?.isOnline !== false ? (
                      <span
                        className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"
                        aria-label="Online"
                        title="Online"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">{displayName}</p>
                    <p className="truncate text-sm text-slate-500">{displayEmail}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-200" aria-hidden />
              </>
            ) : null}

            {isLoggedIn ? (
              <div className="pt-2">
                {groups.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}`}>
                    <div className="space-y-1">
                      {group.map((item) => (
                        <MenuItemButton key={item.label} item={item} onClose={() => setOpen(false)} />
                      ))}
                    </div>

                    {groupIndex < groups.length - 1 ? (
                      <div className="my-2 h-px bg-slate-200" aria-hidden />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
