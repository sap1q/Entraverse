"use client";

import { useEffect, useMemo } from "react";
import BasicInfo from "@/components/features/products/BasicInfo";
import MediaUpload from "@/components/features/products/MediaUpload";
import DescriptionEditor from "@/components/features/products/DescriptionEditor";
import LogisticsParams from "@/components/features/products/LogisticsParams";
import TradeInToggle from "@/components/features/products/TradeInToggle";
import VariantManager from "@/components/features/products/VariantManager";
import VariantMatrix from "@/components/features/products/VariantMatrix";
import type { useProductForm } from "@/hooks/useProductForm";
import { useCategoryOptions } from "@/hooks/useCategories";
import {
  DEFAULT_WARRANTY_PRICING,
  isWarrantyMetaLabel,
  parseWarrantyProgram,
} from "@/lib/warrantyProgram";

type ProductFormProps = {
  formState: ReturnType<typeof useProductForm>;
};

export default function ProductForm({ formState }: ProductFormProps) {
  const {
    form,
    variants,
    photos,
    imageErrors,
    matrixData,
    combinations,
    syncWarrantyVariantOptions,
    updateField,
    handleUpdateBasicInfo,
    logistics,
    tradeIn,
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
  } = formState;
  const { getCategory } = useCategoryOptions();
  const selectedCategory = useMemo(
    () => (form.basic.categoryId ? getCategory(form.basic.categoryId) ?? null : null),
    [form.basic.categoryId, getCategory]
  );

  const warrantyProgramFromCategory = useMemo(
    () => parseWarrantyProgram(selectedCategory?.program_garansi ?? null),
    [selectedCategory?.program_garansi]
  );
  const warrantyComponentsFromCategory = warrantyProgramFromCategory.components;
  const warrantyPricingFromCategory = warrantyProgramFromCategory.pricing;

  const categoryPricing = useMemo(() => {
    if (!selectedCategory) {
      return {
        marginPercent: 0,
        fees: null,
        currencySurcharge: 50,
        roundToNearest: 100,
        warrantyComponents: [],
        warrantyPricing: {
          cost: { ...DEFAULT_WARRANTY_PRICING.cost },
          profit: { ...DEFAULT_WARRANTY_PRICING.profit },
        },
      };
    }

    return {
      marginPercent: selectedCategory.margin_percent ?? selectedCategory.min_margin ?? 0,
      fees: selectedCategory.fees ?? null,
      currencySurcharge: 50,
      roundToNearest: 100,
      warrantyComponents: warrantyComponentsFromCategory,
      warrantyPricing: warrantyPricingFromCategory,
    };
  }, [selectedCategory, warrantyComponentsFromCategory, warrantyPricingFromCategory]);

  const warrantyOptionsFromCategory = useMemo(() => {
    return warrantyComponentsFromCategory
      .map((item) => item.label)
      .filter((label) => Boolean(label) && !isWarrantyMetaLabel(label));
  }, [warrantyComponentsFromCategory]);

  useEffect(() => {
    syncWarrantyVariantOptions(warrantyOptionsFromCategory);
  }, [syncWarrantyVariantOptions, warrantyOptionsFromCategory]);

  return (
    <div className="space-y-8">
      <BasicInfo basic={form.basic} handleUpdateBasicInfo={handleUpdateBasicInfo} />

      <MediaUpload
        photos={photos}
        imageErrors={imageErrors}
        handleImageChange={handleImageChange}
        handleRemoveImage={handleRemoveImage}
      />

      <DescriptionEditor value={form.description} onChange={handleDescriptionChange} />

      <LogisticsParams logistics={logistics} updateLogistics={updateLogistics} />

      <TradeInToggle tradeIn={tradeIn} toggleTradeIn={toggleTradeIn} />

      <VariantManager
        variants={variants}
        onAddVariant={addVariant}
        onRemoveVariant={removeVariant}
        onUpdateVariantName={updateVariantName}
        onUpdateDraftOption={updateDraftOption}
        onAddVariantOption={addVariantOption}
        onRemoveVariantOption={removeVariantOption}
      />

      <VariantMatrix
        combinations={combinations}
        matrixData={matrixData}
        updateField={updateField}
        inventoryVolumeCbm={logistics.volume}
        shippingRates={logistics.shippingRates}
        onShippingRatesChange={updateShippingRates}
        categoryPricing={categoryPricing}
      />
    </div>
  );
}

