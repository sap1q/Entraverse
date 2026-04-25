"use client";

import { Suspense } from "react";
import { ProductsProvider } from "@/hooks/useProducts";
import { ProductGrid } from "@/components/features/products/ProductGrid";
import { ProductGridSkeleton } from "@/components/features/products/ProductGridSkeleton";
import { ProductSort } from "@/components/features/products/ProductSort";
import { ProductBreadcrumb } from "@/components/features/products/ProductBreadcrumb";
import { ProductViewToggle } from "@/components/features/products/ProductViewToggle";
import { ActiveFilters } from "@/components/features/products/ProductFilters/ActiveFilters";
import { FilterSidebar } from "@/components/features/products/ProductFilters/FilterSidebar";

interface ProductListingPageProps {
  forcedCategory?: string;
}

export const ProductListingPage = ({ forcedCategory }: ProductListingPageProps) => {
  return (
    <ProductsProvider forcedCategory={forcedCategory}>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f4f7fc_38%,#ffffff_100%)]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="border-b border-slate-200/80 pb-5">
            <ProductBreadcrumb />

            <div className="mt-5 lg:hidden">
              <FilterSidebar mode="mobile" />
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <ProductViewToggle />
                <ProductSort />
              </div>

              <div className="min-w-0">
                <ActiveFilters />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-6 xl:gap-8">
            <aside className="hidden w-64 flex-shrink-0 lg:block xl:w-72">
              <FilterSidebar mode="desktop" />
            </aside>

            <main className="min-w-0 flex-1">
              <Suspense fallback={<ProductGridSkeleton count={10} />}>
                <ProductGrid />
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </ProductsProvider>
  );
};
