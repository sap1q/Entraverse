import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getMockProduct,
  listMockActiveBanners,
  listMockBrands,
  listMockCategories,
  listMockProducts,
  listMockProductReviews,
} from "@/lib/mock-store-api";

export type AdminRole = "superadmin" | "admin" | "staff" | "editor";

export type StoredBanner = {
  id: string;
  title: string | null;
  alt_text: string | null;
  image_path: string;
  image_url: string;
  link_url: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StoredBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type FeeComponent = {
  id?: string;
  label: string;
  value: number | string;
  valueType: "percent" | "amount";
  min?: number;
  max?: number;
  notes?: string | null;
};

export type FeeChannel = {
  components: FeeComponent[];
};

export type StoredCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  icon_url: string | null;
  icon_svg: string | null;
  fees: {
    marketplace: FeeChannel;
    shopee: FeeChannel;
    entraverse: FeeChannel;
    tokopedia: FeeChannel;
    tokopedia_tiktok: FeeChannel;
  };
  program_garansi: string | null;
  margin_percent: number;
  min_margin: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
};

export type StoredProductPhoto = {
  url: string;
  is_primary: boolean;
};

export type StoredProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  brand_id: string | null;
  brand_ref: {
    id: string;
    name: string;
    slug: string;
  } | null;
  category: string | null;
  category_id: string | null;
  category_ref: {
    id: string;
    name: string;
    slug: string;
  } | null;
  spu: string | null;
  barcode: string | null;
  description: string;
  product_status: "active" | "inactive" | "draft";
  status: "active" | "inactive" | "draft";
  stock_status: "in_stock" | "out_of_stock" | "preorder" | "low_stock";
  trade_in: boolean;
  is_featured: boolean;
  free_shipping: boolean;
  rating: number;
  sold_count: number;
  image: string;
  main_image: string | null;
  photos: StoredProductPhoto[];
  gallery: string[];
  inventory: Record<string, unknown>;
  variants: Array<{ name: string; options: string[] }>;
  variant_pricing: Array<Record<string, unknown>>;
  specifications: Record<string, string>;
  specs: Record<string, string | number>;
  warranty: string | null;
  weight: number;
  reviews: Array<Record<string, unknown>>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  jurnal_id: string | null;
  jurnal_metadata: Record<string, unknown> | null;
  mekari_status: {
    sync_status: string | null;
  } | null;
};

export type AdminState = {
  version: 1;
  banners: StoredBanner[];
  brands: StoredBrand[];
  categories: StoredCategory[];
  products: StoredProduct[];
};

const STATE_PATH = "admin/state.json";
const LOCAL_STATE_DIR = path.join(process.cwd(), ".data");
const LOCAL_STATE_PATH = path.join(LOCAL_STATE_DIR, "admin-state.json");
const EMPTY_CHANNEL = (): FeeChannel => ({ components: [] });

const nowIso = () => new Date().toISOString();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === "1" || value === "true";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const parseJsonField = <T>(value: FormDataEntryValue | null, fallback: T): T => {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const parseRupiahAmount = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value !== "string") return 0;
  const digits = value.replace(/\D+/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const normalizeValueType = (value: unknown): "percent" | "amount" => {
  if (typeof value !== "string") return "percent";
  const normalized = value.trim().toLowerCase();
  return normalized === "amount" || normalized === "rp" || normalized === "rupiah" ? "amount" : "percent";
};

const hasFeeComponents = (channel: FeeChannel | null | undefined): boolean => {
  const components = channel?.components ?? [];

  return components.some((component) => {
    const label = toString(component.label).trim();
    const valueType = normalizeValueType(component.valueType);
    const value = valueType === "amount" ? parseRupiahAmount(component.value) : Math.max(0, toNumber(component.value, 0));
    const min = parseRupiahAmount(component.min);
    const max = parseRupiahAmount(component.max);

    return label !== "" || value > 0 || min > 0 || max > 0;
  });
};

const resolveFeeSummaryPercent = (channel: FeeChannel | null | undefined): number => {
  if (!channel) return 0;

  const candidates = [
    (channel as FeeChannel & Record<string, unknown>).percent,
    (channel as FeeChannel & Record<string, unknown>).rate,
    (channel as FeeChannel & Record<string, unknown>).percentage,
    (channel as FeeChannel & Record<string, unknown>).total_percent,
    (channel as FeeChannel & Record<string, unknown>).totalPercent,
    (channel as FeeChannel & Record<string, unknown>).summary,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" || typeof candidate === "string") {
      const resolved = Math.max(0, toNumber(candidate, 0));
      if (resolved > 0) return resolved;
    }
  }

  return 0;
};

