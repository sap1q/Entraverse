"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { CartShortcut } from "@/src/components/layout/CartShortcut";
import { ProfileShortcut } from "@/src/components/layout/ProfileShortcut";
import { ProductMegaDropdown } from "@/src/components/layout/ProductMegaDropdown";
import { StorefrontSearchBar } from "@/src/components/layout/StorefrontSearchBar";

export function Header() {
  const pathname = usePathname();
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isTouchingTradeInHero, setIsTouchingTradeInHero] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTradeInPage = pathname === "/trade-in";
  const useOverlayHeader = isTradeInPage && isTouchingTradeInHero;

  const clearCloseTimer = useCallback(() => {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const openMegaMenu = useCallback(() => {
    clearCloseTimer();
    setIsMegaMenuOpen(true);
  }, [clearCloseTimer]);

  const closeMegaMenu = useCallback(() => {
    clearCloseTimer();
    setIsMegaMenuOpen(false);
  }, [clearCloseTimer]);

  const scheduleCloseMegaMenu = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 160);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!isMegaMenuOpen) return;

    const onClickOutside = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeMegaMenu();
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMegaMenu();
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [closeMegaMenu, isMegaMenuOpen]);

  useEffect(() => {
    if (!isTradeInPage) {
      const frameId = window.requestAnimationFrame(() => {
        setIsTouchingTradeInHero(false);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const updateHeaderState = () => {
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const heroSection = document.getElementById("trade-in-hero");

      if (!heroSection) {
        setIsTouchingTradeInHero(false);
        return;
      }

      const heroBounds = heroSection.getBoundingClientRect();
      setIsTouchingTradeInHero(heroBounds.bottom > headerHeight);
    };

    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    window.addEventListener("resize", updateHeaderState);

    return () => {
      window.removeEventListener("scroll", updateHeaderState);
      window.removeEventListener("resize", updateHeaderState);
    };
  }, [isTradeInPage]);

  const menuButtonClassName = cn(
    "hidden h-10 w-10 items-center justify-center rounded-full transition-all duration-300 lg:inline-flex ml-2 md:ml-3 lg:ml-4",
    useOverlayHeader
      ? "border border-white/15 bg-white/[0.08] text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)] hover:border-white/30 hover:bg-white/[0.16]"
      : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
  );

  const mobileMenuButtonClassName = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ml-1 md:ml-2",
    useOverlayHeader
      ? "border border-white/15 bg-white/[0.08] text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)] hover:border-white/30 hover:bg-white/[0.16]"
      : "border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
  );

  return (
    <header
      ref={headerRef}
      className={cn(
        "top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        isTradeInPage ? "fixed inset-x-0" : "sticky",
        useOverlayHeader
          ? "border-b border-white/10 bg-white/[0.04] text-white shadow-none backdrop-blur-[6px]"
          : "border-b border-slate-200/70 bg-white/80 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md"
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex h-16 items-center justify-between gap-3 md:h-[72px]">
          {/* Logo dengan margin kanan untuk memberi jarak */}
          <Link href="/" className="flex min-w-fit items-center mr-4 md:mr-6 lg:mr-8">
            <Image
              src="/assets/images/hero/e-logo.png"
              alt="Entraverse"
              width={140}
              height={40}
              className="h-7 w-auto md:h-8"
              priority
            />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-2 px-2 lg:flex">
            <button
              type="button"
              onMouseEnter={openMegaMenu}
              onMouseLeave={scheduleCloseMegaMenu}
              onFocus={openMegaMenu}
              onBlur={scheduleCloseMegaMenu}
              onClick={() => {
                clearCloseTimer();
                setIsMegaMenuOpen((previous) => !previous);
              }}
              className={menuButtonClassName}
              aria-expanded={isMegaMenuOpen}
              aria-haspopup="menu"
              aria-label="Buka menu kategori"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>

            <Suspense fallback={null}>
              <StorefrontSearchBar variant={useOverlayHeader ? "overlay" : "default"} />
            </Suspense>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <CartShortcut variant={useOverlayHeader ? "overlay" : "default"} />
            <ProfileShortcut variant={useOverlayHeader ? "overlay" : "default"} />
          </div>
        </div>

        <div className="pb-3 lg:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/products"
              className={mobileMenuButtonClassName}
              aria-label="Buka kategori produk"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </Link>

            <Suspense fallback={null}>
              <StorefrontSearchBar compact variant={useOverlayHeader ? "overlay" : "default"} />
            </Suspense>
          </div>
        </div>
      </div>

      <ProductMegaDropdown
        open={isMegaMenuOpen}
        onMouseEnter={openMegaMenu}
        onMouseLeave={scheduleCloseMegaMenu}
        onClose={closeMegaMenu}
      />
    </header>
  );
}
