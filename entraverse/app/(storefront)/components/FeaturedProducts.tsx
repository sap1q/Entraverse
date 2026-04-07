import Link from "next/link";
import type { StorefrontProduct } from "@/lib/api/types";
import ProductCard from "./ProductCard";

type FeaturedProductsProps = {
  products: StorefrontProduct[];
  error?: string | null;
};

export default function FeaturedProducts({ products, error }: FeaturedProductsProps) {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Featured Products</h2>
          <Link
            href="/products"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Selengkapnya
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {error}
          </div>
        ) : null}

        {products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Belum ada produk featured.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
