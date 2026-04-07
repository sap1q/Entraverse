"use client";

import { useMemo } from "react";
import { useVariantSelection } from "@/hooks/useVariantSelection";
import type { ProductDetail } from "@/types/product.types";
import { OrderSidebar } from "./OrderSidebar";
import { ProductDescription } from "./ProductDescription";
import { ProductHero } from "./ProductHero";
import { ProductReviews } from "./ProductReviews";
import { resolveSelectedProductPrice, resolveSelectedVariantRow, resolveVariantRowIdentity } from "./productPricing";

interface ProductDetailClientProps {
  product: ProductDetail;
}

export const ProductDetailClient = ({ product }: ProductDetailClientProps) => {
  const { selectedVariants, updateVariant } = useVariantSelection(product.variants ?? []);
  const selectedVariantRow = useMemo(
    () => resolveSelectedVariantRow(product, selectedVariants),
    [product, selectedVariants]
  );
  const selectedStock = useMemo(() => {
    const stock = selectedVariantRow?.stock;
    return typeof stock === "number" && Number.isFinite(stock) ? Math.max(0, stock) : Math.max(0, product.stock);
  }, [product.stock, selectedVariantRow]);
  const selectedVariantSku = useMemo(
    () => (selectedVariantRow ? resolveVariantRowIdentity(selectedVariantRow) : null),
    [selectedVariantRow]
  );
  const selectedPrice = useMemo(
    () => resolveSelectedProductPrice(product, selectedVariants, selectedVariantSku),
    [product, selectedVariantSku, selectedVariants]
  );

  return (
    <div className="mt-8 pb-24 lg:pb-0">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <ProductHero
            product={product}
            selectedPrice={selectedPrice}
            selectedVariants={selectedVariants}
            onVariantChange={updateVariant}
          />
        </div>

        <div className="lg:col-span-4 lg:self-start">
          <OrderSidebar
            product={product}
            selectedPrice={selectedPrice}
            selectedVariants={selectedVariants}
            selectedStock={selectedStock}
            selectedVariantSku={selectedVariantSku}
          />
        </div>

        <div className="space-y-6 lg:col-span-12">
          <ProductDescription description={product.description} />
          <ProductReviews productId={product.id} initialSummary={product.reviews_summary} />
        </div>
      </div>
    </div>
  );
};
