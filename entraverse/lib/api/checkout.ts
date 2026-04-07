import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { CHECKOUT_ENDPOINTS, PRODUCT_ENDPOINTS, SHIPPING_ENDPOINTS } from "@/lib/constants";
import type {
  CheckoutOrder,
  CheckoutOrderItem,
  CheckoutProcessPayload,
  CheckoutProcessResult,
  CheckoutShippingOption,
  CheckoutTradeInTransactionSummary,
  ProductSnapshot,
  ShippingCostPayload,
  ShippingCostResult,
} from "@/types/checkout.types";
import type { ProductVariantPricingRow } from "@/types/product.types";

export type {
  CheckoutOrder,
  CheckoutOrderItem,
  CheckoutProcessItemPayload,
  CheckoutProcessPayload,
  CheckoutProcessResult,
  CheckoutShippingOption,
  CheckoutTradeInTransactionSummary,
  ProductSnapshot,
  ShippingCostPayload,
  ShippingCostResult,
} from "@/types/checkout.types";

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

const toNumberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const mapVariantPricingRow = (raw: unknown): ProductVariantPricingRow | null => {
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
    stock: toNumberValue(row.stock) || undefined,
    item_weight: toNumberValue(row.item_weight) || undefined,
    offline_price: toNumberValue(row.offline_price) || undefined,
    entraverse_price: toNumberValue(row.entraverse_price) || undefined,
    tokopedia_price: toNumberValue(row.tokopedia_price) || undefined,
    shopee_price: toNumberValue(row.shopee_price) || undefined,
  };
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  if (!isAxiosError(error)) return "Terjadi kesalahan saat memproses checkout.";

  const payload = toObject(error.response?.data);
  const errors = toObject(payload.errors);
  for (const value of Object.values(errors)) {
    if (Array.isArray(value) && value.length > 0) {
      const message = toStringValue(value[0]);
      if (message) return message;
    }
  }

  const directMessage = toStringValue(payload.message);
  if (directMessage) return directMessage;

  return "Terjadi kesalahan saat memproses checkout.";
};

const normalizeError = (err: unknown, fallback: string): never => {
  if (isAxiosError(err)) {
    throw new Error(err.response?.data?.message ?? fallback);
  }

  throw err;
};

const mapShippingOption = (raw: unknown): CheckoutShippingOption | null => {
  const row = toObject(raw);
  const service = toStringValue(row.service);
  if (!service) return null;

  return {
    service,
    description: toStringValue(row.description),
    cost: Math.max(0, Math.round(toNumberValue(row.cost))),
    etd: toStringValue(row.etd),
    note: toStringValue(row.note),
  };
};

const mapCheckoutOrder = (raw: unknown): CheckoutOrder => {
  const row = toObject(raw);
  const items = Array.isArray(row.items) ? row.items : [];

  return {
    id: toStringValue(row.id) ?? "",
    orderNumber: toStringValue(row.order_number) ?? "",
    status: toStringValue(row.status) ?? "",
    paymentStatus: toStringValue(row.payment_status) ?? "pending",
    subtotal: toNumberValue(row.subtotal),
    discountAmount: toNumberValue(row.discount_amount),
    shippingCost: toNumberValue(row.shipping_cost),
    totalAmount: toNumberValue(row.total_amount),
    shippingCourier: toStringValue(row.shipping_courier),
    shippingService: toStringValue(row.shipping_service),
    shippingEtd: toStringValue(row.shipping_etd),
    shippingWeight: Math.max(1, Math.round(toNumberValue(row.shipping_weight) || 1)),
    items: items.map((item) => {
      const itemRow = toObject(item);

      return {
        id: toStringValue(itemRow.id) ?? "",
        productId: toStringValue(itemRow.product_id) ?? "",
        productName: toStringValue(itemRow.product_name) ?? "Produk",
        variantName: toStringValue(itemRow.variant_name),
        variantSku: toStringValue(itemRow.variant_sku) ?? "",
        quantity: Math.max(1, Math.round(toNumberValue(itemRow.quantity) || 1)),
        unitPrice: toNumberValue(itemRow.unit_price),
        lineTotal: toNumberValue(itemRow.line_total),
      } satisfies CheckoutOrderItem;
    }),
  };
};

const mapTradeInTransactionSummary = (raw: unknown): CheckoutTradeInTransactionSummary | null => {
  const row = toObject(raw);
  const id = toStringValue(row.id);
  const transactionNumber = toStringValue(row.transaction_number);
  const status = toStringValue(row.status);

  if (!id || !transactionNumber || !status) {
    return null;
  }

  return {
    id,
    transactionNumber,
    status,
    tradeInOnly: Boolean(row.trade_in_only),
    estimatedAmount: toNumberValue(row.estimated_amount),
    requestedProductName: toStringValue(row.requested_product_name),
    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at),
  };
};

