"use client";

import { useEffect, useState } from "react";
import { productsApi } from "@/lib/api/products";
import type { ProductDetail } from "@/types/product.types";

export const useProduct = (slug?: string) => {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!slug) {
        if (!active) return;
        setLoading(false);
        setProduct(null);
        setError("Slug produk tidak valid.");
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError(null);
        }

        const data = await productsApi.getProductBySlug(slug);
        if (!active) return;
        setProduct(data);
      } catch (fetchError) {
        if (!active) return;
        console.error(fetchError);
        setProduct(null);
        setError("Gagal memuat detail produk.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [slug]);

  return { product, loading, error };
};
