import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { CART_ENDPOINTS } from "@/lib/constants";
import type { CartApiResponse, CartItem } from "@/types/cart.types";

type JsonRecord = Record<string, unknown>;

export type CartApiItem = CartItem;

const CART_PLACEHOLDER_IMAGE = "/assets/images/hero/e-hero.png";
const CART_API_ENABLED = process.env.NEXT_PUBLIC_ENABLE_CART_API === "true";

let cartBackendAvailability: "unknown" | "available" | "missing" = "unknown";
const preferredAttemptIndexByKey: Record<string, number> = {};

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
    const normalized = value.replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return false;
};

const normalizePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Math.floor(toNumberValue(value) ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
};

const normalizeVariantMap = (raw: unknown): Record<string, string> => {
  const fromObject = (value: JsonRecord): Record<string, string> => {
    const result: Record<string, string> = {};
    Object.entries(value).forEach(([key, option]) => {
      const normalizedOption = toStringValue(option);
      if (!normalizedOption) return;

      const normalizedKey = key.trim();
      if (!normalizedKey) return;
      result[normalizedKey] = normalizedOption;
    });
    return result;
  };

  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, string>>((result, entry) => {
      const row = toObject(entry);
      const name = toStringValue(row.name) ?? toStringValue(row.label);
      const value = toStringValue(row.value) ?? toStringValue(row.option);
      if (!name || !value) return result;
      result[name] = value;
      return result;
    }, {});
  }

  return fromObject(toObject(raw));
};

const extractVariantMap = (row: JsonRecord, product: JsonRecord): Record<string, string> => {
  const candidates = [
    row.variant,
    row.variants,
    row.selected_variant,
    row.selected_variants,
    product.variant,
    product.variants,
  ];

  for (const candidate of candidates) {
    const mapped = normalizeVariantMap(candidate);
    if (Object.keys(mapped).length > 0) return mapped;
  }

  return {};
};

const buildVariantKey = (variants: Record<string, string>): string => {
  return Object.entries(variants)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
};

const buildTradeInLineKey = (tradeInTransactionId?: string | null, tradeInEnabled?: boolean): string => {
  const normalizedTransactionId = toStringValue(tradeInTransactionId);
  if (normalizedTransactionId) {
    return `trade-in:${normalizedTransactionId}`;
  }

  return tradeInEnabled ? "trade-in:pending" : "standard";
};

const resolveCartRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const source = toObject(payload);
  const directData = source.data;
  if (Array.isArray(directData)) return directData;

  const dataObject = toObject(directData);
  const candidates = [
    dataObject.items,
    dataObject.cart_items,
    dataObject.cart,
    source.items,
    source.cart_items,
    source.cart,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    const candidateObject = toObject(candidate);
    if (Array.isArray(candidateObject.items)) return candidateObject.items;
  }

  return [];
};

