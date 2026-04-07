import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { PRODUCT_ENDPOINTS } from "@/lib/constants";
import { sumSharedInventoryStockFromVariantRows } from "@/lib/sharedInventory";
import type {
  ApiSuccessResponse,
  Brand,
  Category,
  Product,
  ProductApiResponse,
  ProductDetail,
  ProductFilters,
  ProductReview,
  ProductReviewDistribution,
  ProductReviewQuery,
  ProductReviewResponse,
  ProductSearchSuggestionResponse,
  ProductReviewSummary,
  ProductVariantGroup,
  ProductVariantPricingRow,
  WishlistToggleResponse,
} from "@/types/product.types";

type JsonRecord = Record<string, unknown>;

const toCsvParam = (value?: string[] | number[]) => {
  if (!value || value.length === 0) return undefined;
  return value.join(",");
};

const toObject = (value: unknown): JsonRecord => {
  if (!value || typeof value !== "object") return {};
  return value as JsonRecord;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const toNumberValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return false;
};

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const resolveImageFromRow = (row: JsonRecord): string => {
  const direct = toStringValue(row.image) ?? toStringValue(row.main_image);
  if (direct) return direct;

  const photos = Array.isArray(row.photos) ? row.photos : [];
  for (const photo of photos) {
    if (typeof photo === "string") {
      const normalized = toStringValue(photo);
      if (normalized) return normalized;
      continue;
    }

    const photoObject = toObject(photo);
    const url = toStringValue(photoObject.url);
    if (url) return url;
  }

  return "/assets/images/hero/e-hero.png";
};

const resolveCategory = (row: JsonRecord): Product["category"] => {
  const categoryObject = toObject(row.category);
  if (Object.keys(categoryObject).length > 0) {
    const name = toStringValue(categoryObject.name) ?? "Kategori";
    const slug = toStringValue(categoryObject.slug) ?? (slugify(name) || "kategori");
    const id = toStringValue(categoryObject.id) ?? slug;

    return { id, name, slug };
  }

  const categoryName = toStringValue(row.category) ?? "Kategori";
  const categorySlug = slugify(categoryName) || "kategori";
  const categoryId = toStringValue(row.category_id) ?? categorySlug;

  return {
    id: categoryId,
    name: categoryName,
    slug: categorySlug,
  };
};

const resolveBrand = (row: JsonRecord): Product["brand"] => {
  const brandReference = toObject(row.brand_ref);
  const brandObject = Object.keys(brandReference).length > 0 ? brandReference : toObject(row.brand);

  if (Object.keys(brandObject).length > 0) {
    const name = toStringValue(brandObject.name) ?? "Unknown Brand";
    const slug = toStringValue(brandObject.slug) ?? (slugify(name) || "unknown-brand");
    const id = toStringValue(brandObject.id) ?? slug;

    return { id, name, slug };
  }

  const brandName = toStringValue(row.brand) ?? toStringValue(brandReference.name) ?? "Unknown Brand";
  const brandSlug = slugify(brandName) || "unknown-brand";

  return {
    id: brandSlug,
    name: brandName,
    slug: brandSlug,
  };
};

const resolveVariants = (row: JsonRecord): ProductVariantGroup[] => {
  const source = Array.isArray(row.variants) ? row.variants : [];

  return source
    .map((entry) => {
      const object = toObject(entry);
      const name = toStringValue(object.name);
      const options = Array.isArray(object.options)
        ? object.options
            .map((item) => toStringValue(item))
            .filter((item): item is string => Boolean(item))
        : [];

      if (!name || options.length === 0) return null;

      return {
        name,
        options: Array.from(new Set(options)),
      } satisfies ProductVariantGroup;
    })
    .filter((item): item is ProductVariantGroup => item !== null);
};

const resolveTradeIn = (row: JsonRecord): boolean => {
  const candidates = [
    row.trade_in,
    row.tradeIn,
    row.is_trade_in,
    row.trade_in_enabled,
    row.can_trade_in,
  ];

  return candidates.some((value) => toBooleanValue(value));
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

  const inventoryPrice = toNumberValue(toObject(row.inventory).price);
  if (inventoryPrice !== null) return inventoryPrice;

  return 0;
};

