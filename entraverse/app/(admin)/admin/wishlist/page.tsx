import Link from "next/link";
import { Heart } from "lucide-react";

export default function AdminWishlistPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <Heart className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Wishlist Admin</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Wishlist Saya</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Area ini disediakan agar fungsi dropdown admin tetap lengkap. Saat ini wishlist admin belum memiliki data
              khusus.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">Belum ada item wishlist admin</p>
        <p className="mt-2 text-sm text-slate-500">
          Kembali ke storefront atau kelola katalog produk dari panel admin.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Buka Storefront
          </Link>
          <Link
            href="/admin/master-produk"
            className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Kelola Produk
          </Link>
        </div>
      </div>
    </section>
  );
}
