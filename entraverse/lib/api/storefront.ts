import { resolveApiBaseUrl, resolveApiOriginUrl } from "@/lib/api-config";
import type {
  ApiListResult,
  HeroSlide,
  StorefrontBrand,
  StorefrontCategory,
  StorefrontProduct,
  Testimonial,
  WhyChooseItem,
} from "@/lib/api/types";

type JsonRecord = Record<string, unknown>;

const REVALIDATE_SECONDS = 60;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const isRawSvg = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.startsWith("<svg") || (trimmed.startsWith("<?xml") && trimmed.includes("<svg"));
};

const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object") return {};
  return value as JsonRecord;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const tryParseJsonObject = (value: string | null): JsonRecord => {
  if (!value) return {};
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return {};

  try {
    const parsed = JSON.parse(trimmed);
    return toObject(parsed);
  } catch {
    return {};
  }
};

const formatCurrency = (value: number): string =>
  `Rp ${new Intl.NumberFormat("id-ID").format(Math.max(0, Math.round(value)))}`;

const toAbsoluteUrl = (value: string): string => {
  const normalized = value.trim();
  return resolveApiOriginUrl(normalized);
};

const buildApiUrl = (
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(resolveApiBaseUrl(normalizedPath));

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const unwrapDataArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const source = toObject(payload);
  if (Array.isArray(source.data)) return source.data;

  const nested = toObject(source.data);
  if (Array.isArray(nested.data)) return nested.data;

  return [];
};

const unwrapTotal = (payload: unknown, fallback = 0): number => {
  const source = toObject(payload);
  const fromCount = toNumberValue(source.count);
  if (fromCount !== null) return fromCount;

  const pagination = toObject(source.pagination);
  const fromPagination = toNumberValue(pagination.total);
  if (fromPagination !== null) return fromPagination;

  const meta = toObject(source.meta);
  const fromMeta = toNumberValue(meta.total);
  if (fromMeta !== null) return fromMeta;

  return fallback;
};

