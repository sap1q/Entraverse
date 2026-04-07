"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside className="rounded-3xl border border-white/70 bg-white/90 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      <nav aria-label="Navigasi akun" className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const itemClass = [
            "inline-flex min-w-fit items-center rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 lg:flex lg:w-full",
            isActive
              ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            item.disabled ? "cursor-not-allowed opacity-55" : "",
          ].join(" ");

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
  );
}
