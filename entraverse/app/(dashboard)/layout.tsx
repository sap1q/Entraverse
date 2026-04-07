"use client";

import AuthGuard from "@/components/features/auth/AuthGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}