"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  BadgeCheck,
  Box,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  FolderKanban,
  Home,
  Megaphone,
  Menu,
  LogOut,
  RefreshCcw,
  ReceiptText,
  Search,
  Shield,
  ShoppingCart,
  Store,
  Tag,
  Truck,
} from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { clearPersistedAuth } from "@/lib/axios";
import { getCachedProfileAvatar, getNameInitials } from "@/lib/utils/media";
import { getStoredAdmin, setStoredAdmin } from "@/lib/utils/storage";
import { buildAdminLoginRedirect, getSessionRole, type SessionRole } from "@/src/lib/auth/access";
import { AUTH_STATE_EVENT_NAME } from "@/src/lib/auth/tokens";

type AdminLayoutProps = {
  children: React.ReactNode;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AdminHeaderProfileSnapshot = {
  avatarUrl: string | null;
  email: string | null;
  isLoggedIn: boolean;
  name: string | null;
  role: string | null;
};

const ecommerceItems: MenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: Home },
  { label: "Kategori", href: "/admin/categories", icon: Tag },
  { label: "Brand", href: "/admin/brands", icon: BadgeCheck },
  { label: "Iklan", href: "/admin/iklan", icon: Megaphone },
  { label: "Pembelian", href: "/admin/purchases", icon: ClipboardList },
  { label: "Pengadaan", href: "/admin/procurement", icon: FolderKanban },
  { label: "Laporan", href: "/admin/reports", icon: FileText },
  { label: "Garansi Produk", href: "/admin/warranty", icon: Shield },
];

const vendorItems: MenuItem[] = [
  { label: "Vendor Pengiriman", href: "/admin/vendor-shipping", icon: Truck },
];

const serverAdminHeaderProfileSnapshot: AdminHeaderProfileSnapshot = {
  avatarUrl: null,
  email: null,
  isLoggedIn: false,
  name: null,
  role: null,
};

let cachedAdminHeaderProfileSnapshot = serverAdminHeaderProfileSnapshot;

const getAdminHeaderProfileServerSnapshot = (): AdminHeaderProfileSnapshot =>
  serverAdminHeaderProfileSnapshot;

const getAdminHeaderProfileSnapshot = (): AdminHeaderProfileSnapshot => {
  const storedAdmin = getStoredAdmin();
  const nextSnapshot: AdminHeaderProfileSnapshot = {
    avatarUrl: getCachedProfileAvatar(),
    email: storedAdmin?.email ?? null,
    isLoggedIn: getSessionRole() === "admin",
    name: storedAdmin?.name ?? null,
    role: storedAdmin?.role ?? null,
  };

  if (
    cachedAdminHeaderProfileSnapshot.avatarUrl === nextSnapshot.avatarUrl &&
    cachedAdminHeaderProfileSnapshot.email === nextSnapshot.email &&
    cachedAdminHeaderProfileSnapshot.isLoggedIn === nextSnapshot.isLoggedIn &&
    cachedAdminHeaderProfileSnapshot.name === nextSnapshot.name &&
    cachedAdminHeaderProfileSnapshot.role === nextSnapshot.role
  ) {
    return cachedAdminHeaderProfileSnapshot;
  }

  cachedAdminHeaderProfileSnapshot = nextSnapshot;
  return cachedAdminHeaderProfileSnapshot;
};

