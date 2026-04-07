"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import ProductForm from "@/components/features/products/ProductForm";
import { useProduct, type ProductDetail } from "@/hooks/useProductAdmin";
import { useProductForm } from "@/hooks/useProductForm";
import { useProductSubmit } from "@/hooks/useProductSubmit";
import { calculateFinalBeli, DEFAULT_MATRIX_ROW, DEFAULT_SHIPPING_RATES } from "@/lib/utils";
import type { MatrixPricing, ProductFormState, ShippingRates, VariantDefinition } from "@/types/product";
import {
  PRODUCT_MEDIA_MAX_PHOTOS,
  buildMediaSubmission,
  isPersistablePhotoPath,
} from "@/lib/product-media";
import { normalizeDescriptionHtml } from "@/lib/description";
import { normalizeSharedInventoryMatrix, sumSharedInventoryStockFromCombinations } from "@/lib/sharedInventory";

type RawMatrixRow = Record<string, unknown>;

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeShippingRate = (value: unknown, fallback: number): number => {
  const parsed = toNumberOrNull(value);
  if (parsed === null) return Math.max(0, fallback);
  return Math.max(0, parsed);
};

const resolveInventoryShippingRates = (inventory: Record<string, unknown>): ShippingRates => {
  const source = inventory.shipping_rates && typeof inventory.shipping_rates === "object"
    ? (inventory.shipping_rates as Record<string, unknown>)
    : {};

  const fallbackLaut = normalizeShippingRate(inventory.shipping_sea_rate, DEFAULT_SHIPPING_RATES.Laut);
  const fallbackUdara = normalizeShippingRate(inventory.shipping_air_rate, DEFAULT_SHIPPING_RATES.Udara);
  const fallbackDarat = normalizeShippingRate(
    inventory.shipping_land_rate ?? inventory.shipping_new,
    DEFAULT_SHIPPING_RATES.Darat
  );

  return {
    Laut: normalizeShippingRate(source.Laut, fallbackLaut),
    Udara: normalizeShippingRate(source.Udara, fallbackUdara),
    Darat: normalizeShippingRate(source.Darat, fallbackDarat),
  };
};

const toText = (value: unknown): string => (typeof value === "string" ? value : "");
const firstDefined = (row: RawMatrixRow, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }

  return undefined;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const DEFAULT_WARRANTY_VARIANT_NAME = "Garansi";
const DEFAULT_WARRANTY_OPTIONS = ["Tanpa Garansi", "Toko - 1 Tahun"];

const ensureWarrantyVariantDefaults = (variants: VariantDefinition[]): VariantDefinition[] => {
  const normalized = variants
    .map((variant) => ({
      ...variant,
      name: variant.name.trim(),
      options: Array.from(new Set(variant.options.map((option) => option.trim()).filter(Boolean))),
    }))
    .filter((variant) => variant.name.length > 0);

  const warrantyIndex = normalized.findIndex(
    (variant) => variant.name.toLowerCase() === DEFAULT_WARRANTY_VARIANT_NAME.toLowerCase()
  );

  if (warrantyIndex >= 0) {
    const warranty = normalized[warrantyIndex];
    const mergedOptions = Array.from(new Set([...DEFAULT_WARRANTY_OPTIONS, ...warranty.options]));
    normalized[warrantyIndex] = {
      ...warranty,
      name: DEFAULT_WARRANTY_VARIANT_NAME,
      options: mergedOptions,
    };
    return normalized;
  }

  return [
    {
      id: crypto.randomUUID(),
      name: DEFAULT_WARRANTY_VARIANT_NAME,
      options: [...DEFAULT_WARRANTY_OPTIONS],
      draftOption: "",
    },
    ...normalized,
  ];
};