const resolveStockStatus = (
  status: unknown,
  stock: number
): ProductDetail["stock_status"] => {
  if (stock <= 0) return "out_of_stock";
  if (status === "out_of_stock") return "out_of_stock";
  if (status === "low_stock") return "low_stock";
  if (stock <= 5) return "low_stock";
  return "in_stock";
};

const resolveSpecs = (rawSpecs: unknown): Record<string, string | number> => {
  return Object.entries(toObject(rawSpecs)).reduce<Record<string, string | number>>((result, [key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      result[key] = value;
    }

    return result;
  }, {});
};

const resolveSpecifications = (row: JsonRecord): Record<string, string> => {
  const raw = Object.keys(toObject(row.specifications)).length > 0 ? toObject(row.specifications) : toObject(row.specs);

  const result: Record<string, string> = {};
  Object.entries(raw).forEach(([key, value]) => {
    const normalized = toStringValue(value);
    if (normalized) {
      result[key] = normalized;
    }
  });

  return result;
};

const resolveGallery = (row: JsonRecord): string[] => {
  const unique = new Set<string>();

  const append = (value: unknown) => {
    const normalized = toStringValue(value);
    if (!normalized) return;
    unique.add(normalized);
  };

  append(row.main_image);
  append(row.image);

  const gallery = Array.isArray(row.gallery) ? row.gallery : [];
  gallery.forEach((item) => {
    if (typeof item === "string") {
      append(item);
      return;
    }

    append(toObject(item).url);
  });

  const photos = Array.isArray(row.photos) ? row.photos : [];
  photos.forEach((item) => {
    if (typeof item === "string") {
      append(item);
      return;
    }

    append(toObject(item).url);
  });

  if (unique.size === 0) {
    unique.add(resolveImageFromRow(row));
  }

  return Array.from(unique);
};

const resolveReviewDistribution = (raw: unknown): ProductReviewDistribution => {
  const object = toObject(raw);

  return {
    5: toNumberValue(object["5"]) ?? 0,
    4: toNumberValue(object["4"]) ?? 0,
    3: toNumberValue(object["3"]) ?? 0,
    2: toNumberValue(object["2"]) ?? 0,
    1: toNumberValue(object["1"]) ?? 0,
  };
};

const resolveReviewSummary = (raw: unknown, fallbackRating: number): ProductReviewSummary => {
  const object = toObject(raw);

  return {
    average_rating: toNumberValue(object.average_rating) ?? fallbackRating,
    total_count: toNumberValue(object.total_count) ?? 0,
    distribution: resolveReviewDistribution(object.distribution),
  };
};

const mapProduct = (raw: unknown): Product => {
  const row = toObject(raw);
  const name = toStringValue(row.name) ?? "Produk";
  const slug = toStringValue(row.slug) ?? (slugify(name) || "produk");
  const variantPricing = Array.isArray(row.variant_pricing)
    ? row.variant_pricing.map(mapVariantPricingRow)
    : undefined;

  const price = resolveProductPrice(row);
  const originalPrice = toNumberValue(row.original_price) ?? undefined;
  const discountPercentage =
    toNumberValue(row.discount_percentage) ??
    (originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : undefined);

  const stockFromVariants =
    Array.isArray(row.variant_pricing) && row.variant_pricing.length > 0
      ? sumSharedInventoryStockFromVariantRows(row.variant_pricing as Array<Record<string, unknown>>)
      : null;
  const stock =
    stockFromVariants ??
    toNumberValue(row.stock) ??
    toNumberValue(toObject(row.inventory).total_stock) ??
    0;

  return {
    id: toStringValue(row.id) ?? toStringValue(row.uuid) ?? slug,
    name,
    slug,
    price,
    offline_price: toNumberValue(row.offline_price) ?? undefined,
    entraverse_price: toNumberValue(row.entraverse_price) ?? undefined,
    original_price: originalPrice,
    discount_percentage: discountPercentage,
    rating: toNumberValue(row.rating) ?? 0,
    sold_count: toNumberValue(row.sold_count) ?? 0,
    image: resolveImageFromRow(row),
    category: resolveCategory(row),
    brand: resolveBrand(row),
    is_wishlisted: toBooleanValue(row.is_wishlisted),
    free_shipping: toBooleanValue(row.free_shipping),
    stock,
    specs: resolveSpecs(row.specs),
    stock_status: resolveStockStatus(row.stock_status, stock),
    warranty: toStringValue(row.warranty) ?? undefined,
    variants: resolveVariants(row),
    variant_pricing: variantPricing,
    trade_in: resolveTradeIn(row),
  };
};

