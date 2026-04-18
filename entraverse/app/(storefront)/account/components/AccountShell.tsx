import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AccountSidebar } from "./AccountSidebar";

interface AccountShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AccountShell({ title, description, children }: AccountShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#f3f6fb_100%)]">
      <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
          <div className="hidden flex-wrap items-center gap-2 text-sm text-slate-500 sm:flex">
            <Link href="/" className="transition hover:text-blue-600">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span>Akun</span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Lanjut Belanja
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <AccountSidebar />
          </div>

          <section className="rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-8">
            <div className="mb-7 sm:mb-8">
              <h1 className="text-[2rem] font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-none text-sm leading-6 text-slate-500 sm:max-w-2xl sm:text-base">{description}</p>
            </div>

            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
