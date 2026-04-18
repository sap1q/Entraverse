"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/product.types";
import {
  buildCategoryHref,
  loadProductMenuData,
  warmProductMenuData,
} from "@/src/components/layout/productMenuData";

type MobileProductSidebarProps = {
  open: boolean;
  onClose: () => void;
  overlay?: boolean;
};

const PRIMARY_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Produk", href: "/products" },
  { label: "Trade In", href: "/trade-in" },
  { label: "Garansi", href: "/garansi" },
] as const;

const sidebarVariants = {
  hidden: { x: "-100%", opacity: 0.98 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 34,
      mass: 0.9,
    },
  },
  exit: {
    x: "-100%",
    opacity: 0.98,
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 0.2, 1],
    },
  },
} as const;

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18, ease: "easeInOut" },
  },
} as const;

const contentVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.24, ease: "easeOut" },
  },
} as const;

export function MobileProductSidebar({
  open,
  onClose,
  overlay = false,
}: MobileProductSidebarProps) {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const warmupTimer = window.setTimeout(() => {
      warmProductMenuData();
    }, 180);

    return () => window.clearTimeout(warmupTimer);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const fetchMenuData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { categories: nextCategories } = await loadProductMenuData();
        if (!mounted) return;
        setCategories(nextCategories);
      } catch (fetchError) {
        if (!mounted) return;
        setCategories([]);
        setError("Kategori belum berhasil dimuat.");
        console.error(fetchError);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchMenuData();

    return () => {
      mounted = false;
    };
  }, [open]);

  const visibleCategories = useMemo(() => categories.slice(0, 8), [categories]);

  if (!hasMounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[220] lg:hidden">
          <motion.button
            type="button"
            aria-label="Tutup menu produk"
            className="absolute inset-0 bg-slate-950/48"
            onClick={onClose}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu produk"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative flex h-full w-[min(78vw,320px)] min-w-[272px] max-w-[320px] flex-col bg-white px-7 py-6 text-slate-900 shadow-[0_28px_80px_rgba(15,23,42,0.22)]",
              overlay && "border-r border-slate-100"
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <Link href="/" onClick={onClose} className="flex items-center">
                <Image
                  src="/assets/images/hero/e-logo.png"
                  alt="Entraverse"
                  width={132}
                  height={34}
                  className="h-8 w-auto"
                  priority
                />
              </Link>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup sidebar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <motion.nav
              aria-label="Menu utama"
              className="mt-12 flex flex-col gap-2"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              {PRIMARY_LINKS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center justify-between rounded-2xl px-2 py-2 text-[18px] font-semibold transition",
                        isActive ? "text-blue-600" : "text-slate-700 hover:text-slate-950"
                      )}
                    >
                      <span>{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isActive
                            ? "text-blue-500"
                            : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500"
                        )}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </motion.nav>

            <motion.div
              className="mt-10 min-h-0 flex-1 overflow-y-auto pr-1"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="mb-4 flex items-center justify-between gap-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Kategori Populer
                </p>

                <Link
                  href="/products"
                  onClick={onClose}
                  className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Semua
                </Link>
              </motion.div>

              {loading ? (
                <div className="flex flex-col gap-2.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <motion.div
                      key={`mobile-menu-skeleton-${index}`}
                      variants={itemVariants}
                      className="h-10 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : error ? (
                <motion.div
                  variants={itemVariants}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {error}
                </motion.div>
              ) : (
                <motion.nav
                  aria-label="Kategori produk"
                  className="flex flex-col gap-1.5"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {visibleCategories.map((category) => (
                    <motion.div key={category.id} variants={itemVariants}>
                      <Link
                        href={buildCategoryHref(category.slug)}
                        onClick={onClose}
                        className="group flex items-center justify-between rounded-xl px-2 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <span>{category.name}</span>
                        <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </Link>
                    </motion.div>
                  ))}
                </motion.nav>
              )}

              <motion.div
                variants={itemVariants}
                className="mt-8 rounded-2xl bg-[linear-gradient(135deg,#eef4ff_0%,#f8fbff_100%)] px-4 py-4"
              >
                <p className="text-sm font-semibold text-slate-900">Butuh cepat?</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Buka kategori favorit atau langsung cek Trade In dan Garansi dari menu utama.
                </p>
              </motion.div>
            </motion.div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
