"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/src/components/layout/Header";
import { Footer } from "@/src/components/layout/Footer";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const noLayoutRoutes = ["/login", "/register", "/auth/login", "/auth/register", "/admin"];
  const shouldHideLayout = noLayoutRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (shouldHideLayout) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