const pickFeeChannel = (
  fees: StoredCategory["fees"],
  keys: Array<keyof StoredCategory["fees"]>
): FeeChannel => {
  let fallback: FeeChannel | null = null;

  for (const key of keys) {
    const candidate = fees[key];
    if (!candidate) continue;
    fallback ??= candidate;
    if (hasFeeComponents(candidate)) return candidate;
  }

  return fallback ?? EMPTY_CHANNEL();
};

const calculateFeeTotals = (channel: FeeChannel, purchasePriceIdr: number) => {
  const components = channel.components ?? [];
  const safePurchasePrice = Math.max(0, purchasePriceIdr);
  let fixedTotal = 0;
  let percentTotal = 0;

  if (components.length === 0) {
    const summaryPercent = resolveFeeSummaryPercent(channel);

    return {
      fixedTotal: 0,
      percentTotal: summaryPercent / 100,
      percentDisplay: summaryPercent,
    };
  }

  components.forEach((component) => {
    const valueType = normalizeValueType(component.valueType);
    const value = valueType === "amount" ? parseRupiahAmount(component.value) : Math.max(0, toNumber(component.value, 0));
    const minValue = parseRupiahAmount(component.min);
    const maxValue = parseRupiahAmount(component.max);

    if (valueType === "amount") {
      let fee = value;
      if (minValue > 0) fee = Math.max(fee, minValue);
      if (maxValue > 0) fee = Math.min(fee, maxValue);
      fixedTotal += Math.max(0, fee);
      return;
    }

    let effectiveRate = value / 100;

    if (safePurchasePrice > 0) {
      if (maxValue > 0) effectiveRate = Math.min(effectiveRate, maxValue / safePurchasePrice);
      if (minValue > 0) effectiveRate = Math.max(effectiveRate, minValue / safePurchasePrice);
    }

    percentTotal += Math.max(0, effectiveRate);
  });

  return {
    fixedTotal: Math.round(fixedTotal),
    percentTotal,
    percentDisplay: percentTotal * 100,
  };
};

const calculateSellingPrice = (
  purchasePriceIdr: number,
  fixedFeeAmount: number,
  marginRate: number,
  platformFeePercent: number
) => {
  const safePurchasePrice = Math.max(0, purchasePriceIdr);
  const safeFixedFee = Math.max(0, fixedFeeAmount);
  const denominator = 1 - Math.max(0, marginRate) - Math.max(0, platformFeePercent);

  if (denominator <= 0) {
    return safePurchasePrice + safeFixedFee;
  }

  return (safePurchasePrice + safeFixedFee) / denominator;
};

const resolvePriceRoundingBucket = (value: number): [number, number] => {
  const safeValue = Math.max(0, value);

  if (safeValue >= 500_000) return [50_000, 1_000];
  if (safeValue >= 250_000) return [10_000, 1_000];
  if (safeValue >= 100_000) return [5_000, 1_000];
  return [1_000, 100];
};

const applyNearestPriceRounding = (value: number): number => {
  const safeValue = Math.max(0, value);
  const [step, psychologicalCut] = resolvePriceRoundingBucket(safeValue);
  return Math.max(0, Math.round(safeValue / step) * step - psychologicalCut);
};

const applyCeilPriceRounding = (value: number): number => {
  const safeValue = Math.max(0, value);
  const [step, psychologicalCut] = resolvePriceRoundingBucket(safeValue);
  return Math.max(0, Math.ceil(safeValue / step) * step - psychologicalCut);
};

