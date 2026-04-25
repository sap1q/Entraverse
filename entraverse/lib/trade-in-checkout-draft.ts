import type { CartItem, CartVariantMap } from "@/types/cart.types";

const TRADE_IN_CHECKOUT_DRAFT_KEY = "entraverse_trade_in_checkout_draft";

type JsonRecord = Record<string, unknown>;

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

const toNumberValue = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizeVariantMap = (value: unknown): CartVariantMap => {
  const source = toObject(value);

  return Object.entries(source).reduce<CartVariantMap>((result, [name, option]) => {
    const normalizedName = name.trim();
    const normalizedOption = toStringValue(option);

    if (!normalizedName || !normalizedOption) {
      return result;
    }

    result[normalizedName] = normalizedOption;
    return result;
  }, {});
};

const normalizeDraft = (value: unknown): CartItem | null => {
  const row = toObject(value);
  const productId = toStringValue(row.productId ?? row.product_id);
  const name = toStringValue(row.name);
  const image = toStringValue(row.image);
  const tradeInTransactionId = toStringValue(
    row.tradeInTransactionId ?? row.trade_in_transaction_id
  );

  if (!productId || !name || !image || !tradeInTransactionId) {
    return null;
  }

  const quantity = Math.max(1, Math.floor(toNumberValue(row.quantity, 1)));
  const minOrder = Math.max(1, Math.floor(toNumberValue(row.minOrder ?? row.min_order, 1)));
  const stock = Math.max(quantity, Math.floor(toNumberValue(row.stock, quantity)));
  const tradeInValue = Math.max(0, toNumberValue(row.tradeInValue ?? row.trade_in_value, 0));
  const tradeInUnitValue = Math.max(
    0,
    toNumberValue(row.tradeInUnitValue ?? row.trade_in_unit_value, tradeInValue / quantity)
  );
  const price = Math.max(0, toNumberValue(row.price, 0));
  const displayPrice = Math.max(0, toNumberValue(row.displayPrice ?? row.display_price, price));

  return {
    id:
      toStringValue(row.id) ??
      `draft:${productId}:${tradeInTransactionId}`,
    productId,
    name,
    slug: toStringValue(row.slug) ?? undefined,
    image,
    price,
    displayPrice,
    variantSku: toStringValue(row.variantSku ?? row.variant_sku) ?? undefined,
    quantity,
    stock,
    minOrder,
    selected: row.selected === undefined ? true : Boolean(row.selected),
    variants: normalizeVariantMap(row.variants),
    tradeInEnabled: true,
    tradeInValue,
    tradeInUnitValue,
    tradeInTransactionId,
    tradeInTransactionNumber:
      toStringValue(row.tradeInTransactionNumber ?? row.trade_in_transaction_number) ?? undefined,
  };
};

export const savePendingTradeInCheckoutDraft = (draft: CartItem): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRADE_IN_CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
};

export const loadPendingTradeInCheckoutDraft = (): CartItem | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(TRADE_IN_CHECKOUT_DRAFT_KEY);
    if (!raw) return null;

    return normalizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const clearPendingTradeInCheckoutDraft = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TRADE_IN_CHECKOUT_DRAFT_KEY);
};