const mapVariantPricingRow = (raw: unknown): ProductVariantPricingRow => {
  const row = toObject(raw);
  const rawOptions = toObject(row.options);
  const options = Object.fromEntries(
    Object.entries(rawOptions)
      .map(([key, value]) => [String(key).trim(), toStringValue(value) ?? ""])
      .filter(([key, value]) => key.length > 0 && value.length > 0)
  );

  return {
    sku: toStringValue(row.sku) ?? undefined,
    sku_seller: toStringValue(row.sku_seller) ?? undefined,
    variant_code: toStringValue(row.variant_code) ?? undefined,
    label: toStringValue(row.label) ?? undefined,
    options: Object.keys(options).length > 0 ? options : undefined,
    stock: toNumberValue(row.stock) ?? undefined,
    item_weight: toNumberValue(row.item_weight) ?? undefined,
    offline_price: toNumberValue(row.offline_price) ?? undefined,
    entraverse_price: toNumberValue(row.entraverse_price) ?? undefined,
    tokopedia_price: toNumberValue(row.tokopedia_price) ?? undefined,
    shopee_price: toNumberValue(row.shopee_price) ?? undefined,
  };
};

const mapProductDetail = (raw: unknown): ProductDetail => {
  const row = toObject(raw);
  const base = mapProduct(row);

  const dimensionsSource = toObject(row.dimensions);
  const dimensions =
    Object.keys(dimensionsSource).length > 0
      ? {
          length: toNumberValue(dimensionsSource.length) ?? 0,
          width: toNumberValue(dimensionsSource.width) ?? 0,
          height: toNumberValue(dimensionsSource.height) ?? 0,
        }
      : undefined;

  return {
    ...base,
    gallery: resolveGallery(row),
    description: toStringValue(row.description) ?? "",
    specifications: resolveSpecifications(row),
    weight: toNumberValue(row.weight) ?? toNumberValue(toObject(row.inventory).weight) ?? 0,
    dimensions,
    barcode: toStringValue(row.barcode) ?? undefined,
    sku: toStringValue(row.sku) ?? toStringValue(row.spu) ?? base.slug.toUpperCase(),
    stock_status: resolveStockStatus(row.stock_status, base.stock),
    min_order: toNumberValue(row.min_order) ?? 1,
    max_order: toNumberValue(row.max_order) ?? base.stock,
    reviews_summary: resolveReviewSummary(row.reviews_summary, base.rating),
  };
};