const extractWarrantyOption = (row: Record<string, unknown>): string => {
  const options = asObject(row.options);

  for (const [name, value] of Object.entries(options)) {
    if (name.trim().toLowerCase().includes("garansi")) {
      const normalizedValue = toString(value).trim();
      if (normalizedValue) return normalizedValue;
    }
  }

  const label = toString(row.label).trim();
  if (label) {
    const match = label.match(/garansi:\s*([^/]+)/i);
    if (match?.[1]) return match[1].trim();
  }

  return "";
};

const applyWarrantyMultiplier = (warrantyOption: string, basePrice: number): number => {
  const normalized = warrantyOption.trim().toLowerCase();
  if (!normalized || normalized.includes("tanpa")) return basePrice;
  if (/(^|[^0-9])1\s*tahun/.test(normalized) || normalized.includes("1th") || normalized.includes("1 th")) {
    return basePrice * 1.06;
  }

  return basePrice;
};

const recalculateVariantPricingForCategory = (
  variantPricing: Array<Record<string, unknown>>,
  category: StoredCategory
): Array<Record<string, unknown>> => {
  const marginPercent = Math.max(0, toNumber(category.margin_percent ?? category.min_margin, 0));
  const tokopediaChannel = pickFeeChannel(category.fees, ["tokopedia", "tokopedia_tiktok", "marketplace"]);
  const shopeeChannel = pickFeeChannel(category.fees, ["shopee"]);
  const entraverseChannel = pickFeeChannel(category.fees, ["entraverse"]);

  return variantPricing.map((item) => {
    const row = asObject(item);
    const purchasePrice = Math.max(0, toNumber(row.purchase_price ?? row.purchasePrice, 0));
    const exchangeValue = Math.max(0, toNumber(row.exchange_value ?? row.exchangeValue ?? row.exchange_rate ?? row.exchangeRate, 0));
    const arrivalCost = Math.max(0, toNumber(row.arrival_cost ?? row.arrivalCost, 0));
    const shippingCost = Math.max(0, toNumber(row.shipping_cost ?? row.shippingCost, 0));
    const purchasePriceIdr = Math.round((purchasePrice * exchangeValue) + arrivalCost);
    const warrantyOption = extractWarrantyOption(row);

    const entraverseFee = calculateFeeTotals(entraverseChannel, purchasePriceIdr);
    const tokopediaFee = calculateFeeTotals(tokopediaChannel, purchasePriceIdr);
    const shopeeFee = calculateFeeTotals(shopeeChannel, purchasePriceIdr);

    const offlineBase = calculateSellingPrice(purchasePriceIdr, 0, marginPercent / 100, 0);
    const entraverseBase = calculateSellingPrice(purchasePriceIdr, entraverseFee.fixedTotal, marginPercent / 100, entraverseFee.percentTotal);
    const tokopediaBase = calculateSellingPrice(purchasePriceIdr, tokopediaFee.fixedTotal, marginPercent / 100, tokopediaFee.percentTotal);
    const shopeeBase = calculateSellingPrice(purchasePriceIdr, shopeeFee.fixedTotal, marginPercent / 100, shopeeFee.percentTotal);

    return {
      ...row,
      margin_percent: marginPercent,
      exchange_rate: exchangeValue,
      arrival_cost: Math.round(arrivalCost),
      shipping_cost: Math.round(shippingCost),
      purchase_price_idr: Math.round(purchasePriceIdr),
      offline_price: applyNearestPriceRounding(applyWarrantyMultiplier(warrantyOption, offlineBase)),
      entraverse_price: applyCeilPriceRounding(applyWarrantyMultiplier(warrantyOption, entraverseBase)),
      tokopedia_price: applyNearestPriceRounding(applyWarrantyMultiplier(warrantyOption, tokopediaBase)),
      tiktok_price: applyNearestPriceRounding(applyWarrantyMultiplier(warrantyOption, tokopediaBase)),
      shopee_price: applyNearestPriceRounding(applyWarrantyMultiplier(warrantyOption, shopeeBase)),
      tokopedia_fee: Number(tokopediaFee.percentDisplay.toFixed(4)),
      tiktok_fee: Number(tokopediaFee.percentDisplay.toFixed(4)),
      shopee_fee: Number(shopeeFee.percentDisplay.toFixed(4)),
    };
  });
};