const subscribeAdminHeaderProfile = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const notify = () => callback();

  window.addEventListener("storage", notify);
  window.addEventListener("storefront-profile-updated", notify as EventListener);
  window.addEventListener(AUTH_STATE_EVENT_NAME, notify as EventListener);

  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("storefront-profile-updated", notify as EventListener);
    window.removeEventListener(AUTH_STATE_EVENT_NAME, notify as EventListener);
  };
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const headerProfile = useSyncExternalStore(
    subscribeAdminHeaderProfile,
    getAdminHeaderProfileSnapshot,
    getAdminHeaderProfileServerSnapshot
  );

  const [authReady, setAuthReady] = useState(false);
  const [sessionRole, setSessionRole] = useState<SessionRole>("guest");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(
    pathname.startsWith("/admin/products") ||
      pathname.startsWith("/admin/master-produk") ||
      pathname.startsWith("/admin/marketplace-produk")
  );
  const [salesOpen, setSalesOpen] = useState(
    pathname.startsWith("/admin/sales") ||
      pathname.startsWith("/admin/pemesanan") ||
      pathname.startsWith("/admin/trade-in") ||
      pathname.startsWith("/admin/penawaran") ||
      pathname.startsWith("/admin/penagihan")
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isCheckingAccess = !authReady || sessionRole !== "admin";

  const isProductGroupActive = useMemo(
    () =>
      pathname.startsWith("/admin/products") ||
      pathname.startsWith("/admin/master-produk") ||
      pathname.startsWith("/admin/marketplace-produk"),
    [pathname]
  );

  const isSalesGroupActive = useMemo(
    () =>
      pathname.startsWith("/admin/sales") ||
      pathname.startsWith("/admin/pemesanan") ||
      pathname.startsWith("/admin/trade-in") ||
      pathname.startsWith("/admin/penawaran") ||
      pathname.startsWith("/admin/penagihan"),
    [pathname]
  );

  const submenuTransition = shouldReduceMotion
    ? { duration: 0 }
    : {
        height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
        opacity: { duration: 0.18, ease: "easeOut" as const },
      };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await authApi.logout();
    } catch {
      // Continue logout flow on frontend.
    } finally {
      clearPersistedAuth();
      router.push("/auth/login");
      setIsLoggingOut(false);
    }
  };

  const menuItemClass = (active: boolean): string =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      active
        ? "bg-[#EFF6FF] text-[#2563EB]"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
    }`;
  const menuIconSlotClass = "flex h-5 w-5 shrink-0 items-center justify-center";
  const menuIconClass = "h-4 w-4 shrink-0";

  const closeMobileSidebar = () => setMobileOpen(false);

  useEffect(() => {
    const syncSessionRole = () => {
      setSessionRole(getSessionRole());
      setAuthReady(true);
    };

    syncSessionRole();
    window.addEventListener("storage", syncSessionRole);
    window.addEventListener(AUTH_STATE_EVENT_NAME, syncSessionRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncSessionRole);
      window.removeEventListener(AUTH_STATE_EVENT_NAME, syncSessionRole as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (sessionRole === "admin") {
      return;
    }

    if (sessionRole === "customer") {
      router.replace("/");
      return;
    }

    const redirectTarget = pathname || "/admin/dashboard";
    router.replace(buildAdminLoginRedirect(redirectTarget));
  }, [authReady, pathname, router, sessionRole]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (isProductGroupActive) {
      setProductOpen(true);
    }
  }, [isProductGroupActive]);

  useEffect(() => {
    if (isSalesGroupActive) {
      setSalesOpen(true);
    }
  }, [isSalesGroupActive]);

  useEffect(() => {
    if (!authReady || sessionRole !== "admin") {
      return;
    }

    let isActive = true;

    const syncAdminProfile = async () => {
      try {
        const response = await authApi.getProfile();

        if (!isActive) {
          return;
        }

        setStoredAdmin(response.data);
      } catch {
        // Best effort sync for header profile.
      }
    };

    void syncAdminProfile();

    return () => {
      isActive = false;
    };
  }, [authReady, sessionRole]);

  const displayName = headerProfile.name ?? "Admin";
  const displaySubtitle = headerProfile.email ?? "Admin Panel";
  const displayInitials = getNameInitials(displayName, "A");

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Memeriksa akses admin...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <button
        type="button"
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-100 bg-white text-slate-700 shadow-sm md:hidden"
        onClick={() => setMobileOpen((prev) => !prev)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeMobileSidebar}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-gray-100 bg-white shadow-sm transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#D7E6FF] bg-[#EFF6FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <Image
              src="/assets/images/hero/e-logo.png"
              alt="Entraverse logo"
              fill
              className="object-contain p-1.5"
              sizes="44px"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold leading-tight text-slate-800">Entraverse</p>
            <p className="mt-0.5 text-xs font-medium tracking-[0.08em] text-slate-400">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <section>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              E-COMMERCE
            </p>

            <div className="space-y-1">
              {/* Produk Dropdown */}
              <button
                type="button"
                onClick={() => setProductOpen((prev) => !prev)}
                className={menuItemClass(isProductGroupActive)}
              >
                {isProductGroupActive ? (
                  <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                ) : null}
                <span className={menuIconSlotClass}>
                  <Box className={menuIconClass} />
                </span>
                <span className="flex-1 text-left">Produk</span>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform ${productOpen ? "rotate-90" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {productOpen ? (
                  <motion.div
                    key="product-submenu"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={submenuTransition}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 space-y-1 border-l border-gray-200 pl-4 pt-1">
                      <Link
                        href="/admin/master-produk"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/master-produk"))}
                      >
                        {pathname.startsWith("/admin/master-produk") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <Box className={menuIconClass} />
                        </span>
                        <span>Master Produk</span>
                      </Link>
                      <Link
                        href="/admin/marketplace-produk"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/marketplace-produk"))}
                      >
                        {pathname.startsWith("/admin/marketplace-produk") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <ShoppingCart className={menuIconClass} />
                        </span>
                        <span>Marketplace Produk</span>
                      </Link>
                      <Link
                        href="/admin/products/inventory"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/products/inventory"))}
                      >
                        {pathname.startsWith("/admin/products/inventory") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <Box className={menuIconClass} />
                        </span>
                        <span>Manajemen Stok</span>
                      </Link>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Penjualan Dropdown */}
              <button
                type="button"
                onClick={() => setSalesOpen((prev) => !prev)}
                className={menuItemClass(isSalesGroupActive)}
              >
                {isSalesGroupActive ? (
                  <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                ) : null}
                <span className={menuIconSlotClass}>
                  <ShoppingCart className={menuIconClass} />
                </span>
                <span className="flex-1 text-left">Penjualan</span>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform ${salesOpen ? "rotate-90" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {salesOpen ? (
                  <motion.div
                    key="sales-submenu"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={submenuTransition}
                    className="overflow-hidden"
                  >
                    <div className="ml-5 space-y-1 border-l border-gray-200 pl-4 pt-1">
                      <Link
                        href="/admin/pemesanan"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/pemesanan"))}
                      >
                        {pathname.startsWith("/admin/pemesanan") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <ClipboardList className={menuIconClass} />
                        </span>
                        <span>Pemesanan</span>
                      </Link>
                      <Link
                        href="/admin/trade-in"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/trade-in"))}
                      >
                        {pathname.startsWith("/admin/trade-in") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <RefreshCcw className={menuIconClass} />
                        </span>
                        <span>Trade-In</span>
                      </Link>
                      <Link
                        href="/admin/penawaran"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/penawaran"))}
                      >
                        {pathname.startsWith("/admin/penawaran") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <FileText className={menuIconClass} />
                        </span>
                        <span>Penawaran</span>
                      </Link>
                      <Link
                        href="/admin/penagihan"
                        onClick={closeMobileSidebar}
                        className={menuItemClass(pathname.startsWith("/admin/penagihan"))}
                      >
                        {pathname.startsWith("/admin/penagihan") ? (
                          <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                        ) : null}
                        <span className={menuIconSlotClass}>
                          <ReceiptText className={menuIconClass} />
                        </span>
                        <span>Penagihan</span>
                      </Link>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Other E-commerce menu items */}
              {ecommerceItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileSidebar}
                    className={menuItemClass(active)}
                  >
                    {active ? (
                      <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                    ) : null}
                    <span className={menuIconSlotClass}>
                      <Icon className={menuIconClass} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              VENDOR
            </p>
            <div className="space-y-1">
              {vendorItems.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileSidebar}
                    className={menuItemClass(active)}
                  >
                    {active ? (
                      <span className="absolute left-0 top-[calc(50%-12px)] h-6 w-1 rounded-r bg-[#2563EB]" />
                    ) : null}
                    <span className={menuIconSlotClass}>
                      <Icon className={menuIconClass} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </nav>

        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={menuIconSlotClass}>
              <LogOut className={menuIconClass} />
            </span>
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white">
          <div className="flex h-16 items-center justify-between gap-4 px-4 pl-16 md:px-8 md:pl-8">
            <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
            <div className="hidden w-full max-w-md items-center gap-2 rounded-lg border border-gray-100 bg-slate-50 px-3 py-2 text-slate-500 md:flex">
              <Search className="h-4 w-4" />
              <input
                type="text"
                placeholder="Search here..."
                className="w-full bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button
                type="button"
                className="hidden items-center gap-1 rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs font-medium text-slate-500 md:flex"
              >
                Indonesia
                <ChevronRight className="h-3.5 w-3.5 rotate-90" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-100 text-slate-500"
              >
                <Bell className="h-4 w-4" />
              </button>
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                    {headerProfile.avatarUrl ? (
                      <span
                        aria-label={displayName}
                        className="h-full w-full bg-cover bg-center bg-no-repeat"
                        role="img"
                        style={{ backgroundImage: `url("${headerProfile.avatarUrl}")` }}
                      />
                    ) : (
                      <span>{displayInitials}</span>
                    )}
                  </div>
                  <div className="hidden min-w-0 text-left md:block">
                    <p className="truncate text-xs font-medium text-slate-800">{displayName}</p>
                    <p className="truncate text-[11px] text-slate-500">{displaySubtitle}</p>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence initial={false}>
                  {profileMenuOpen ? (
                    <motion.div
                      key="admin-profile-menu"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
                      }
                      className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg"
                    >
                      <Link
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <Store className="h-4 w-4 text-slate-500" />
                        <span>Storefront</span>
                      </Link>

                      <div className="my-1 border-t border-gray-100" />

                      <button
                        type="button"
                        onClick={async () => {
                          setProfileMenuOpen(false);
                          await handleLogout();
                        }}
                        disabled={isLoggingOut}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] overflow-y-auto bg-[#F8FAFC] px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
