"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductForm from "@/components/features/products/ProductForm";
import { calculateFinalBeli, DEFAULT_MATRIX_ROW } from "@/lib/utils";
import { useProductForm } from "@/hooks/useProductForm";
import { useProductSubmit } from "@/hooks/useProductSubmit";
import { buildMediaSubmission } from "@/lib/product-media";
import { normalizeDescriptionHtml } from "@/lib/description";
import { sumSharedInventoryStockFromCombinations } from "@/lib/sharedInventory";

export default function CreateProductPage() {
  const [saveMessage, setSaveMessage] = useState("");
  const [payloadPreview, setPayloadPreview] = useState("");
  const router = useRouter();
  const formState = useProductForm();
  const { submitProduct, loading, error } = useProductSubmit();
  const { form, variants, photos, matrixData, combinations } = formState;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveMessage("");
    const mediaSubmission = buildMediaSubmission(photos);

    const variantPricingPayload = combinations.map((combo) => {
      const row = matrixData?.[combo.key] ?? DEFAULT_MATRIX_ROW;
      return {
        sku: `${form.basic.spu || "SKU"}-${combo.key.replaceAll("|", "-").replaceAll(":", "-")}`,
        label: combo.label,
        options: combo.values,
        stock: row.stock,
        purchase_price: row.purchasePrice,
        currency: row.currency,
        exchange_rate: row.exchangeRate,
        exchange_value: row.exchangeValue,
        shipping: row.shipping,
        shipping_cost: row.shippingCost,
        arrival_cost: row.arrivalCost,
        margin_percent: row.marginPercent,
        purchase_price_idr: calculateFinalBeli(row),
        offline_price: row.offlinePrice,
        entraverse_price: row.entraversePrice,
        tokopedia_price: row.tokopediaPrice,
        tokopedia_fee: row.tokopediaFee,
        tiktok_price: row.tiktokPrice,
        tiktok_fee: row.tiktokFee,
        shopee_price: row.shopeePrice,
        shopee_fee: row.shopeeFee,
        sku_seller: row.skuSeller,
        item_weight: row.itemWeight,
        avg_sales_a: row.avgSalesA,
        stockout_date_a: row.stockoutDateA,
        stockout_factor_a: row.stockoutFactorA,
        avg_sales_b: row.avgSalesB,
        stockout_date_b: row.stockoutDateB,
        stockout_factor_b: row.stockoutFactorB,
        avg_daily_final: row.avgDailyFinal,
        start_date: row.startDate || null,
        predicted_initial_stock: row.predictedInitialStock,
        lead_time: row.leadTime,
        reorder_point: row.reorderPoint,
        need_15_days: row.need15Days,
        in_transit_stock: row.inTransitStock,
        next_procurement: row.nextProcurement,
        status: row.procurementStatus,
      };
    });

    const payload = {
      name: form.basic.name,
      category_id: form.basic.categoryId || undefined,
      category: form.basic.category,
      brand: form.basic.brand,
      brand_id: form.basic.brandId || undefined,
      slug: form.basic.slug,
      spu: form.basic.spu,
      barcode: form.basic.barcode,
      product_status: form.basic.status,
      trade_in: form.tradeIn,
      description: normalizeDescriptionHtml(form.description),
      inventory: {
        total_stock: sumSharedInventoryStockFromCombinations(combinations, matrixData),
        weight: form.inventoryPlan.weight,
        dimensions_cm: form.inventoryPlan.length
          ? { length: form.inventoryPlan.length, width: form.inventoryPlan.width, height: form.inventoryPlan.height }
          : { length: 0, width: 0, height: 0 },
        volume_m3: form.inventoryPlan.volume,
        shipping_rates: {
          Laut: Math.max(0, Number(form.inventoryPlan.shippingRates.Laut) || 0),
          Udara: Math.max(0, Number(form.inventoryPlan.shippingRates.Udara) || 0),
          Darat: Math.max(0, Number(form.inventoryPlan.shippingRates.Darat) || 0),
        },
        shipping_sea_rate: Math.max(0, Number(form.inventoryPlan.shippingRates.Laut) || 0),
        shipping_air_rate: Math.max(0, Number(form.inventoryPlan.shippingRates.Udara) || 0),
        shipping_land_rate: Math.max(0, Number(form.inventoryPlan.shippingRates.Darat) || 0),
      },
      variants: variants.map((variant) => ({ name: variant.name, options: variant.options })),
      variant_pricing: variantPricingPayload,
      photos: mediaSubmission.photos,
    };

    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("category", payload.category);
    formData.append("brand", payload.brand);
    formData.append("slug", payload.slug);
    formData.append("spu", payload.spu);
    formData.append("barcode", payload.barcode);
    formData.append("product_status", payload.product_status);
    formData.append("trade_in", payload.trade_in ? "1" : "0");
    formData.append("description", payload.description);
    if (payload.category_id) formData.append("category_id", payload.category_id);
    if (payload.brand_id) formData.append("brand_id", payload.brand_id);
    formData.append("inventory", JSON.stringify(payload.inventory));
    formData.append("variants", JSON.stringify(payload.variants));
    formData.append("variant_pricing", JSON.stringify(payload.variant_pricing));
    formData.append("photos", JSON.stringify(payload.photos));
    mediaSubmission.files.forEach((file) => {
      formData.append("images[]", file);
    });

    setPayloadPreview(
      JSON.stringify(
        {
          ...payload,
          images: mediaSubmission.files.map((file) => file.name),
        },
        null,
        2
      )
    );
    const result = await submitProduct({ payload: formData, mode: "create" });
    if (result.ok) {
      setSaveMessage("Produk berhasil disimpan.");
      router.push("/admin/master-produk");
      return;
    }

    if ("validationErrors" in result) {
      const firstError = Object.values(result.validationErrors)[0]?.[0];
      setSaveMessage(firstError || "Validasi gagal. Periksa kembali data produk.");
      return;
    }

    setSaveMessage(error ?? "Gagal menyimpan produk.");
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Tambah Produk</h1>
            <p className="mt-1 text-sm text-slate-500">Perbarui detail produk dan varian Anda.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/master-produk"
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Batalkan
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>

        <ProductForm formState={formState} />

        {saveMessage && (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              saveMessage.includes("berhasil")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {saveMessage}
          </div>
        )}

        {payloadPreview && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-slate-700">Preview Payload JSON</p>
            <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              {payloadPreview}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