const normalizeVariantDefinitions = (product: ProductDetail): VariantDefinition[] => {
  const source = Array.isArray(product.variants) ? product.variants : [];
  const fromVariants = source
    .filter((item): item is { name?: unknown; options?: unknown } => typeof item === "object" && item !== null)
    .map((item) => {
      const name = toText(item.name).trim();
      const options = Array.isArray(item.options)
        ? item.options.map((entry) => toText(entry).trim()).filter(Boolean)
        : [];
      return { id: crypto.randomUUID(), name, options, draftOption: "" };
    })
    .filter((item) => item.name.length > 0 && item.options.length > 0);

  if (fromVariants.length > 0) return ensureWarrantyVariantDefaults(fromVariants);

  const optionMap = new Map<string, Set<string>>();
  const pricingRows = Array.isArray(product.variant_pricing) ? product.variant_pricing : [];
  pricingRows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const options = (row as { options?: unknown }).options;
    if (!options || typeof options !== "object") return;

    Object.entries(options as Record<string, unknown>).forEach(([name, value]) => {
      const cleanName = name.trim();
      const cleanValue = toText(value).trim();
      if (!cleanName || !cleanValue) return;
      if (!optionMap.has(cleanName)) optionMap.set(cleanName, new Set<string>());
      optionMap.get(cleanName)?.add(cleanValue);
    });
  });

  const derived = Array.from(optionMap.entries())
    .map(([name, options]) => ({
      id: crypto.randomUUID(),
      name,
      options: Array.from(options),
      draftOption: "",
    }))
    .filter((variant) => variant.name.length > 0 && variant.options.length > 0);

  return ensureWarrantyVariantDefaults(
    derived.length > 0
      ? derived
      : [{ id: crypto.randomUUID(), name: "Garansi", options: ["Tanpa Garansi"], draftOption: "" }]
  );
};

const buildVariantKey = (options: Record<string, unknown>, variantNames: string[]): string => {
  const entries = variantNames
    .map((name) => [name, toText(options[name]).trim()] as const)
    .filter(([, value]) => value.length > 0);

  if (entries.length > 0) {
    return entries.map(([name, value]) => `${name}:${value}`).join("|");
  }

  const fallback = Object.entries(options)
    .map(([name, value]) => [name.trim(), toText(value).trim()] as const)
    .filter(([name, value]) => name.length > 0 && value.length > 0);

  return fallback.length > 0 ? fallback.map(([name, value]) => `${name}:${value}`).join("|") : "default";
};

const buildVariantCombinationsForPrefill = (variants: VariantDefinition[]) => {
  const normalized = variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options.map((option) => option.trim()).filter(Boolean),
    }))
    .filter((variant) => variant.name.length > 0 && variant.options.length > 0);

  if (normalized.length === 0) return [{ key: "default", label: "Default", values: {} as Record<string, string> }];

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

