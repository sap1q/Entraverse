"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountNavItem = {
  label: string;
  href?: string;
  match: (pathname: string) => boolean;
  disabled?: boolean;
};

const navItems: AccountNavItem[] = [
  {
    label: "Biodata",
    href: "/account/profile",
    match: (pathname) => pathname === "/account/profile",
  },
  {
    label: "Wishlist",
    href: "/account/wishlist",
    match: (pathname) => pathname === "/account/wishlist",
  },
  {
    label: "Alamat",
    href: "/account/addresses",
    match: (pathname) => pathname.startsWith("/account/addresses"),
  },
  {
    label: "Transaksi",
    href: "/transaksi",
    match: (pathname) => pathname === "/transaksi",
  },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const activeItem = useMemo(
    () => navItems.find((item) => item.match(pathname)),
    [pathname]
  );

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileOpen]);

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-expanded={isMobileOpen}
          aria-controls="account-mobile-sidebar"
          className="flex w-full items-center justify-between rounded-[22px] border border-white/70 bg-white/90 px-4 py-3.5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur transition hover:border-blue-100 hover:bg-white"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Menu className="h-4.5 w-4.5" />
            </span>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Menu Akun
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {activeItem?.label ?? "Navigasi akun"}
              </p>
            </div>
          </div>

          <span className="text-sm font-medium text-blue-600">Lihat</span>
        </button>
      </div>

      <aside className="hidden rounded-3xl border border-white/70 bg-white/90 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur lg:block">
        <nav aria-label="Navigasi akun" className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.match(pathname);
            const itemClass = cn(
              "flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
              isActive
                ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              item.disabled && "cursor-not-allowed opacity-55"
            );

            if (item.disabled || !item.href) {
              return (
                <span
                  key={item.label}
                  aria-disabled="true"
                  className={itemClass}
                >
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={itemClass}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu akun"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
            onClick={() => setIsMobileOpen(false)}
          />

          <aside
            id="account-mobile-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label="Menu akun"
            className="relative flex h-full w-[min(82vw,320px)] flex-col rounded-r-[28px] border-r border-white/70 bg-white px-5 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Menu Akun
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Pilih halaman
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Tutup sidebar akun"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav aria-label="Navigasi akun mobile" className="mt-6 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.match(pathname);
                const itemClass = cn(
                  "flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  item.disabled && "cursor-not-allowed opacity-55"
                );

                if (item.disabled || !item.href) {
                  return (
                    <span
                      key={item.label}
                      aria-disabled="true"
                      className={itemClass}
                    >
                      {item.label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={itemClass}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