const readStreamAsText = async (stream: ReadableStream<Uint8Array>) =>
  new Response(stream).text();

const normalizePhotoEntry = (entry: unknown): StoredProductPhoto | null => {
  if (typeof entry === "string") {
    return entry.trim() ? { url: entry.trim(), is_primary: false } : null;
  }

  const row = asObject(entry);
  const url = toString(row.url ?? row.image_url ?? row.path).trim();
  if (!url) return null;

  return {
    url,
    is_primary: toBoolean(row.is_primary ?? row.isPrimary ?? row.primary),
  };
};

const normalizePhotos = (photos: unknown[]): StoredProductPhoto[] => {
  const unique = new Set<string>();
  const result: StoredProductPhoto[] = [];

  photos.forEach((entry, index) => {
    const normalized = normalizePhotoEntry(entry);
    if (!normalized || unique.has(normalized.url)) return;
    unique.add(normalized.url);
    result.push({
      ...normalized,
      is_primary: index === 0 ? true : normalized.is_primary,
    });
  });

  if (result.length > 0 && !result.some((photo) => photo.is_primary)) {
    result[0]!.is_primary = true;
  }

  return result;
};

const seedState = (): AdminState => {
  const timestamp = nowIso();
  const rawCategories = listMockCategories().data;
  const rawBrands = listMockBrands().data;
  const rawBanners = listMockActiveBanners().data;
  const rawProducts = listMockProducts({ page: 1, perPage: 100 }).data;

  return {
    version: 1,
    banners: rawBanners.map((banner, index) => ({
      id: banner.id,
      title: banner.title ?? null,
      alt_text: banner.alt_text ?? null,
      image_path: banner.image_path,
      image_url: banner.image_url,
      link_url: banner.link_url ?? null,
      order: banner.order ?? index + 1,
      is_active: banner.is_active,
      created_at: banner.created_at ?? timestamp,
      updated_at: banner.updated_at ?? timestamp,
      deleted_at: banner.deleted_at ?? null,
    })),
    brands: rawBrands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo ?? null,
      logo_url: brand.logo ?? null,
      description: null,
      is_active: true,
      product_count: rawProducts.filter((product) => product.brand.id === brand.id).length,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    })),
    categories: rawCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon ?? null,
      icon_url: category.icon ?? null,
      icon_svg: null,
      fees: {
        marketplace: EMPTY_CHANNEL(),
        shopee: EMPTY_CHANNEL(),
        entraverse: EMPTY_CHANNEL(),
        tokopedia: EMPTY_CHANNEL(),
        tokopedia_tiktok: EMPTY_CHANNEL(),
      },
      program_garansi: null,
      margin_percent: 15,
      min_margin: 15,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      created_by: "system",
      updated_by: "system",
    })),
    products: rawProducts.map((item) => {
      const detail = getMockProduct(item.id) ?? item;
      const categoryRef = rawCategories.find((category) => category.id === detail.category.id);
      const brandRef = rawBrands.find((brand) => brand.id === detail.brand.id);
      const photos = normalizePhotos(
        [
          detail.image,
          ...(Array.isArray(detail.gallery) ? detail.gallery : []),
        ].map((url, index) => ({ url, is_primary: index === 0 }))
      );
      const inventory = {
        total_stock: detail.stock,
        weight: detail.weight,
      };

      return {
        id: detail.id,
        name: detail.name,
        slug: detail.slug,
        brand: detail.brand.name,
        brand_id: detail.brand.id,
        brand_ref: brandRef
          ? { id: brandRef.id, name: brandRef.name, slug: brandRef.slug }
          : { id: detail.brand.id, name: detail.brand.name, slug: detail.brand.slug },
        category: detail.category.name,
        category_id: detail.category.id,
        category_ref: categoryRef
          ? { id: categoryRef.id, name: categoryRef.name, slug: categoryRef.slug }
          : { id: detail.category.id, name: detail.category.name, slug: detail.category.slug },
        spu: detail.sku ?? detail.id.toUpperCase(),
        barcode: null,
        description: detail.description ?? "",
        product_status: "active",
        status: "active",
        stock_status: detail.stock > 0 ? "in_stock" : "out_of_stock",
        trade_in: Boolean(detail.trade_in),
        is_featured: Boolean((detail as { featured?: boolean }).featured),
        free_shipping: Boolean(detail.free_shipping),
        rating: detail.rating,
        sold_count: detail.sold_count,
        image: detail.image,
        main_image: photos[0]?.url ?? detail.image,
        photos,
        gallery: detail.gallery ?? [],
        inventory,
        variants: ((detail as { variants?: Array<{ name: string; options: string[] }> }).variants ?? []),
        variant_pricing: detail.variant_pricing ?? [],
        specifications: detail.specifications ?? {},
        specs: detail.specifications ?? {},
        warranty: detail.warranty ?? null,
        weight: detail.weight ?? 0,
        reviews: listMockProductReviews(detail.id, { page: 1, perPage: 20, sort: "newest", withPhotos: false }).data,
        created_at: toString((detail as { created_at?: string }).created_at, timestamp),
        updated_at: timestamp,
        deleted_at: null,
        jurnal_id: null,
        jurnal_metadata: null,
        mekari_status: { sync_status: null },
      } satisfies StoredProduct;
    }),
  };
};