const mapCartItem = (raw: unknown): CartApiItem | null => {
  const row = toObject(raw);
  const product = toObject(row.product);

  const variants = extractVariantMap(row, product);
  const variantKey = buildVariantKey(variants);
  const tradeInEnabled = toBooleanValue(row.trade_in_enabled ?? row.is_trade_in);
  const tradeInTransactionId =
    toStringValue(row.trade_in_transaction_id) ??
    toStringValue(toObject(row.metadata).trade_in_transaction_id) ??
    null;
  const lineKey = buildTradeInLineKey(tradeInTransactionId, tradeInEnabled);

  const productId =
    toStringValue(row.product_id) ??
    toStringValue(product.id) ??
    toStringValue(product.uuid) ??
    null;
  const id =
    toStringValue(row.id) ??
    toStringValue(row.item_id) ??
    toStringValue(row.cart_item_id) ??
    (productId ? `${productId}:${variantKey || "default"}:${lineKey}` : null);
  const name =
    toStringValue(row.name) ??
    toStringValue(row.product_name) ??
    toStringValue(product.name) ??
    null;

  if (!id || !productId || !name) return null;

  const price =
    toNumberValue(row.price) ??
    toNumberValue(row.unit_price) ??
    toNumberValue(row.product_price) ??
    toNumberValue(product.price) ??
    0;
  const displayPrice =
    toNumberValue(row.display_price) ??
    toNumberValue(row.entraverse_price) ??
    toNumberValue(product.entraverse_price) ??
    price;
  const quantity = Math.max(1, normalizePositiveInt(row.quantity ?? row.qty, 1));
  const stock =
    normalizePositiveInt(
      row.stock ?? row.available_stock ?? row.stock_available ?? row.max_quantity ?? product.stock,
      Number.MAX_SAFE_INTEGER
    ) || Number.MAX_SAFE_INTEGER;
  const minOrder = Math.max(
    1,
    normalizePositiveInt(row.min_order ?? product.min_order, 1)
  );
  const selected = row.selected === undefined ? true : toBooleanValue(row.selected ?? row.is_selected);
  const tradeInTransactionNumber =
    toStringValue(row.trade_in_transaction_number) ??
    toStringValue(toObject(row.metadata).trade_in_transaction_number) ??
    null;
  const tradeInUnitValue =
    toNumberValue(row.trade_in_per_item) ??
    toNumberValue(row.trade_in_value_per_unit) ??
    0;
  const tradeInValue =
    toNumberValue(row.trade_in_discount) ??
    toNumberValue(row.trade_in_value) ??
    toNumberValue(row.trade_in_amount) ??
    (tradeInUnitValue > 0 ? tradeInUnitValue * quantity : 0);

  return {
    id,
    productId,
    name,
    slug: toStringValue(row.slug) ?? toStringValue(row.product_slug) ?? toStringValue(product.slug) ?? undefined,
    image:
      toStringValue(row.image) ??
      toStringValue(row.product_image) ??
      toStringValue(row.thumbnail) ??
      toStringValue(product.image) ??
      CART_PLACEHOLDER_IMAGE,
    price: Math.max(0, price),
    displayPrice: Math.max(0, displayPrice),
    variantSku:
      toStringValue(row.variant_sku) ??
      toStringValue(row.sku) ??
      toStringValue(toObject(row.variant).sku) ??
      undefined,
    quantity,
    stock: Math.max(1, stock),
    minOrder,
    selected,
    variants,
    tradeInEnabled: tradeInEnabled || tradeInTransactionId !== null,
    tradeInValue: Math.max(0, tradeInValue),
    tradeInUnitValue: Math.max(0, tradeInUnitValue),
    tradeInTransactionId: tradeInTransactionId ?? undefined,
    tradeInTransactionNumber: tradeInTransactionNumber ?? undefined,
  };
};

const parseResponseMessage = (payload: unknown): string | undefined => {
  const source = toObject(payload);
  return (
    toStringValue(source.message) ??
    toStringValue(toObject(source.meta).message) ??
    undefined
  );
};

const parseCartResponse = (payload: unknown): CartApiResponse => {
  const source = toObject(payload);
  const mappedItems = resolveCartRows(payload)
    .map(mapCartItem)
    .filter((item): item is CartApiItem => item !== null);

  const rawItem = toObject(toObject(payload).data).item ?? source.item;
  const mappedItem = mapCartItem(rawItem);

  return {
    success: source.success !== false,
    message: parseResponseMessage(payload),
    items: mappedItems,
    item: mappedItem ?? undefined,
  };
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  if (!isAxiosError(error)) return "Gagal memproses keranjang.";

  const payload = error.response?.data as unknown;
  const payloadObject = toObject(payload);
  const directMessage = toStringValue(payloadObject.message);
  if (directMessage) return directMessage;

  const errors = toObject(payloadObject.errors);
  const firstError = Object.values(errors)[0];
  if (Array.isArray(firstError) && firstError.length > 0) {
    const message = toStringValue(firstError[0]);
    if (message) return message;
  }

  return "Gagal memproses keranjang.";
};

const normalizeError = (err: unknown, fallback: string): never => {
  if (isAxiosError(err)) {
    throw new Error(err.response?.data?.message ?? fallback);
  }

  throw err;
};

const isEndpointMissingError = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  return error.response?.status === 404 || error.response?.status === 405;
};

