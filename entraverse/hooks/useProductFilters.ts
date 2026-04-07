"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useProductsContext } from "@/hooks/useProducts";

export const useProductFilters = () => {
  const searchParams = useSearchParams();
  const { updateFilters, clearFilters } = useProductsContext();

  const isFilterActive = useCallback(
    (key: string, value?: string) => {
      if (value) {
        return searchParams.getAll(key).includes(value);
      }
      return searchParams.has(key);
    },
    [searchParams]
  );

  const getFilterValue = useCallback(
    (key: string) => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  const getFilterValues = useCallback(
    (key: string) => {
      return searchParams.getAll(key);
    },
    [searchParams]
  );

  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const currentValues = searchParams.getAll(key);
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      updateFilters({ [key]: nextValues.length > 0 ? nextValues : undefined });
    },
    [searchParams, updateFilters]
  );

  const removeFilterValue = useCallback(
    (key: string, value: string) => {
      const currentValues = searchParams.getAll(key);
      const nextValues = currentValues.filter((item) => item !== value);
      updateFilters({ [key]: nextValues.length > 0 ? nextValues : undefined });
    },
    [searchParams, updateFilters]
  );

  const setRangeFilter = useCallback(
    (key: string, min?: number, max?: number) => {
      updateFilters({
        [`${key}_min`]: min,
        [`${key}_max`]: max,
      });
    },
    [updateFilters]
  );

  return {
    isFilterActive,
    getFilterValue,
    getFilterValues,
    toggleFilter,
    removeFilterValue,
    setRangeFilter,
    updateFilters,
    clearFilters,
  };
};