export const checkoutApi = {
  async getShippingCost(payload: ShippingCostPayload): Promise<ShippingCostResult> {
    try {
      const response = await client.post(SHIPPING_ENDPOINTS.cost, payload);
      const source = toObject(response.data);
      const data = toObject(source.data);
      const options = Array.isArray(data.options) ? data.options : [];

      return {
        courier: toStringValue(data.courier) ?? payload.courier,
        destinationCityId: toStringValue(data.destination_city_id) ?? payload.city_id ?? "",
        destinationDistrictId: toStringValue(data.destination_district_id),
        itemWeight: Math.max(0, Math.round(toNumberValue(data.item_weight))),
        packagingWeight: Math.max(0, Math.round(toNumberValue(data.packaging_weight))),
        weight: Math.max(1, Math.round(toNumberValue(data.weight) || toNumberValue(payload.weight) || 1)),
        strictMode: Boolean(data.strict_mode),
        options: options
          .map(mapShippingOption)
          .filter((item): item is CheckoutShippingOption => item !== null),
      };
    } catch (error) {
      return normalizeError(error, extractErrorMessage(error));
    }
  },

  async processCheckout(payload: CheckoutProcessPayload): Promise<CheckoutProcessResult> {
    try {
      const response = await client.post(CHECKOUT_ENDPOINTS.process, payload);
      const source = toObject(response.data);
      const data = toObject(source.data);
      const tradeInTransactions = (Array.isArray(data.trade_in_transactions) ? data.trade_in_transactions : [])
        .map(mapTradeInTransactionSummary)
        .filter((item): item is CheckoutTradeInTransactionSummary => item !== null);
      const primaryTradeIn = tradeInTransactions[0] ?? null;
      const shipping = mapShippingOption(data.shipping) ?? {
        service: payload.service ?? "",
        description: null,
        cost: 0,
        etd: null,
        note: null,
      };

      return {
        entryKind: (toStringValue(data.entry_kind) ?? "sales_order") as "sales_order" | "trade_in",
        requiresPayment: Boolean(data.requires_payment ?? true),
        order: mapCheckoutOrder(
          data.order ?? {
            id: primaryTradeIn?.id ?? "",
            order_number: primaryTradeIn?.transactionNumber ?? "",
            status: primaryTradeIn?.status ?? "",
            payment_status: "not_required",
            subtotal: 0,
            discount_amount: 0,
            shipping_cost: 0,
            total_amount: 0,
            items: [],
          }
        ),
        tradeInTransactions,
        snapToken: toStringValue(data.snap_token) ?? "",
        snapRedirectUrl: toStringValue(data.snap_redirect_url),
        midtransClientKey: toStringValue(data.midtrans_client_key) ?? "",
        midtransSnapJsUrl:
          toStringValue(data.midtrans_snap_js_url) ?? "https://app.sandbox.midtrans.com/snap/snap.js",
        shipping,
        shippingWeight: Math.max(1, Math.round(toNumberValue(data.shipping_weight) || 1)),
      };
    } catch (error) {
      return normalizeError(error, extractErrorMessage(error));
    }
  },

  async getProductSnapshot(productId: string): Promise<ProductSnapshot> {
    try {
      const response = await client.get(PRODUCT_ENDPOINTS.detail(productId));
      const source = toObject(response.data);
      const data = toObject(source.data);
      const inventory = toObject(data.inventory);

      return {
        id: toStringValue(data.id) ?? productId,
        name: toStringValue(data.name) ?? "Produk",
        price: toNumberValue(data.price) || toNumberValue(inventory.price),
        stock: Math.max(0, Math.round(toNumberValue(data.stock) || toNumberValue(inventory.total_stock))),
        weight: Math.max(1, Math.round(toNumberValue(inventory.weight) || toNumberValue(data.weight) || 1)),
        image:
          toStringValue(data.main_image) ??
          (Array.isArray(data.photos) && data.photos.length > 0
            ? toStringValue(toObject(data.photos[0]).url) ?? "/assets/images/hero/e-hero.png"
            : "/assets/images/hero/e-hero.png"),
        variant_pricing: (Array.isArray(data.variant_pricing) ? data.variant_pricing : [])
          .map(mapVariantPricingRow)
          .filter((item): item is ProductVariantPricingRow => item !== null),
      };
    } catch (error) {
      return normalizeError(error, "Gagal mengambil data master produk.");
    }
  },
};