const mapPricingRow = (row: RawMatrixRow, fallbackWeight = 0): MatrixPricing => ({
  ...DEFAULT_MATRIX_ROW,
  stock: Math.max(0, toNumber(firstDefined(row, ["stock"]))),
  purchasePrice: Math.max(0, toNumber(firstDefined(row, ["purchase_price", "purchasePrice"]))),
  currency: (toText(firstDefined(row, ["currency"])) as MatrixPricing["currency"]) || DEFAULT_MATRIX_ROW.currency,
  exchangeRate: Math.max(0, toNumber(firstDefined(row, ["exchange_rate", "exchangeRate"]))),
  exchangeValue: Math.max(0, toNumber(firstDefined(row, ["exchange_value", "exchangeValue"]))),
  shipping: (toText(firstDefined(row, ["shipping"])) as MatrixPricing["shipping"]) || DEFAULT_MATRIX_ROW.shipping,
  shippingCost: Math.max(0, toNumber(firstDefined(row, ["shipping_cost", "shippingCost"]))),
  arrivalCost: Math.max(0, toNumber(firstDefined(row, ["arrival_cost", "arrivalCost"]))),
  marginPercent: Math.max(0, toNumber(firstDefined(row, ["margin_percent", "marginPercent"]))),
  offlinePrice: Math.max(0, toNumber(firstDefined(row, ["offline_price", "offlinePrice"]))),
  entraversePrice: Math.max(0, toNumber(firstDefined(row, ["entraverse_price", "entraversePrice"]))),
  tokopediaPrice: Math.max(0, toNumber(firstDefined(row, ["tokopedia_price", "tokopediaPrice"]))),
  tokopediaFee: Math.max(0, toNumber(firstDefined(row, ["tokopedia_fee", "tokopediaFee"]))),
  tiktokPrice: Math.max(0, toNumber(firstDefined(row, ["tiktok_price", "tiktokPrice", "tokopedia_price", "tokopediaPrice"]))),
  tiktokFee: Math.max(0, toNumber(firstDefined(row, ["tiktok_fee", "tiktokFee", "tokopedia_fee", "tokopediaFee"]))),
  shopeePrice: Math.max(0, toNumber(firstDefined(row, ["shopee_price", "shopeePrice"]))),
  shopeeFee: Math.max(0, toNumber(firstDefined(row, ["shopee_fee", "shopeeFee"]))),
  skuSeller: toText(firstDefined(row, ["sku_seller", "skuSeller"])),
  itemWeight: Math.max(
    0,
    toNumber(firstDefined(row, ["item_weight", "itemWeight", "weight"])) || Math.max(0, toNumber(fallbackWeight))
  ),
  avgSalesA: Math.max(0, toNumber(firstDefined(row, ["avg_sales_a", "avgSalesA"]))),
  stockoutDateA: toText(firstDefined(row, ["stockout_date_a", "stockoutDateA"])) || DEFAULT_MATRIX_ROW.stockoutDateA,
  stockoutFactorA: toText(firstDefined(row, ["stockout_factor_a", "stockoutFactorA"])) || DEFAULT_MATRIX_ROW.stockoutFactorA,
  avgSalesB: Math.max(0, toNumber(firstDefined(row, ["avg_sales_b", "avgSalesB"]))),
  stockoutDateB: toText(firstDefined(row, ["stockout_date_b", "stockoutDateB"])) || DEFAULT_MATRIX_ROW.stockoutDateB,
  stockoutFactorB: toText(firstDefined(row, ["stockout_factor_b", "stockoutFactorB"])) || DEFAULT_MATRIX_ROW.stockoutFactorB,
  avgDailyFinal: Math.max(0, toNumber(firstDefined(row, ["avg_daily_final", "avgDailyFinal"]))),
  startDate: toText(firstDefined(row, ["start_date", "startDate"])),
  predictedInitialStock: Math.max(0, toNumber(firstDefined(row, ["predicted_initial_stock", "predictedInitialStock"]))),
  leadTime: Math.max(0, toNumber(firstDefined(row, ["lead_time", "leadTime"]))),
  reorderPoint: Math.max(0, toNumber(firstDefined(row, ["reorder_point", "reorderPoint"]))),
  need15Days: Math.max(0, toNumber(firstDefined(row, ["need_15_days", "need15Days"]))),
  inTransitStock: Math.max(0, toNumber(firstDefined(row, ["in_transit_stock", "inTransitStock"]))),
  nextProcurement: Math.max(0, toNumber(firstDefined(row, ["next_procurement", "nextProcurement"]))),
  procurementStatus:
    (toText(firstDefined(row, ["status", "procurementStatus"])) as MatrixPricing["procurementStatus"]) || DEFAULT_MATRIX_ROW.procurementStatus,
});

