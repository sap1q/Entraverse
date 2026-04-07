"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InventoryPlan,
  MatrixPricing,
  ProductFormState,
  VariantCombination,
  VariantDefinition,
} from "@/types/product";
import { createInitialProductForm, DEFAULT_MATRIX_ROW } from "@/lib/utils";
import {
  buildSharedInventoryKeyFromVariantKey,
  createSharedInventoryStockMap,
  normalizeSharedInventoryMatrix,
  syncSharedInventoryStockForKey,
} from "@/lib/sharedInventory";
import { useVariantCalculations } from "@/hooks/useVariantCalculations";
import {
  PRODUCT_MEDIA_MAX_FILE_SIZE_BYTES,
  PRODUCT_MEDIA_MAX_PHOTOS,
  isInvalidPhotoValue,
} from "@/lib/product-media";

const WARRANTY_VARIANT_NAME = "Garansi";
const DEFAULT_WARRANTY_OPTIONS = ["Tanpa Garansi", "Toko - 1 Tahun"];

const buildVariantCombinations = (variants: VariantDefinition[]): VariantCombination[] => {
  const normalized = variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options.map((option) => option.trim()).filter(Boolean),
    }))
    .filter((variant) => variant.name.length > 0 && variant.options.length > 0);

  if (normalized.length === 0) {
    return [{ key: "default", label: "Default", values: {} }];
  }

  let combinations: Array<Record<string, string>> = [{}];
  normalized.forEach((variant) => {
    const next: Array<Record<string, string>> = [];
    combinations.forEach((current) => {
      variant.options.forEach((option) => {
        next.push({ ...current, [variant.name]: option });
      });
    });
    combinations = next;
  });

  return combinations.map((values) => {
    const entries = Object.entries(values);
    return {
      key: entries.map(([name, option]) => `${name}:${option}`).join("|"),
      label: entries.map(([name, option]) => `${name}: ${option}`).join(" / "),
      values,
    };
  });
};

const syncMatrixWithVariants = (
  variants: VariantDefinition[],
  prevMatrix: Record<string, MatrixPricing>,
  defaultItemWeight = 0
): Record<string, MatrixPricing> => {
  const normalizedPrevMatrix = normalizeSharedInventoryMatrix(prevMatrix);
  const sharedStockMap = createSharedInventoryStockMap(normalizedPrevMatrix);
  const nextMatrix: Record<string, MatrixPricing> = {};
  buildVariantCombinations(variants).forEach((combo) => {
    const existingRow = normalizedPrevMatrix[combo.key];
    const sharedStock = sharedStockMap.get(buildSharedInventoryKeyFromVariantKey(combo.key));
    nextMatrix[combo.key] = {
      ...DEFAULT_MATRIX_ROW,
      ...(existingRow ?? {}),
      stock:
        existingRow && Number.isFinite(Number(existingRow.stock))
          ? Math.max(0, Number(existingRow.stock))
          : Math.max(0, Number(sharedStock) || 0),
      itemWeight:
        existingRow && Number.isFinite(Number(existingRow.itemWeight))
          ? Number(existingRow.itemWeight)
          : Math.max(0, Number(defaultItemWeight) || 0),
    };
  });
  return nextMatrix;
};

const normalizeWarrantyOptions = (options: string[]): string[] =>
  Array.from(new Set([...DEFAULT_WARRANTY_OPTIONS, ...options.map((option) => option.trim()).filter(Boolean)]));

const ensureWarrantyVariant = (variants: VariantDefinition[], options: string[]): VariantDefinition[] => {
  const normalizedOptions = normalizeWarrantyOptions(options);
  const next = [...variants];
  const warrantyIndex = next.findIndex(
    (variant) => variant.name.trim().toLowerCase() === WARRANTY_VARIANT_NAME.toLowerCase()
  );

  if (warrantyIndex < 0) {
    next.unshift({
      id: crypto.randomUUID(),
      name: WARRANTY_VARIANT_NAME,
      options: normalizedOptions,
      draftOption: "",
    });
    return next;
  }

  const current = next[warrantyIndex];
  const mergedOptions = Array.from(new Set([...normalizedOptions, ...current.options.map((option) => option.trim()).filter(Boolean)]));
  next[warrantyIndex] = {
    ...current,
    name: WARRANTY_VARIANT_NAME,
    options: mergedOptions,
  };

  return next;
};

