import Link from "next/link";
import type { StorefrontProduct } from "@/lib/api/types";
import ProductCard from "./ProductCard";

type ProductsSectionProps = {
  products: StorefrontProduct[];
  error?: string | null;
};

export default function ProductsSection({ products, error }: ProductsSectionProps) {
  return (
    <section className="bg-white py-14 md:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-8 max-w-2xl space-y-2 md:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-500">KOLEKSI KAMI</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-[2.15rem]">Produk Kami</h2>
          <p className="text-sm leading-6 text-slate-500 md:text-[15px]">
            Jelajahi koleksi produk kami untuk kebutuhan gaming, smart device, dan aksesoris.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Belum ada produk yang tersedia.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/products"
                className="inline-flex min-w-[17rem] items-center justify-center rounded-xl bg-slate-100 px-8 py-4 text-center text-[1.05rem] font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-800"
              >
                Tampilkan Semua Produk
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