const requestWithFallback = async <T>(
  attempts: Array<() => Promise<T>>,
  key: string
): Promise<{ data: T; localOnly: false } | { data: null; localOnly: true }> => {
  if (!CART_API_ENABLED) {
    return { data: null, localOnly: true };
  }

  if (cartBackendAvailability === "missing") {
    return { data: null, localOnly: true };
  }

  const preferredIndex = preferredAttemptIndexByKey[key] ?? 0;
  const candidateIndexes = [
    preferredIndex,
    ...attempts.map((_, index) => index).filter((index) => index !== preferredIndex),
  ];

  let lastError: unknown = null;

  for (const index of candidateIndexes) {
    const attempt = attempts[index];
    if (!attempt) continue;

    try {
      const response = await attempt();
      cartBackendAvailability = "available";
      preferredAttemptIndexByKey[key] = index;
      return { data: response, localOnly: false };
    } catch (error) {
      if (isEndpointMissingError(error)) {
        lastError = error;
        continue;
      }
      return normalizeError(error, "Gagal memproses keranjang.");
    }
  }

  if (lastError) {
    cartBackendAvailability = "missing";
    return { data: null, localOnly: true };
  }

  return { data: null, localOnly: true };
};

const asSuccessResponse = (message: string): CartApiResponse => {
  return {
    success: true,
    message,
    items: [],
    localOnly: true,
  };
};

export const cartApi = {
  getCart: async (): Promise<CartApiResponse> => {
    try {
      const resolved = await requestWithFallback([
        () => client.get(CART_ENDPOINTS.list[0]),
        () => client.get(CART_ENDPOINTS.list[1]),
      ], "getCart");

      if (resolved.localOnly || !resolved.data) {
        return asSuccessResponse("Sinkronisasi keranjang backend belum tersedia.");
      }

      const parsed = parseCartResponse(resolved.data.data);
      return { ...parsed, localOnly: false };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
        items: [],
      };
    }
  },

  addItem: async (
    productId: string,
    quantity: number,
    variant?: Record<string, string>
  ): Promise<CartApiResponse> => {
    try {
      const resolved = await requestWithFallback([
        () => client.post(CART_ENDPOINTS.add[0], { product_id: productId, quantity, variant }),
        () => client.post(CART_ENDPOINTS.add[1], { product_id: productId, quantity, variant }),
        () => client.post(CART_ENDPOINTS.add[2], { product_id: productId, quantity, variant }),
      ], "addItem");

      if (resolved.localOnly || !resolved.data) {
        return asSuccessResponse("Perubahan disimpan lokal.");
      }

      const parsed = parseCartResponse(resolved.data.data);
      return { ...parsed, localOnly: false };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
        items: [],
      };
    }
  },

  updateItemQuantity: async (
    itemId: string,
    quantity: number,
    productId?: string
  ): Promise<CartApiResponse> => {
    try {
      const payload = { item_id: itemId, product_id: productId, quantity };
      const resolved = await requestWithFallback([
        () => client.patch(CART_ENDPOINTS.update(itemId)[0], { quantity }),
        () => client.patch(CART_ENDPOINTS.update(itemId)[1], { quantity }),
        () => client.patch(CART_ENDPOINTS.updateLegacy, payload),
      ], "updateItemQuantity");

      if (resolved.localOnly || !resolved.data) {
        return asSuccessResponse("Perubahan disimpan lokal.");
      }

      const parsed = parseCartResponse(resolved.data.data);
      return { ...parsed, localOnly: false };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
        items: [],
      };
    }
  },

  removeItem: async (itemId: string, productId?: string): Promise<CartApiResponse> => {
    try {
      const resolved = await requestWithFallback([
        () => client.delete(CART_ENDPOINTS.remove(itemId)[0]),
        () => client.delete(CART_ENDPOINTS.remove(itemId)[1]),
        () =>
          client.delete(CART_ENDPOINTS.removeLegacy, {
            data: { item_id: itemId, product_id: productId },
          }),
      ], "removeItem");

      if (resolved.localOnly || !resolved.data) {
        return asSuccessResponse("Perubahan disimpan lokal.");
      }

      const parsed = parseCartResponse(resolved.data.data);
      return { ...parsed, localOnly: false };
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error),
        items: [],
      };
    }
  },
};
