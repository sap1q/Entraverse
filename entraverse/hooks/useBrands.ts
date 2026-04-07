"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { brandApi } from "@/lib/api/brand";
import type { Brand } from "@/types/brand.types";

let brandOptionsCache: Brand[] | null = null;
let brandOptionsPromise: Promise<Brand[]> | null = null;

export function useBrandOptions() {
  const [brands, setBrands] = useState<Brand[]>(() => brandOptionsCache ?? []);
  const [loading, setLoading] = useState(!brandOptionsCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brandOptionsCache) {
      setBrands(brandOptionsCache);
      setLoading(false);
      return;
    }

    let mounted = true;

    const fetchBrands = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!brandOptionsPromise) {
          brandOptionsPromise = brandApi
            .getAll({ page: 1, perPage: 200, includeInactive: false })
            .then((result) => result.data.filter((brand) => brand.is_active));
        }

        const rows = await brandOptionsPromise;
        brandOptionsCache = rows;
        if (mounted) setBrands(rows);
      } catch {
        brandOptionsPromise = null;
        if (mounted) setError("Gagal memuat brand");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchBrands();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(
    () =>
      brands.map((brand) => ({
        value: brand.id,
        label: brand.name,
        product_count: brand.product_count,
        logo: brand.logo_url ?? brand.logo,
      })),
    [brands]
  );

  const getBrand = useCallback((id: string) => brands.find((brand) => brand.id === id), [brands]);

  return { brands, loading, error, options, getBrand };
}