const readLocalState = async (): Promise<AdminState | null> => {
  try {
    const raw = await readFile(LOCAL_STATE_PATH, "utf8");
    return JSON.parse(raw) as AdminState;
  } catch {
    return null;
  }
};

const writeLocalState = async (state: AdminState) => {
  await mkdir(LOCAL_STATE_DIR, { recursive: true });
  await writeFile(LOCAL_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
};

export const loadAdminState = async (): Promise<AdminState> => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const local = await readLocalState();
    if (local) return local;

    const seeded = seedState();
    await writeLocalState(seeded);
    return seeded;
  }

  const existing = await get(STATE_PATH, { access: "private" });
  if (existing?.statusCode === 200 && existing.stream) {
    const raw = await readStreamAsText(existing.stream);
    return JSON.parse(raw) as AdminState;
  }

  const seeded = seedState();
  await saveAdminState(seeded);
  return seeded;
};

export const saveAdminState = async (state: AdminState) => {
  const nextState = clone(state);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    await writeLocalState(nextState);
    return nextState;
  }

  await put(STATE_PATH, JSON.stringify(nextState), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });

  return nextState;
};

const extensionFromName = (fileName: string, fallback = "bin") => {
  const last = fileName.split(".").pop()?.trim().toLowerCase();
  return last && last !== fileName ? last : fallback;
};

export const uploadAdminAsset = async (folder: string, file: File) => {
  const safeExt = extensionFromName(file.name, file.type.split("/").pop() || "bin");
  const pathname = `admin-assets/${folder}/${crypto.randomUUID()}.${safeExt}`;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    return {
      pathname,
      url: dataUrl,
    };
  }

  const uploaded = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: file.type || undefined,
  });

  return {
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
};

export const buildAdminSessionUser = (authorization: string | null): { name: string; role: AdminRole } => {
  if (!authorization?.startsWith("Bearer mock-admin.")) {
    return { name: "Entraverse Admin", role: "admin" };
  }

  try {
    const encoded = authorization.replace("Bearer mock-admin.", "");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      name?: string;
      role?: AdminRole;
    };

    return {
      name: payload.name?.trim() || "Entraverse Admin",
      role: payload.role ?? "admin",
    };
  } catch {
    return { name: "Entraverse Admin", role: "admin" };
  }
};

