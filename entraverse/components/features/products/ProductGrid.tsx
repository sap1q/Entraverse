"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useProductsContext } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/features/products/ProductCard";
import { ProductGridSkeleton } from "@/components/features/products/ProductGridSkeleton";

const getViewMode = (view: string | null): "grid" | "list" => {
  return view === "list" ? "list" : "grid";
};

export const ProductGrid = () => {
  const searchParams = useSearchParams();
  const { products, loading, loadingMore, hasMore, error, meta, refetch, loadMore } = useProductsContext();
  const view = getViewMode(searchParams.get("view"));
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || !hasMore || error) {
      return;
    }

    const target = loadMoreTriggerRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        void loadMore();
      },
      {
        root: null,
        rootMargin: "400px 0px",
        threshold: 0,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [error, hasMore, loadMore, loading]);

  if (loading) {
    return <ProductGridSkeleton count={8} view={view} />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 text-sm text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Muat ulang
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-800">Produk tidak ditemukan</h3>
        <p className="mt-2 text-sm text-slate-500">
          Coba ubah filter atau kata kunci pencarian untuk melihat produk lainnya.
        </p>
      </div>
    );
  }

  const startItem = products.length > 0 ? 1 : 0;
  const endItem = meta ? Math.min(products.length, meta.total) : products.length;
  const total = meta?.total ?? products.length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Menampilkan <span className="font-semibold text-slate-900">{startItem}</span> -
        <span className="font-semibold text-slate-900"> {endItem}</span> dari{" "}
        <span className="font-semibold text-slate-900">{total}</span> produk
      </p>

      <div
        className={cn(
          "grid gap-3 md:gap-4",
          view === "list" ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        )}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} view={view} />
        ))}

        {loadingMore
          ? Array.from({ length: view === "list" ? 2 : 5 }).map((_, index) => (
              <article
                key={`load-more-skeleton-${index}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-slate-200 bg-white",
                  view === "list" ? "md:flex md:min-h-[220px]" : ""
                )}
              >
                <div className={cn("animate-pulse bg-slate-200", view === "list" ? "md:w-44" : "aspect-square")} />
                <div className="flex-1 space-y-3 p-4">
                  <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
                </div>
              </article>
            ))
          : null}
      </div>

      {loadingMore ? (
        <div className="flex items-center justify-center gap-2 pt-2 text-sm font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat produk lainnya...
        </div>
      ) : null}

      {hasMore ? <div ref={loadMoreTriggerRef} className="h-1 w-full" aria-hidden /> : null}
    </div>
  );
};