const parseError = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const request = async (
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: {
    revalidate?: number;
    noStore?: boolean;
  }
) => {
  const response = await fetch(buildApiUrl(path, query), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: options?.noStore ? "no-store" : undefined,
    next: options?.noStore
      ? undefined
      : {
          revalidate: options?.revalidate ?? REVALIDATE_SECONDS,
        },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json();
};

const extractCategoryImage = (row: JsonRecord): { imageUrl: string | null; imageSvg: string | null } => {
  const icon = toStringValue(row.icon);
  const iconFromJsonString = tryParseJsonObject(icon);
  const iconUrl = toStringValue(row.icon_url);
  const iconSvg = toStringValue(row.icon_svg);
  const iconObject = toObject(row.icon);
  const iconObjectUrl = toStringValue(iconObject.url) ?? toStringValue(iconFromJsonString.url);
  const iconObjectSvg = toStringValue(iconObject.svg) ?? toStringValue(iconFromJsonString.svg);

  const imageSvg = iconSvg ?? iconObjectSvg ?? (icon && isRawSvg(icon) ? icon : null);
  const iconStringAsUrl =
    icon && !isRawSvg(icon) && !icon.trim().startsWith("{") && !icon.trim().startsWith("[") ? icon : null;
  const rawImageUrl = iconUrl ?? iconObjectUrl ?? iconStringAsUrl;

  return {
    imageSvg,
    imageUrl: rawImageUrl ? toAbsoluteUrl(rawImageUrl) : null,
  };
};

const mapCategory = (raw: unknown, index: number): StorefrontCategory => {
  const row = toObject(raw);
  const id = toStringValue(row.id) ?? `category-${index + 1}`;
  const name = toStringValue(row.name) ?? `Category ${index + 1}`;
  const slug = toStringValue(row.slug) ?? (slugify(name) || `category-${index + 1}`);
  const { imageUrl, imageSvg } = extractCategoryImage(row);

  return {
    id,
    name,
    slug,
    imageUrl,
    imageSvg,
  };
};

const resolveProductImage = (row: JsonRecord): string | null => {
  const mainImage = toStringValue(row.main_image);
  if (mainImage) return toAbsoluteUrl(mainImage);

  const photos = Array.isArray(row.photos) ? row.photos : [];
  for (const photo of photos) {
    if (typeof photo === "string") {
      const normalized = toStringValue(photo);
      if (normalized) return toAbsoluteUrl(normalized);
      continue;
    }

    const photoObject = toObject(photo);
    const photoUrl = toStringValue(photoObject.url);
    if (photoUrl) return toAbsoluteUrl(photoUrl);
  }

  return null;
};

const resolveProductPrice = (row: JsonRecord): number => {
  const variantPricing = Array.isArray(row.variant_pricing) ? row.variant_pricing : [];
  if (variantPricing.length > 0) {
    const firstVariant = toObject(variantPricing[0]);
    const variantPrice =
      toNumberValue(firstVariant.entraverse_price) ??
      toNumberValue(firstVariant.offline_price) ??
      toNumberValue(firstVariant.price);

    if (variantPrice !== null) return variantPrice;
  }

  const directPrice =
    toNumberValue(row.entraverse_price) ??
    toNumberValue(row.offline_price) ??
    toNumberValue(row.price);
  if (directPrice !== null) return directPrice;

  const inventory = toObject(row.inventory);
  const inventoryPrice = toNumberValue(inventory.price);
  if (inventoryPrice !== null) return inventoryPrice;

  return 0;
};

const resolveProductStock = (row: JsonRecord): number => {
  const variantPricing = Array.isArray(row.variant_pricing) ? row.variant_pricing : [];
  if (variantPricing.length > 0) {
    const totalVariantStock = variantPricing.reduce((sum, entry) => {
      const variant = toObject(entry);
      return sum + Math.max(0, toNumberValue(variant.stock) ?? 0);
    }, 0);

    if (totalVariantStock > 0) {
      return totalVariantStock;
    }
  }

  return Math.max(
    0,
    toNumberValue(row.stock) ??
      toNumberValue(toObject(row.inventory).total_stock) ??
      0
  );
};

const resolveProductStockStatus = (
  row: JsonRecord,
  stock: number
): StorefrontProduct["stock_status"] => {
  const status = toStringValue(row.stock_status);
  if (status === "in_stock" || status === "low_stock" || status === "out_of_stock") {
    return status;
  }

  if (stock <= 0) return "out_of_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
};

const mapProduct = (raw: unknown, index: number): StorefrontProduct => {
  const row = toObject(raw);
  const id = toStringValue(row.id) ?? `product-${index + 1}`;
  const name = toStringValue(row.name) ?? `Product ${index + 1}`;
  const slug = toStringValue(row.slug) ?? (slugify(name) || `product-${index + 1}`);
  const price = resolveProductPrice(row);
  const formattedPrice = toStringValue(row.formatted_price) ?? formatCurrency(price);
  const stock = resolveProductStock(row);

  return {
    id,
    name,
    slug,
    price,
    formattedPrice,
    image: resolveProductImage(row),
    brand: toStringValue(row.brand),
    category: toStringValue(row.category),
    stock,
    stock_status: resolveProductStockStatus(row, stock),
  };
};

const mapListResult = <T>(data: T[], total: number): ApiListResult<T> => ({
  data,
  total: total > 0 ? total : data.length,
  error: null,
});

const mapErrorResult = <T>(message: string): ApiListResult<T> => ({
  data: [],
  total: 0,
  error: message,
});

const getCategories = async (limit = 12): Promise<ApiListResult<StorefrontCategory>> => {
  try {
    const payload = await request("/v1/categories", { limit });
    const data = unwrapDataArray(payload).map(mapCategory).slice(0, limit);
    return mapListResult(data, unwrapTotal(payload, data.length));
  } catch (error) {
    return mapErrorResult(parseError(error, "Gagal memuat kategori."));
  }
};

const getFeaturedProducts = async (limit = 6): Promise<ApiListResult<StorefrontProduct>> => {
  try {
    const payload = await request("/v1/products", {
      featured: true,
      per_page: limit,
      limit,
    }, { noStore: true });

    const data = unwrapDataArray(payload).map(mapProduct).slice(0, limit);
    return mapListResult(data, unwrapTotal(payload, data.length));
  } catch (error) {
    return mapErrorResult(parseError(error, "Gagal memuat produk featured."));
  }
};

const getBestSellingProducts = async (limit = 6): Promise<ApiListResult<StorefrontProduct>> => {
  try {
    const payload = await request("/v1/products", {
      best_selling: true,
      per_page: limit,
      limit,
    }, { noStore: true });

    const data = unwrapDataArray(payload).map(mapProduct).slice(0, limit);
    return mapListResult(data, unwrapTotal(payload, data.length));
  } catch (error) {
    return mapErrorResult(parseError(error, "Gagal memuat produk best selling."));
  }
};

const getNewestProducts = async (limit = 24): Promise<ApiListResult<StorefrontProduct>> => {
  try {
    const payload = await request("/v1/products", {
      sort_by: "newest",
      sort_order: "desc",
      per_page: limit,
      limit,
    }, { noStore: true });

    const data = unwrapDataArray(payload).map(mapProduct).slice(0, limit);
    return mapListResult(data, unwrapTotal(payload, data.length));
  } catch (error) {
    return mapErrorResult(parseError(error, "Gagal memuat produk terbaru."));
  }
};

const getBrands = async (limit = 10): Promise<ApiListResult<StorefrontBrand>> => {
  try {
    const payload = await request("/v1/brands", { limit });
    const rows = unwrapDataArray(payload);

    if (rows.length > 0) {
      const brands = rows
        .map((row, index) => {
          const item = toObject(row);
          const name = toStringValue(item.name) ?? `Brand ${index + 1}`;
          const slug = toStringValue(item.slug) ?? (slugify(name) || `brand-${index + 1}`);
          const rawImage = toStringValue(item.image) ?? toStringValue(item.logo) ?? toStringValue(item.image_url);

          return {
            id: toStringValue(item.id) ?? `brand-${index + 1}`,
            name,
            slug,
            image: rawImage ? toAbsoluteUrl(rawImage) : null,
          } satisfies StorefrontBrand;
        })
        .slice(0, limit);

      return mapListResult(brands, unwrapTotal(payload, brands.length));
    }
  } catch {
    // fallback ke dedup brand dari products
  }

  const products = await getNewestProducts(40);
  if (products.data.length === 0) {
    return mapErrorResult(products.error ?? "Gagal memuat brand.");
  }

  const mapped = new Map<string, StorefrontBrand>();
  products.data.forEach((product, index) => {
    if (!product.brand) return;
    const key = product.brand.trim().toLowerCase();
    if (!key || mapped.has(key)) return;

    mapped.set(key, {
      id: `brand-${index + 1}`,
      name: product.brand,
      slug: slugify(product.brand),
      image: product.image,
    });
  });

  const data = Array.from(mapped.values()).slice(0, limit);
  return mapListResult(data, data.length);
};

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "hero-quest-3",
    image: "/assets/images/hero/e-hero.png",
    url: "/products",
    title: "Introducing Meta Quest 3",
  },
  {
    id: "hero-vr-collection",
    image: "/assets/images/hero/e-hero.png",
    url: "/products",
    title: "Smart Devices Collection",
  },
  {
    id: "hero-trade-in",
    image: "/assets/images/hero/e-hero.png",
    url: "/products",
    title: "Upgrade with Trade In",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    id: "testimony-1",
    quote: "Fast response and good quality.",
    author: "Budi",
    role: "Tokopedia Customer",
  },
  {
    id: "testimony-2",
    quote:
      "Seller ramah dan informatif. Pengemasan paket sangat baik dan aman. Pengiriman 2 hari lebih cepat dari semestinya.",
    author: "Nyoman",
    role: "Tokopedia Customer",
  },
  {
    id: "testimony-3",
    quote: "VR experience yang bagus dengan harga terjangkau, setup juga cepat.",
    author: "Jonathan",
    role: "Tokopedia Customer",
  },
  {
    id: "testimony-4",
    quote: "Modelnya keren, seller respons cepat dan ramah.",
    author: "Markurius",
    role: "Tokopedia Customer",
  },
];

const WHY_CHOOSE_ITEMS: WhyChooseItem[] = [
  {
    id: "service-product-knowledge",
    title: "Pengetahuan Produk",
    description: "Konsultasi tepat untuk memilih produk sesuai kebutuhan.",
    icon: "package",
  },
  {
    id: "service-warranty",
    title: "Garansi Terjamin",
    description: "Produk resmi dengan dukungan purna jual yang jelas.",
    icon: "shield",
  },
  {
    id: "service-pricing",
    title: "Harga Bersaing",
    description: "Harga kompetitif dengan kualitas produk terpercaya.",
    icon: "badge-percent",
  },
  {
    id: "service-support",
    title: "Kecepatan Layanan",
    description: "Tim support sigap membantu sebelum dan sesudah pembelian.",
    icon: "headset",
  },
];

export const storefrontApi = {
  getCategories,
  getFeaturedProducts,
  getBestSellingProducts,
  getNewestProducts,
  getBrands,
};

export const storefrontStaticData = {
  heroSlides: HERO_SLIDES,
  testimonials: TESTIMONIALS,
  whyChooseItems: WHY_CHOOSE_ITEMS,
};
