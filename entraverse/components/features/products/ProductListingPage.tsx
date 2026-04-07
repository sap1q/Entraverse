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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ProductBreadcrumb />

          <div className="mt-5 lg:hidden">
            <FilterSidebar mode="mobile" />
          </div>

          <div className="mt-6 flex gap-6 xl:gap-8">
            <aside className="hidden w-64 flex-shrink-0 lg:block xl:w-72">
              <FilterSidebar mode="desktop" />
            </aside>

            <main className="min-w-0 flex-1">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <ActiveFilters />

                <div className="flex flex-wrap items-center gap-2">
                  <ProductViewToggle />
                  <ProductSort />
                </div>
              </div>

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
