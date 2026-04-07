import Link from "next/link";
import { Input } from "@/src/components/ui/Input";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-brand-primary" />
          <span className="text-lg font-semibold tracking-tight text-white">
            Entraverse
          </span>
        </Link>
        <div className="hidden w-full max-w-sm md:block">
          <Input placeholder="Search products..." />
        </div>
      </div>
    </header>
  );
}
