import type { StorefrontProduct } from "@/lib/api/types";
import BestSellingProductsCarousel from "./BestSellingProductsCarousel";

type BestSellingProductsProps = {
  products: StorefrontProduct[];
  error?: string | null;
};

export default function BestSellingProducts({ products, error }: BestSellingProductsProps) {
  return (
    <section className="bg-white py-14 md:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-8 max-w-2xl space-y-2 md:mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-500">LARIS MANIS</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950 md:text-[2.15rem]">
            Produk Terlaris
          </h2>
          <p className="text-sm leading-6 text-slate-500 md:text-[15px]">
            Rekomendasi berdasarkan performa penjualan dan stok keluar.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Belum ada produk best selling.
          </div>
        ) : (
          <BestSellingProductsCarousel products={products} />
        )}
      </div>
    </section>
  );
}