const mapReview = (raw: unknown): ProductReview => {
  const row = toObject(raw);
  const user = toObject(row.user);

  const photos = Array.isArray(row.photos)
    ? row.photos
        .map((item) => {
          if (typeof item === "string") return toStringValue(item);
          return toStringValue(toObject(item).url);
        })
        .filter((item): item is string => Boolean(item))
    : [];

  return {
    id: toStringValue(row.id) ?? `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user: {
      name: toStringValue(user.name) ?? "Pengguna",
      avatar: toStringValue(user.avatar) ?? undefined,
    },
    rating: toNumberValue(row.rating) ?? 0,
    comment: toStringValue(row.comment) ?? "",
    photos: photos.length > 0 ? photos : undefined,
    created_at: toStringValue(row.created_at) ?? new Date().toISOString(),
    variant: toStringValue(row.variant) ?? undefined,
  };
};

const extractProductRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const source = toObject(payload);
  if (Array.isArray(source.data)) return source.data;

  const nested = toObject(source.data);
  if (Array.isArray(nested.data)) return nested.data;

  return [];
};

const extractMeta = (payload: unknown, fallbackCount: number): ProductApiResponse["meta"] => {
  const source = toObject(payload);
  const meta = toObject(source.meta);

  const currentPage = toNumberValue(meta.current_page) ?? toNumberValue(source.current_page) ?? 1;
  const perPage =
    toNumberValue(meta.per_page) ?? toNumberValue(source.per_page) ?? (fallbackCount > 0 ? fallbackCount : 12);
  const total = toNumberValue(meta.total) ?? toNumberValue(source.total) ?? fallbackCount;
  const lastPage =
    toNumberValue(meta.last_page) ??
    toNumberValue(source.last_page) ??
    Math.max(1, Math.ceil(total / Math.max(1, perPage)));

  return {
    current_page: currentPage,
    last_page: lastPage,
    total,
    per_page: perPage,
  };
};

const extractReviewMeta = (
  payload: unknown,
  fallbackSummary: ProductReviewSummary,
  fallbackCount: number
): ProductReviewResponse["meta"] => {
  const source = toObject(payload);
  const meta = toObject(source.meta);

  const currentPage = toNumberValue(meta.current_page) ?? 1;
  const perPage = toNumberValue(meta.per_page) ?? fallbackCount;
  const total = toNumberValue(meta.total) ?? fallbackCount;
  const lastPage = toNumberValue(meta.last_page) ?? Math.max(1, Math.ceil(total / Math.max(1, perPage || 1)));

  return {
    current_page: currentPage,
    last_page: lastPage,
    total,
    per_page: perPage,
    summary: resolveReviewSummary(meta.summary, fallbackSummary.average_rating),
  };
};

const findBestSlugMatch = (rows: unknown[], slug: string): JsonRecord | null => {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) return null;

  const mapped = rows.map((row) => toObject(row));

  const exact = mapped.find((row) => {
    const rowSlug = toStringValue(row.slug);
    if (rowSlug && slugify(rowSlug) === normalizedSlug) return true;

    const rowName = toStringValue(row.name);
    return rowName ? slugify(rowName) === normalizedSlug : false;
  });
  if (exact) return exact;

  const fuzzy = mapped.find((row) => {
    const rowSlug = toStringValue(row.slug);
    if (!rowSlug) return false;

    const normalizedRowSlug = slugify(rowSlug);
    return (
      normalizedSlug.startsWith(normalizedRowSlug) ||
      normalizedRowSlug.startsWith(normalizedSlug)
    );
  });
  if (fuzzy) return fuzzy;

  return null;
};

const resolveProductBySlugFromListing = async (slug: string): Promise<JsonRecord | null> => {
  const normalizedSlug = slugify(slug);
  if (!normalizedSlug) return null;

  const fetchRows = async (search?: string): Promise<unknown[]> => {
    const response = await client.get(PRODUCT_ENDPOINTS.list, {
      params: {
        per_page: 20,
        apply_visible: 1,
        search,
      },
      timeout: 120000,
    });

    return extractProductRows(response.data);
  };

  const searchSeed = normalizedSlug.replace(/-/g, " ");
  const searchedRows = await fetchRows(searchSeed);
  const fromSearchRows = findBestSlugMatch(searchedRows, normalizedSlug);
  if (fromSearchRows) return fromSearchRows;

  const fallbackRows = await fetchRows();
  const fromFallbackRows = findBestSlugMatch(fallbackRows, normalizedSlug);
  if (fromFallbackRows) return fromFallbackRows;

  return null;
};

const mapCategory = (raw: unknown): Category => {
  const row = toObject(raw);
  const name = toStringValue(row.name) ?? "Kategori";
  const slug = toStringValue(row.slug) ?? (slugify(name) || "kategori");
  const id = toStringValue(row.id) ?? slug;

  return {
    id,
    name,
    slug,
    product_count: toNumberValue(row.product_count) ?? 0,
    icon: toStringValue(row.icon) ?? undefined,
  };
};

const mapBrand = (raw: unknown): Brand => {
  const row = toObject(raw);
  const name = toStringValue(row.name) ?? "Unknown Brand";
  const slug = toStringValue(row.slug) ?? (slugify(name) || "unknown-brand");
  const id = toStringValue(row.id) ?? slug;

  return {
    id,
    name,
    slug,
    product_count: toNumberValue(row.product_count) ?? 0,
    logo: toStringValue(row.logo) ?? toStringValue(row.image) ?? undefined,
  };
};

const fetchProductCollection = async (
  endpoint: "/v1/products" | "/v1/products/load-more",
  filters?: ProductFilters
): Promise<ProductApiResponse> => {
  const params = {
    ...filters,
    categories: toCsvParam(filters?.categories),
    brands: toCsvParam(filters?.brands),
    ratings: toCsvParam(filters?.ratings),
    trade_in: filters?.trade_in ? 1 : undefined,
  };

  const response = await client.get(endpoint, {
    params,
    timeout: 120000,
  });
  const rows = extractProductRows(response.data);
  const filteredRows = filters?.trade_in ? rows.filter((row) => resolveTradeIn(toObject(row))) : rows;
  const products = filteredRows.map(mapProduct);
  const meta = extractMeta(response.data, products.length);

  return {
    success: true,
    data: products,
    meta: {
      ...meta,
      filters,
    },
  } satisfies ProductApiResponse;
};

export const productsApi = {
  getProducts: async (filters?: ProductFilters) => {
    return fetchProductCollection("/v1/products", filters);
  },

  loadMoreProducts: async (filters?: ProductFilters) => {
    return fetchProductCollection("/v1/products/load-more", filters);
  },

  getProductBySlug: async (slug: string): Promise<ProductDetail> => {
    try {
      const response = await client.get(PRODUCT_ENDPOINTS.detail(slug), {
        timeout: 120000,
      });
      const payload = toObject(response.data);
      const row = payload.data ?? payload;

      return mapProductDetail(row);
    } catch (error) {
      const fallback = await resolveProductBySlugFromListing(slug);
      if (fallback) {
        return mapProductDetail(fallback);
      }

      throw error;
    }
  },

  getProductReviews: async (
    productId: string,
    params?: ProductReviewQuery
  ): Promise<ProductReviewResponse> => {
    const fallbackSummary: ProductReviewSummary = {
      average_rating: 0,
      total_count: 0,
      distribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    };

    try {
      const response = await client.get(PRODUCT_ENDPOINTS.reviews(productId), {
        params,
        timeout: 5000,
      });
      const payload = toObject(response.data);
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const reviews = rows.map(mapReview);

      return {
        success: payload.success !== false,
        data: reviews,
        meta: extractReviewMeta(payload, fallbackSummary, reviews.length),
      };
    } catch (error) {
      if (isAxiosError(error)) {
        return {
          success: true,
          data: [],
          meta: {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 0,
            summary: fallbackSummary,
          },
        };
      }

      throw error;
    }
  },

  getSearchSuggestions: async (search: string, limit = 6): Promise<ProductSearchSuggestionResponse> => {
    const response = await client.get(PRODUCT_ENDPOINTS.suggestions, {
      params: {
        search,
        limit,
      },
      timeout: 120000,
    });

    const payload = toObject(response.data);
    const rows = extractProductRows(payload);
    const meta = toObject(payload.meta);
    const keywords = Array.isArray(meta.keywords)
      ? meta.keywords
          .map((item) => toStringValue(item))
          .filter((item): item is string => Boolean(item))
      : [];

    return {
      success: payload.success !== false,
      data: rows.map(mapProduct),
      meta: {
        keywords,
      },
    };
  },

  addToCart: async (productId: string, quantity: number, variant?: Record<string, string>) => {
    const response = await client.post(PRODUCT_ENDPOINTS.addToCart, {
      product_id: productId,
      quantity,
      variant,
    });

    return response.data as ApiSuccessResponse<unknown>;
  },

  getCategories: async (options?: { limit?: number; timeout?: number }) => {
    const response = await client.get(PRODUCT_ENDPOINTS.categories, {
      params: {
        limit: options?.limit,
      },
      timeout: options?.timeout ?? 30000,
    });
    const payload = toObject(response.data);
    const rows = Array.isArray(payload.data) ? payload.data : [];

    return {
      success: payload.success !== false,
      data: rows.map(mapCategory),
    } satisfies ApiSuccessResponse<Category[]>;
  },

  getBrands: async () => {
    const response = await client.get(PRODUCT_ENDPOINTS.brands);
    const payload = toObject(response.data);
    const rows = Array.isArray(payload.data) ? payload.data : [];

    return {
      success: payload.success !== false,
      data: rows.map(mapBrand),
    } satisfies ApiSuccessResponse<Brand[]>;
  },

  toggleWishlist: async (productId: string, nextIsWishlisted: boolean) => {
    try {
      const response = await client.post<WishlistToggleResponse>(PRODUCT_ENDPOINTS.toggleWishlist(productId));
      return response.data;
    } catch (error) {
      if (isAxiosError(error) && (!error.response || [401, 403, 404, 405].includes(error.response.status))) {
        return {
          success: true,
          message: "Wishlist updated locally.",
          is_wishlisted: nextIsWishlisted,
        } satisfies WishlistToggleResponse;
      }

      throw error;
    }
  },
};