const createInitialState = (): ProductFormState => {
  const initial = createInitialProductForm();
  const normalizedPhotos = Array.from({ length: PRODUCT_MEDIA_MAX_PHOTOS }, (_, index) => {
    return initial.photos[index] ?? { file: null, preview: "" };
  });
  return {
    ...initial,
    photos: normalizedPhotos,
    matrix: syncMatrixWithVariants(initial.variants, initial.matrix, initial.inventoryPlan.weight),
  };
};

const isValidPhotoPreview = (value: string): boolean => {
  const normalized = value.trim();
  return normalized.length > 0 && !isInvalidPhotoValue(normalized);
};

const normalizePhotoSlots = (slots: ProductFormState["photos"]): ProductFormState["photos"] => {
  const compact = slots.filter((slot) => isValidPhotoPreview(slot.preview)).slice(0, PRODUCT_MEDIA_MAX_PHOTOS);
  while (compact.length < PRODUCT_MEDIA_MAX_PHOTOS) {
    compact.push({ file: null, preview: "" });
  }
  return compact;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function useProductForm() {
  const [form, setForm] = useState<ProductFormState>(createInitialState);
  const [imageErrors, setImageErrors] = useState<string[]>(
    Array.from({ length: PRODUCT_MEDIA_MAX_PHOTOS }, () => "")
  );

  const variants = form.variants;
  const photos = form.photos;
  const logistics = form.inventoryPlan;
  const matrixData = form.matrix;
  const tradeIn = form.tradeIn;
  const { calculateVariant } = useVariantCalculations();

  const combinations = useMemo(() => buildVariantCombinations(variants), [variants]);

  useEffect(
    () => () => photos.forEach((slot) => slot.preview.startsWith("blob:") && URL.revokeObjectURL(slot.preview)),
    [photos]
  );

  const handleUpdateBasicInfo = <K extends keyof ProductFormState["basic"]>(
    field: K,
    value: ProductFormState["basic"][K]
  ) =>
    setForm((prev) => {
      if (field === "name") {
        const nextName = String(value);
        return {
          ...prev,
          basic: {
            ...prev.basic,
            name: nextName,
            slug: toSlug(nextName),
          },
        };
      }

      if (field === "spu") {
        return {
          ...prev,
          basic: {
            ...prev.basic,
            spu: String(value).replace(/\s+/g, "").toUpperCase(),
          },
        };
      }

      return { ...prev, basic: { ...prev.basic, [field]: value } };
    });

  const updateLogistics = (
    field: Exclude<keyof InventoryPlan, "volume" | "shippingRates">,
    value: number
  ) =>
    setForm((prev) => {
      const normalizedValue = Number.isFinite(value) ? value : 0;
      const nextInventoryPlan = {
        ...prev.inventoryPlan,
        [field]: normalizedValue,
      };
      const volumeM3 = (nextInventoryPlan.length * nextInventoryPlan.width * nextInventoryPlan.height) / 1_000_000;
      nextInventoryPlan.volume = Number(volumeM3.toFixed(6));

      return {
        ...prev,
        inventoryPlan: nextInventoryPlan,
        matrix:
          field === "weight"
            ? Object.fromEntries(
                Object.entries(prev.matrix).map(([matrixKey, row]) => [
                  matrixKey,
                  calculateVariant({
                    ...DEFAULT_MATRIX_ROW,
                    ...row,
                    itemWeight: Math.max(0, normalizedValue),
                  }),
                ])
              )
            : prev.matrix,
      };
    });

  const updateShippingRates = useCallback((nextRates: Record<MatrixPricing["shipping"], number>) => {
    setForm((prev) => ({
      ...prev,
      inventoryPlan: {
        ...prev.inventoryPlan,
        shippingRates: {
          ...prev.inventoryPlan.shippingRates,
          Laut: Math.max(0, Number(nextRates.Laut) || 0),
          Udara: Math.max(0, Number(nextRates.Udara) || 0),
          Darat: Math.max(0, Number(nextRates.Darat) || 0),
        },
      },
    }));
  }, []);

  const updateField = useCallback((key: string, field: keyof MatrixPricing, value: number | string) => {
    const safeValue = typeof value === "number" ? Math.max(0, value) : value;
    setForm((prev) => {
      const nextRow = calculateVariant({
        ...DEFAULT_MATRIX_ROW,
        ...(prev.matrix?.[key] ?? {}),
        [field]: typeof safeValue === "number" && !Number.isFinite(safeValue) ? 0 : safeValue,
      });

      const nextMatrix =
        field === "stock"
          ? syncSharedInventoryStockForKey(
              {
                ...prev.matrix,
                [key]: nextRow,
              },
              key,
              Number(nextRow.stock) || 0
            )
          : {
              ...prev.matrix,
              [key]: nextRow,
            };

      return {
        ...prev,
        matrix: nextMatrix,
      };
    });
  }, [calculateVariant]);

  const handleImageChange = (slotIndex: number, file: File | null) => {
    if (slotIndex < 0 || slotIndex >= PRODUCT_MEDIA_MAX_PHOTOS) return;

    if (!file) {
      setForm((prev) => {
        const nextSlots = [...prev.photos];
        const currentPreview = nextSlots[slotIndex]?.preview;
        if (currentPreview?.startsWith("blob:")) URL.revokeObjectURL(currentPreview);
        nextSlots[slotIndex] = { file: null, preview: "" };
        return { ...prev, photos: normalizePhotoSlots(nextSlots) };
      });
      setImageErrors((prev) => {
        const nextErrors = [...prev];
        nextErrors[slotIndex] = "";
        return nextErrors;
      });
      return;
    }

    if (file.size > PRODUCT_MEDIA_MAX_FILE_SIZE_BYTES) {
      setImageErrors((prev) => {
        const nextErrors = [...prev];
        nextErrors[slotIndex] = "Maksimal ukuran file 2MB.";
        return nextErrors;
      });
      return;
    }

    setForm((prev) => {
      const nextSlots = [...prev.photos];
      const currentPreview = nextSlots[slotIndex]?.preview;
      if (currentPreview?.startsWith("blob:")) URL.revokeObjectURL(currentPreview);
      nextSlots[slotIndex] = { file, preview: URL.createObjectURL(file) };
      return { ...prev, photos: nextSlots };
    });
    setImageErrors((prev) => {
      const next = [...prev];
      next[slotIndex] = "";
      return next;
    });
  };

  const handleRemoveImage = (slotIndex: number) => {
    if (slotIndex < 0 || slotIndex >= PRODUCT_MEDIA_MAX_PHOTOS) return;

    setForm((prev) => {
      const nextSlots = [...prev.photos];
      const removedPreview = nextSlots[slotIndex]?.preview;
      if (removedPreview?.startsWith("blob:")) URL.revokeObjectURL(removedPreview);

      for (let index = slotIndex; index < PRODUCT_MEDIA_MAX_PHOTOS - 1; index += 1) {
        nextSlots[index] = nextSlots[index + 1];
      }
      nextSlots[PRODUCT_MEDIA_MAX_PHOTOS - 1] = { file: null, preview: "" };

      return { ...prev, photos: nextSlots };
    });
    setImageErrors((prev) => {
      const nextErrors = [...prev];
      for (let index = slotIndex; index < PRODUCT_MEDIA_MAX_PHOTOS - 1; index += 1) {
        nextErrors[index] = nextErrors[index + 1];
      }
      nextErrors[PRODUCT_MEDIA_MAX_PHOTOS - 1] = "";
      return nextErrors;
    });
  };

  const handleDescriptionChange = (html: string) =>
    setForm((prev) => ({ ...prev, description: html }));
  const toggleTradeIn = () => setForm((prev) => ({ ...prev, tradeIn: !prev.tradeIn }));

  const addVariant = () =>
    setForm((prev) => {
      const nextVariants = [...prev.variants, { id: crypto.randomUUID(), name: "", options: [], draftOption: "" }];
      return {
        ...prev,
        variants: nextVariants,
        matrix: syncMatrixWithVariants(nextVariants, prev.matrix, prev.inventoryPlan.weight),
      };
    });

  const removeVariant = (variantId: string) =>
    setForm((prev) => {
      const nextVariants = prev.variants.filter((variant) => variant.id !== variantId);
      return {
        ...prev,
        variants: nextVariants,
        matrix: syncMatrixWithVariants(nextVariants, prev.matrix, prev.inventoryPlan.weight),
      };
    });

  const updateVariantName = (variantId: string, value: string) =>
    setForm((prev) => {
      const nextVariants = prev.variants.map((variant) =>
        variant.id === variantId ? { ...variant, name: value } : variant
      );
      return {
        ...prev,
        variants: nextVariants,
        matrix: syncMatrixWithVariants(nextVariants, prev.matrix, prev.inventoryPlan.weight),
      };
    });

  const updateDraftOption = (variantId: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === variantId ? { ...variant, draftOption: value } : variant
      ),
    }));

  const addVariantOption = (variantId: string) =>
    setForm((prev) => {
      const nextVariants = prev.variants.map((variant) => {
        if (variant.id !== variantId) return variant;
        const nextValue = variant.draftOption.trim();
        if (!nextValue || variant.options.includes(nextValue)) return variant;
        return { ...variant, options: [...variant.options, nextValue], draftOption: "" };
      });
      return {
        ...prev,
        variants: nextVariants,
        matrix: syncMatrixWithVariants(nextVariants, prev.matrix, prev.inventoryPlan.weight),
      };
    });

  const removeVariantOption = (variantId: string, option: string) =>
    setForm((prev) => {
      const nextVariants = prev.variants.map((variant) =>
        variant.id === variantId ? { ...variant, options: variant.options.filter((entry) => entry !== option) } : variant
      );
      return {
        ...prev,
        variants: nextVariants,
        matrix: syncMatrixWithVariants(nextVariants, prev.matrix, prev.inventoryPlan.weight),
      };
    });

  const buildCombinations = useCallback(
    (nextVariants?: VariantDefinition[]) => buildVariantCombinations(nextVariants ?? variants),
    [variants]
  );

  const syncWarrantyVariantOptions = useCallback((options: string[]) => {
    setForm((prev) => {
      const nextVariants = ensureWarrantyVariant(prev.variants, options);
      const prevSignature = JSON.stringify(prev.variants.map((variant) => ({ name: variant.name, options: variant.options })));
      const nextSignature = JSON.stringify(nextVariants.map((variant) => ({ name: variant.name, options: variant.options })));

      if (prevSignature === nextSignature) {
        return prev;
      }

      return {
        ...prev,
        variants: nextVariants,
        matrix: syncMatrixWithVariants(nextVariants, prev.matrix, prev.inventoryPlan.weight),
      };
    });
  }, []);

  return {
    form,
    setForm,
    variants,
    photos,
    logistics,
    tradeIn,
    imageErrors,
    matrixData,
    combinations,
    generateCombinations: buildCombinations,
    syncWarrantyVariantOptions,
    updateField,
    handleUpdateBasicInfo,
    updateLogistics,
    updateShippingRates,
    handleImageChange,
    handleRemoveImage,
    handleDescriptionChange,
    toggleTradeIn,
    addVariant,
    removeVariant,
    updateVariantName,
    updateDraftOption,
    addVariantOption,
    removeVariantOption,
  };
}