export const paginate = <T>(items: T[], page = 1, perPage = 10) => {
  const safePerPage = Math.max(1, perPage);
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / safePerPage));
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const start = (currentPage - 1) * safePerPage;

  return {
    data: items.slice(start, start + safePerPage),
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      total,
      per_page: safePerPage,
    },
    pagination: {
      total,
      per_page: safePerPage,
      current_page: currentPage,
      last_page: lastPage,
      from: total === 0 ? null : start + 1,
      to: total === 0 ? null : Math.min(start + safePerPage, total),
    },
  };
};

export const sortByUpdatedAtDesc = <T extends { updated_at?: string | null }>(rows: T[]) =>
  [...rows].sort((left, right) => {
    const leftTime = new Date(left.updated_at ?? 0).getTime();
    const rightTime = new Date(right.updated_at ?? 0).getTime();
    return rightTime - leftTime;
  });

export const computeBrandProductCount = (state: AdminState, brandId: string) =>
  state.products.filter((product) => product.brand_id === brandId && !product.deleted_at).length;

export const computeCategoryProductCount = (state: AdminState, categoryId: string) =>
  state.products.filter((product) => product.category_id === categoryId && !product.deleted_at).length;

export const resolveBrandRef = (state: AdminState, brandId: string | null, brandName: string | null) => {
  const exact = brandId ? state.brands.find((brand) => brand.id === brandId) : null;
  const byName = !exact && brandName
    ? state.brands.find((brand) => brand.name.toLowerCase() === brandName.toLowerCase())
    : null;
  const brand = exact ?? byName;

  if (!brand) {
    const fallbackName = brandName?.trim() || "Unknown Brand";
    return {
      id: slugify(fallbackName) || crypto.randomUUID(),
      name: fallbackName,
      slug: slugify(fallbackName) || "unknown-brand",
    };
  }

  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
  };
};

export const resolveCategoryRef = (state: AdminState, categoryId: string | null, categoryName: string | null) => {
  const exact = categoryId ? state.categories.find((category) => category.id === categoryId) : null;
  const byName = !exact && categoryName
    ? state.categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase())
    : null;
  const category = exact ?? byName;

  if (!category) {
    const fallbackName = categoryName?.trim() || "Kategori";
    return {
      id: slugify(fallbackName) || crypto.randomUUID(),
      name: fallbackName,
      slug: slugify(fallbackName) || "kategori",
    };
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
};

export const repriceProductsForCategory = (state: AdminState, category: StoredCategory): StoredProduct[] => {
  const normalizedCategoryName = category.name.trim().toLowerCase();

  return state.products.map((product) => {
    const matchesCategory =
      product.category_id === category.id ||
      (normalizedCategoryName !== "" && product.category?.trim().toLowerCase() === normalizedCategoryName);

    if (!matchesCategory) {
      return product;
    }

    return {
      ...product,
      category_id: category.id,
      category: category.name,
      category_ref: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
      variant_pricing: recalculateVariantPricingForCategory(product.variant_pricing, category),
      updated_at: nowIso(),
    };
  });
};