const buildPrefilledState = (product: ProductDetail): ProductFormState => {
  const variantDefinitions = normalizeVariantDefinitions(product);
  const combinations = buildVariantCombinationsForPrefill(variantDefinitions);
  const combinationByLabel = new Map(combinations.map((combo) => [combo.label.trim().toLowerCase(), combo.key]));
  const variantNames = variantDefinitions.map((variant) => variant.name);
  const rawInventory = product.inventory && typeof product.inventory === "object" ? product.inventory : {};
  const inventoryWeight = Math.max(0, toNumber(rawInventory.weight));
  const pricingRows = Array.isArray(product.variant_pricing) ? product.variant_pricing : [];
  const matrix: Record<string, MatrixPricing> = {};

  pricingRows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    const rowObj = row as RawMatrixRow;
    const options = (rowObj.options ?? {}) as Record<string, unknown>;
    const keyFromOptions = buildVariantKey(options, variantNames);
    const keyFromLabel = combinationByLabel.get(toText(rowObj.label).trim().toLowerCase());
    const key = keyFromOptions !== "default" ? keyFromOptions : (keyFromLabel ?? "default");
    matrix[key] = mapPricingRow(row as RawMatrixRow, inventoryWeight);
  });

  if (Object.keys(matrix).length === 0) {
    matrix.default = { ...DEFAULT_MATRIX_ROW };
  }

  const normalizedMatrix = normalizeSharedInventoryMatrix(matrix);

  const dimensions =
    rawInventory && typeof rawInventory.dimensions_cm === "object" && rawInventory.dimensions_cm !== null
      ? (rawInventory.dimensions_cm as Record<string, unknown>)
      : {};
  const shippingRates = resolveInventoryShippingRates(rawInventory);

  const rawPhotos = Array.isArray(product.photos) ? product.photos : [];
  const photoUrls = rawPhotos
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string") {
        return String((item as { url: string }).url);
      }
      return "";
    })
    .filter((url) => isPersistablePhotoPath(url))
    .filter((url) => url.length > 0)
    .slice(0, PRODUCT_MEDIA_MAX_PHOTOS);

  const photos = Array.from({ length: PRODUCT_MEDIA_MAX_PHOTOS }, (_, index) => ({
    file: null,
    preview: photoUrls[index] ?? "",
  }));

  const status = toText(product.product_status ?? product.status);

  return {
    basic: {
      name: toText(product.name),
      slug: toText(product.slug) || toSlug(toText(product.name)),
      category: toText(product.category),
      categoryId: toText(product.category_id),
      brand: toText(product.brand),
      brandId: toText(product.brand_id),
      spu: toText(product.spu),
      status:
        status === "inactive" || status === "pending_approval"
          ? status
          : ("active" as ProductFormState["basic"]["status"]),
      barcode: toText(product.barcode),
    },
    description: toText(product.description),
    inventoryPlan: {
      weight: Math.max(0, toNumber(rawInventory.weight)),
      length: Math.max(0, toNumber(dimensions.length)),
      width: Math.max(0, toNumber(dimensions.width)),
      height: Math.max(0, toNumber(dimensions.height)),
      volume: Math.max(0, toNumber(rawInventory.volume_m3)),
      shippingRates,
    },
    tradeIn: Boolean(product.trade_in),
    photos,
    variants: variantDefinitions,
    matrix: normalizedMatrix,
  };
};

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = String(params?.id ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const initializedProductIdRef = useRef<string | null>(null);

  const { product, loading, error, notFound } = useProduct(productId);
  const formState = useProductForm();
  const { submitProduct, loading: submitLoading, error: submitError } = useProductSubmit();
  const { form, variants, photos, matrixData, combinations, setForm } = formState;

  useEffect(() => {
    if (!product) return;
    if (initializedProductIdRef.current === productId) return;
    setForm(buildPrefilledState(product));
    initializedProductIdRef.current = productId;
  }, [product, productId, setForm]);

  const canSubmit = useMemo(
    () => Boolean(product) && !loading && !isSaving && !submitLoading,
    [isSaving, loading, product, submitLoading]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId) return;
    setIsSaving(true);
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
        dimensions_cm: {
          length: form.inventoryPlan.length,
          width: form.inventoryPlan.width,
          height: form.inventoryPlan.height,
        },
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

    const result = await submitProduct({ payload: formData, mode: "edit", productId });
    if (result.ok) {
      setSaveMessage("Produk berhasil diperbarui.");
      router.push("/admin/master-produk");
      setIsSaving(false);
      return;
    }

    if ("validationErrors" in result) {
      const firstError = Object.values(result.validationErrors)[0]?.[0];
      setSaveMessage(firstError || "Validasi gagal. Periksa kembali data produk.");
      setIsSaving(false);
      return;
    }

    setSaveMessage(submitError ?? "Terjadi kesalahan saat menyimpan perubahan.");
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-8 w-72 animate-pulse rounded bg-slate-100" />
          <div className="h-[520px] animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!loading && (notFound || error || !product)) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6">
        <h1 className="text-xl font-semibold text-rose-800">Gagal memuat produk</h1>
        <p className="mt-2 text-sm text-rose-700">{error ?? "Produk tidak ditemukan."}</p>
        <div className="mt-4 flex items-center gap-2">
          <Link
            href="/admin/master-produk"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Kembali ke daftar
          </Link>
        </div>
      </div>
    );
  }

  const productSlug = product?.slug?.trim() ?? "";
  const storefrontProductHref = productSlug
    ? `/products/${encodeURIComponent(productSlug)}`
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Edit Produk</h1>
            <p className="mt-1 text-sm text-slate-500">Perbarui detail produk dan varian Anda.</p>
          </div>
          <div className="flex items-center gap-2">
            {storefrontProductHref ? (
              <Link
                href={storefrontProductHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Buka halaman detail produk di storefront"
                title="Buka halaman detail produk di storefront"
              >
                <Eye className="h-4 w-4" />
              </Link>
            ) : null}
            <Link
              href="/admin/master-produk"
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Batalkan
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving || submitLoading ? "Menyimpan..." : "Update Produk"}
            </button>
          </div>
        </div>

        <ProductForm formState={formState} />

        {saveMessage ? (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              saveMessage.includes("berhasil")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {saveMessage}
          </div>
        ) : null}
      </form>
    </div>
  );
}