export const normalizeStoredProduct = (state: AdminState, input: {
  existing?: StoredProduct | null;
  body: FormData | Record<string, unknown>;
  uploadedPhotoUrls?: string[];
  variantImageUrls?: Record<string, string>;
}) => {
  const isFormData = input.body instanceof FormData;
  const source = isFormData ? {} : (input.body as Record<string, unknown>);
  const read = (key: string) =>
    isFormData
      ? (input.body as FormData).get(key)
      : (source[key] as FormDataEntryValue | Record<string, unknown> | null | undefined);
  const readText = (key: string, fallback = "") => {
    const value = read(key);
    return typeof value === "string" ? value : fallback;
  };

  const now = nowIso();
  const existing = input.existing ?? null;
  const productName = readText("name", existing?.name ?? "").trim() || existing?.name || "Produk Baru";
  const productSlug = slugify(readText("slug", existing?.slug ?? productName).trim() || productName) || crypto.randomUUID();
  const brandId = readText("brand_id", existing?.brand_id ?? "").trim() || null;
  const brandName = readText("brand", existing?.brand ?? "").trim() || existing?.brand || null;
  const categoryId = readText("category_id", existing?.category_id ?? "").trim() || null;
  const categoryName = readText("category", existing?.category ?? "").trim() || existing?.category || null;
  const brandRef = resolveBrandRef(state, brandId, brandName);
  const categoryRef = resolveCategoryRef(state, categoryId, categoryName);
  const persistedPhotos = normalizePhotos(
    parseJsonField(
      isFormData ? (input.body as FormData).get("photos") : null,
      existing?.photos ?? []
    ) as unknown[]
  );
  const mergedPhotos = normalizePhotos([
    ...persistedPhotos,
    ...(input.uploadedPhotoUrls ?? []).map((url, index) => ({ url, is_primary: persistedPhotos.length === 0 && index === 0 })),
  ]);
  const variants = parseJsonField<Array<{ name: string; options: string[] }>>(
    isFormData ? (input.body as FormData).get("variants") : null,
    existing?.variants ?? []
  );
  const variantPricing = parseJsonField<Array<Record<string, unknown>>>(
    isFormData ? (input.body as FormData).get("variant_pricing") : null,
    existing?.variant_pricing ?? []
  ).map((row) => {
    const source = asObject(row);
    const sharedVariantImageKey = toString(source.shared_variant_image_key ?? source.variant_image_key).trim();
    const variantImageFromUpload = sharedVariantImageKey ? input.variantImageUrls?.[sharedVariantImageKey] : null;

    if (!variantImageFromUpload) {
      return source;
    }

    return {
      ...source,
      shared_variant_image_key: sharedVariantImageKey,
      variant_image: variantImageFromUpload,
    };
  });
  const inventory = parseJsonField<Record<string, unknown>>(
    isFormData ? (input.body as FormData).get("inventory") : null,
    existing?.inventory ?? {}
  );
  const totalStock = toNumber(
    inventory.total_stock ??
      variantPricing.reduce((sum, row) => sum + toNumber(asObject(row).stock), 0),
    0
  );
  const productStatus = (readText("product_status", existing?.product_status ?? "active").trim() || "active") as
    | "active"
    | "inactive"
    | "draft";
  const stockStatus = (existing?.stock_status ??
    (totalStock <= 0 ? "out_of_stock" : "in_stock")) as StoredProduct["stock_status"];

  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: productName,
    slug: productSlug,
    brand: brandRef.name,
    brand_id: brandRef.id,
    brand_ref: brandRef,
    category: categoryRef.name,
    category_id: categoryRef.id,
    category_ref: categoryRef,
    spu: readText("spu", existing?.spu ?? "").trim() || existing?.spu || null,
    barcode: readText("barcode", existing?.barcode ?? "").trim() || existing?.barcode || null,
    description: readText("description", existing?.description ?? ""),
    product_status: productStatus,
    status: productStatus,
    stock_status: stockStatus,
    trade_in: toBoolean(read("trade_in")) || false,
    is_featured: existing?.is_featured ?? false,
    free_shipping: existing?.free_shipping ?? false,
    rating: existing?.rating ?? 0,
    sold_count: existing?.sold_count ?? 0,
    image: mergedPhotos[0]?.url ?? existing?.image ?? "/product-placeholder.svg",
    main_image: mergedPhotos[0]?.url ?? existing?.main_image ?? null,
    photos: mergedPhotos,
    gallery: mergedPhotos.map((photo) => photo.url),
    inventory: {
      ...inventory,
      total_stock: totalStock,
    },
    variants,
    variant_pricing: variantPricing,
    specifications: existing?.specifications ?? {},
    specs: existing?.specs ?? {},
    warranty: existing?.warranty ?? null,
    weight: toNumber(asObject(inventory).weight, existing?.weight ?? 0),
    reviews: existing?.reviews ?? [],
    created_at: existing?.created_at ?? now,
    updated_at: now,
    deleted_at: existing?.deleted_at ?? null,
    jurnal_id: existing?.jurnal_id ?? null,
    jurnal_metadata: existing?.jurnal_metadata ?? null,
    mekari_status: existing?.mekari_status ?? { sync_status: null },
  } satisfies StoredProduct;
};
