import api, { ensureCsrfCookie, isAxiosError } from "@/lib/axios";
import { resolveApiAssetUrl } from "@/lib/utils/media";

type JsonRecord = Record<string, unknown>;

export type CustomerOrderFilterKey = "all" | "ongoing" | "success" | "cancelled";

export type CustomerOrderProgressStage = {
  step: number;
  code: string;
  label: string;
};

export type CustomerOrderFilterOption = {
  key: string;
  label: string;
};

export type CustomerOrderItem = {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  variantSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productImage: string | null;
  tradeInEnabled: boolean;
  tradeInTransactionId: string | null;
  tradeInEstimatedAmount: number | null;
};

export type CustomerOrderPrimaryItem = {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  variantSku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  productImage: string | null;
  tradeInEnabled: boolean;
  tradeInTransactionId: string | null;
  tradeInEstimatedAmount: number | null;
};

export type CustomerOrderPaymentDetails = {
  statusLabel: string;
  isPending: boolean;
  paymentType: string | null;
  methodCode: string | null;
  methodLabel: string;
  channelCode: string | null;
  channelLabel: string | null;
  accountLabel: string | null;
  accountNumber: string | null;
  secondaryLabel: string | null;
  secondaryValue: string | null;
  expiryTime: string | null;
  totalAmount: number;
  pdfUrl: string | null;
  statusMessage: string | null;
  canResumePayment: boolean;
  instructions: string[];
};

export type CustomerOrderTradeInStoreOrigin = {
  label: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  fullAddress: string | null;
  locationNote: string | null;
};

export type CustomerOrder = {
  id: string;
  kind: "sales_order" | "trade_in";
  orderNumber: string;
  invoiceNumber: string | null;
  status: string;
  statusStageCode: string;
  statusStep: number;
  statusLabel: string;
  statusGroup: string;
  progressStages: CustomerOrderProgressStage[];
  requiresPayment: boolean;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentMethodLabel: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  shippingCourier: string | null;
  shippingService: string | null;
  shippingEtd: string | null;
  canTrackPackage: boolean;
  trackingNumber: string | null;
  trackingUrl: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  canResumePayment: boolean;
  canConfirmReceived: boolean;
  hasTradeIn: boolean;
  tradeInTransactionNumber: string | null;
  tradeInStatus: string | null;
  tradeInFulfillmentMethod: string | null;
  tradeInShipmentTrackingNumber: string | null;
  tradeInStoreOrigin: CustomerOrderTradeInStoreOrigin | null;
  paymentDetails: CustomerOrderPaymentDetails | null;
  primaryItem: CustomerOrderPrimaryItem | null;
  items: CustomerOrderItem[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CustomerOrderListResult = {
  items: CustomerOrder[];
  filters: {
    active: string;
    items: CustomerOrderFilterOption[];
  };
  statusCatalog: {
    steps: CustomerOrderProgressStage[];
  };
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
  };
};

export type CustomerOrderPaymentResult = {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string | null;
  paymentStatus: string;
  status: string;
  statusStep: number;
  totalAmount: number;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  midtransClientKey: string;
  midtransSnapJsUrl: string;
  paymentDetails: CustomerOrderPaymentDetails | null;
};

const SUCCESS_ORDER_STAGE_CODES = new Set(["completed"]);
const TRACKABLE_ORDER_STAGE_CODES = new Set(["order_shipped", "order_delivered"]);
const CANCELLABLE_ORDER_STAGE_CODES = new Set(["waiting_payment", "waiting_confirmation"]);
const CANCELLABLE_TRADE_IN_STAGE_CODES = new Set(["trade_in_review", "trade_in_accepted"]);

const DEFAULT_PROGRESS_STAGES: CustomerOrderProgressStage[] = [
  { step: 1, code: "waiting_payment", label: "Menunggu Pembayaran" },
  { step: 2, code: "waiting_confirmation", label: "Dikonfirmasi" },
  { step: 3, code: "order_shipped", label: "Pesanan Dikirim" },
  { step: 4, code: "order_delivered", label: "Pesanan Terkirim" },
  { step: 5, code: "completed", label: "Selesai" },
];

const DEFAULT_FILTERS: CustomerOrderFilterOption[] = [
  { key: "all", label: "Semua" },
  { key: "ongoing", label: "Berlangsung" },
  { key: "success", label: "Berhasil" },
  { key: "cancelled", label: "Dibatalkan" },
];

const FAILED_PAYMENT_STATUSES = new Set(["deny", "cancel", "cancelled", "expire", "expired", "failure", "failed"]);
const SUCCESS_PAYMENT_STATUSES = new Set(["settlement", "capture", "paid"]);

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
    const normalized = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(normalized)) return normalized;
  }
  return 0;
};

const toBooleanValue = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return null;
};

const clampStep = (value: number): number => {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded < 1) return 1;
  return rounded;
};

const resolvePaymentMethodLabelFallback = (paymentMethod: string | null): string => {
  const normalized = (paymentMethod ?? "").trim().toLowerCase();
  if (!normalized) return "Belum dipilih";

  const map: Record<string, string> = {
    midtrans_snap: "Midtrans Snap",
    bank_transfer: "Transfer Bank",
    credit_card: "Kartu Kredit",
    debit_card: "Kartu Debit",
    echannel: "Mandiri Bill",
    permata_va: "Permata Virtual Account",
    bca_va: "BCA Virtual Account",
    bni_va: "BNI Virtual Account",
    bri_va: "BRI Virtual Account",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    qris: "QRIS",
  };

  if (map[normalized]) return map[normalized];
  return normalized.replace(/[_-]+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
};

const resolveStatusFallback = (
  status: string,
  paymentStatus: string
): {
  statusStageCode: string;
  statusStep: number;
  statusLabel: string;
  statusGroup: string;
  canTrackPackage: boolean;
} => {
  const normalizedStatus = status.trim().toLowerCase();
  const normalizedPaymentStatus = paymentStatus.trim().toLowerCase();

  if (normalizedStatus === "dibatalkan" || FAILED_PAYMENT_STATUSES.has(normalizedPaymentStatus)) {
    return {
      statusStageCode: "cancelled",
      statusStep: 1,
      statusLabel: "Dibatalkan",
      statusGroup: "cancelled",
      canTrackPackage: false,
    };
  }

  if (normalizedStatus === "selesai") {
    return {
      statusStageCode: "completed",
      statusStep: 5,
      statusLabel: "Selesai",
      statusGroup: "success",
      canTrackPackage: true,
    };
  }

  if (normalizedStatus === "terkirim") {
    return {
      statusStageCode: "order_delivered",
      statusStep: 4,
      statusLabel: "Pesanan Terkirim",
      statusGroup: "ongoing",
      canTrackPackage: true,
    };
  }

  if (normalizedStatus === "dikirim") {
    return {
      statusStageCode: "order_shipped",
      statusStep: 3,
      statusLabel: "Pesanan Dikirim",
      statusGroup: "ongoing",
      canTrackPackage: true,
    };
  }

  if (normalizedStatus === "diproses") {
    return {
      statusStageCode: "waiting_confirmation",
      statusStep: 2,
      statusLabel: "Diproses",
      statusGroup: "ongoing",
      canTrackPackage: false,
    };
  }

  if (SUCCESS_PAYMENT_STATUSES.has(normalizedPaymentStatus)) {
    return {
      statusStageCode: "waiting_confirmation",
      statusStep: 2,
      statusLabel: "Dikonfirmasi",
      statusGroup: "ongoing",
      canTrackPackage: false,
    };
  }

  return {
    statusStageCode: "waiting_payment",
    statusStep: 1,
    statusLabel: "Menunggu Pembayaran",
    statusGroup: "ongoing",
    canTrackPackage: false,
  };
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback;

  const payload = toObject(error.response?.data);
  const message = toStringValue(payload.message);
  if (message) return message;

  return fallback;
};

const mapOrderItem = (raw: unknown): CustomerOrderItem => {
  const row = toObject(raw);
  const tradeInEnabled =
    (toBooleanValue(row.trade_in_enabled) ?? false) || toStringValue(row.trade_in_transaction_id) !== null;

  return {
    id: toStringValue(row.id) ?? "",
    productId: toStringValue(row.product_id) ?? "",
    productName: toStringValue(row.product_name) ?? "Produk",
    variantName: toStringValue(row.variant_name),
    variantSku: toStringValue(row.variant_sku) ?? "",
    quantity: Math.max(1, Math.round(toNumberValue(row.quantity) || 1)),
    unitPrice: toNumberValue(row.unit_price),
    lineTotal: toNumberValue(row.line_total),
    productImage: resolveApiAssetUrl(toStringValue(row.product_image)),
    tradeInEnabled,
    tradeInTransactionId: toStringValue(row.trade_in_transaction_id),
    tradeInEstimatedAmount: tradeInEnabled ? toNumberValue(row.trade_in_estimated_amount) : null,
  };
};

const mapPrimaryItem = (raw: unknown): CustomerOrderPrimaryItem | null => {
  const row = toObject(raw);
  const id = toStringValue(row.id);
  if (!id) return null;
  const tradeInEnabled =
    (toBooleanValue(row.trade_in_enabled) ?? false) || toStringValue(row.trade_in_transaction_id) !== null;

  return {
    id,
    productId: toStringValue(row.product_id) ?? "",
    productName: toStringValue(row.product_name) ?? "Produk",
    variantName: toStringValue(row.variant_name),
    variantSku: toStringValue(row.variant_sku) ?? "",
    quantity: Math.max(1, Math.round(toNumberValue(row.quantity) || 1)),
    unitPrice: toNumberValue(row.unit_price),
    lineTotal: toNumberValue(row.line_total),
    productImage: resolveApiAssetUrl(toStringValue(row.product_image)),
    tradeInEnabled,
    tradeInTransactionId: toStringValue(row.trade_in_transaction_id),
    tradeInEstimatedAmount: tradeInEnabled ? toNumberValue(row.trade_in_estimated_amount) : null,
  };
};

const mapPaymentDetails = (raw: unknown): CustomerOrderPaymentDetails | null => {
  const row = toObject(raw);
  const methodLabel = toStringValue(row.method_label);
  const statusLabel = toStringValue(row.status_label);

  if (!methodLabel && !statusLabel && !toStringValue(row.account_number)) {
    return null;
  }

  const instructions = Array.isArray(row.instructions)
    ? row.instructions
        .map((item) => toStringValue(item))
        .filter((item): item is string => item !== null)
    : [];

  return {
    statusLabel: statusLabel ?? "Menunggu Pembayaran",
    isPending: toBooleanValue(row.is_pending) ?? false,
    paymentType: toStringValue(row.payment_type),
    methodCode: toStringValue(row.method_code),
    methodLabel: methodLabel ?? "Metode Pembayaran",
    channelCode: toStringValue(row.channel_code),
    channelLabel: toStringValue(row.channel_label),
    accountLabel: toStringValue(row.account_label),
    accountNumber: toStringValue(row.account_number),
    secondaryLabel: toStringValue(row.secondary_label),
    secondaryValue: toStringValue(row.secondary_value),
    expiryTime: toStringValue(row.expiry_time),
    totalAmount: toNumberValue(row.total_amount),
    pdfUrl: toStringValue(row.pdf_url),
    statusMessage: toStringValue(row.status_message),
    canResumePayment: toBooleanValue(row.can_resume_payment) ?? false,
    instructions,
  };
};

const mapTradeInStoreOrigin = (raw: unknown): CustomerOrderTradeInStoreOrigin | null => {
  const row = toObject(raw);

  const label = toStringValue(row.label);
  const recipientName = toStringValue(row.recipient_name);
  const recipientPhone = toStringValue(row.recipient_phone);
  const fullAddress = toStringValue(row.full_address);
  const locationNote = toStringValue(row.location_note);

  if (!label && !recipientName && !recipientPhone && !fullAddress) {
    return null;
  }

  return {
    label,
    recipientName,
    recipientPhone,
    fullAddress,
    locationNote,
  };
};

const mapOrder = (raw: unknown): CustomerOrder => {
  const row = toObject(raw);
  const items = Array.isArray(row.items) ? row.items : [];
  const mappedItems = items.map(mapOrderItem);
  const status = toStringValue(row.status) ?? "";
  const paymentStatus = toStringValue(row.payment_status) ?? "pending";
  const statusFallback = resolveStatusFallback(status, paymentStatus);
  const statusStep = clampStep(toNumberValue(row.status_step) || statusFallback.statusStep);
  const canTrackPackage = toBooleanValue(row.can_track_package) ?? statusStep >= 3;
  const paymentMethod = toStringValue(row.payment_method);
  const primaryItem = mapPrimaryItem(row.primary_item);
  const hasTradeIn =
    (toBooleanValue(row.has_trade_in) ?? false) ||
    mappedItems.some((item) => item.tradeInEnabled) ||
    Boolean(primaryItem?.tradeInEnabled);

  return {
    id: toStringValue(row.id) ?? "",
    kind: (toStringValue(row.kind) ?? "sales_order") as "sales_order" | "trade_in",
    orderNumber: toStringValue(row.order_number) ?? "",
    invoiceNumber: toStringValue(row.invoice_number),
    status,
    statusStageCode: toStringValue(row.status_stage_code) ?? statusFallback.statusStageCode,
    statusStep,
    statusLabel: toStringValue(row.status_label) ?? statusFallback.statusLabel,
    statusGroup: toStringValue(row.status_group) ?? statusFallback.statusGroup,
    progressStages:
      (Array.isArray(row.progress_stages) ? row.progress_stages : [])
        .map(mapProgressStage)
        .filter((item): item is CustomerOrderProgressStage => item !== null),
    requiresPayment: toBooleanValue(row.requires_payment) ?? true,
    paymentStatus,
    paymentMethod,
    paymentMethodLabel: toStringValue(row.payment_method_label) ?? resolvePaymentMethodLabelFallback(paymentMethod),
    subtotal: toNumberValue(row.subtotal),
    shippingCost: toNumberValue(row.shipping_cost),
    discountAmount: toNumberValue(row.discount_amount),
    totalAmount: toNumberValue(row.total_amount),
    shippingCourier: toStringValue(row.shipping_courier),
    shippingService: toStringValue(row.shipping_service),
    shippingEtd: toStringValue(row.shipping_etd),
    canTrackPackage,
    trackingNumber: toStringValue(row.tracking_number),
    trackingUrl: toStringValue(row.tracking_url),
    customerName: toStringValue(row.customer_name) ?? "Pelanggan",
    customerPhone: toStringValue(row.customer_phone),
    customerEmail: toStringValue(row.customer_email),
    customerAddress: toStringValue(row.customer_address),
    canResumePayment: toBooleanValue(row.can_resume_payment) ?? false,
    canConfirmReceived: toBooleanValue(row.can_confirm_received) ?? false,
    hasTradeIn,
    tradeInTransactionNumber: toStringValue(row.trade_in_transaction_number),
    tradeInStatus: toStringValue(row.trade_in_status),
    tradeInFulfillmentMethod: toStringValue(row.trade_in_fulfillment_method),
    tradeInShipmentTrackingNumber: toStringValue(row.trade_in_shipment_tracking_number),
    tradeInStoreOrigin: mapTradeInStoreOrigin(row.trade_in_store_origin),
    paymentDetails: mapPaymentDetails(row.payment_details),
    primaryItem,
    items: mappedItems,
    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at),
  };
};

const mapProgressStage = (raw: unknown): CustomerOrderProgressStage | null => {
  const row = toObject(raw);
  const step = clampStep(toNumberValue(row.step));
  const code = toStringValue(row.code);
  const label = toStringValue(row.label);
  if (!code || !label) return null;

  return {
    step,
    code,
    label,
  };
};

const mapFilterOption = (raw: unknown): CustomerOrderFilterOption | null => {
  const row = toObject(raw);
  const key = toStringValue(row.key);
  const label = toStringValue(row.label);
  if (!key || !label) return null;

  return {
    key,
    label,
  };
};

const normalizeStageCode = (order: CustomerOrder): string => order.statusStageCode.trim().toLowerCase();
const normalizeStatus = (order: CustomerOrder): string => order.status.trim().toLowerCase();
const normalizePaymentStatus = (order: CustomerOrder): string => order.paymentStatus.trim().toLowerCase();

export const canCustomerOrderBeCancelled = (order: CustomerOrder): boolean => {
  if (order.statusGroup === "cancelled") return false;

  const stageCode = normalizeStageCode(order);
  const status = normalizeStatus(order);
  const paymentStatus = normalizePaymentStatus(order);

  if (order.kind === "trade_in") {
    return CANCELLABLE_TRADE_IN_STAGE_CODES.has(stageCode);
  }

  if (SUCCESS_ORDER_STAGE_CODES.has(stageCode) || TRACKABLE_ORDER_STAGE_CODES.has(stageCode)) {
    return false;
  }

  if (CANCELLABLE_ORDER_STAGE_CODES.has(stageCode)) {
    return true;
  }

  return status === "dibayar" || status === "menunggu pembayaran" || SUCCESS_PAYMENT_STATUSES.has(paymentStatus);
};

export const canCustomerOrderTrackShipment = (order: CustomerOrder): boolean => {
  if (order.statusGroup === "cancelled") return false;
  return TRACKABLE_ORDER_STAGE_CODES.has(normalizeStageCode(order));
};

export const canCustomerOrderRequestReturn = (order: CustomerOrder): boolean => {
  if (order.statusGroup === "cancelled") return false;
  return SUCCESS_ORDER_STAGE_CODES.has(normalizeStageCode(order));
};

export const customerOrdersApi = {
  async getOrders(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    filter?: CustomerOrderFilterKey;
  }): Promise<CustomerOrderListResult> {
    try {
      const response = await api.get("/orders", { params });
      const source = toObject(response.data);
      const rows = Array.isArray(source.data) ? source.data : [];
      const pagination = toObject(source.pagination);
      const filters = toObject(source.filters);
      const statusCatalog = toObject(source.status_catalog);
      const filterRows = Array.isArray(filters.items) ? filters.items : [];
      const stepRows = Array.isArray(statusCatalog.steps) ? statusCatalog.steps : [];
      const mappedFilters = filterRows.map(mapFilterOption).filter((item): item is CustomerOrderFilterOption => item !== null);
      const mappedSteps = stepRows.map(mapProgressStage).filter((item): item is CustomerOrderProgressStage => item !== null);

      return {
        items: rows.map(mapOrder),
        filters: {
          active: toStringValue(filters.active) ?? params?.filter ?? "all",
          items: mappedFilters.length > 0 ? mappedFilters : DEFAULT_FILTERS,
        },
        statusCatalog: {
          steps: mappedSteps.length > 0 ? mappedSteps : DEFAULT_PROGRESS_STAGES,
        },
        pagination: {
          currentPage: Math.max(1, Math.round(toNumberValue(pagination.current_page) || 1)),
          perPage: Math.max(1, Math.round(toNumberValue(pagination.per_page) || 10)),
          total: Math.max(0, Math.round(toNumberValue(pagination.total))),
          lastPage: Math.max(1, Math.round(toNumberValue(pagination.last_page) || 1)),
        },
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gagal memuat daftar transaksi."));
    }
  },

  async getPayment(orderId: string): Promise<CustomerOrderPaymentResult> {
    try {
      const response = await api.get(`/orders/${orderId}/payment`);
      const source = toObject(response.data);
      const data = toObject(source.data);
      const order = toObject(data.order);

      return {
        orderId: toStringValue(order.id) ?? orderId,
        orderNumber: toStringValue(order.order_number) ?? "",
        invoiceNumber: toStringValue(order.invoice_number),
        paymentStatus: toStringValue(order.payment_status) ?? "pending",
        status: toStringValue(order.status) ?? "",
        statusStep: clampStep(toNumberValue(order.status_step) || 1),
        totalAmount: toNumberValue(order.total_amount),
        snapToken: toStringValue(data.snap_token),
        snapRedirectUrl: toStringValue(data.snap_redirect_url),
        midtransClientKey: toStringValue(data.midtrans_client_key) ?? "",
        midtransSnapJsUrl:
          toStringValue(data.midtrans_snap_js_url) ?? "https://app.sandbox.midtrans.com/snap/snap.js",
        paymentDetails: mapPaymentDetails(data.payment_details),
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gagal memuat data pembayaran transaksi."));
    }
  },

  async getOrder(orderId: string): Promise<CustomerOrder> {
    try {
      const response = await api.get(`/orders/${orderId}`);
      const source = toObject(response.data);
      return mapOrder(source.data);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gagal memuat detail transaksi."));
    }
  },

  async confirmReceived(orderId: string): Promise<CustomerOrder> {
    try {
      await ensureCsrfCookie();
      const response = await api.post(`/orders/${orderId}/received`, {});
      const source = toObject(response.data);
      return mapOrder(source.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 419) {
        try {
          await ensureCsrfCookie(true);
          const response = await api.post(`/orders/${orderId}/received`, {});
          const source = toObject(response.data);
          return mapOrder(source.data);
        } catch (retryError) {
          throw new Error(extractErrorMessage(retryError, "Gagal mengonfirmasi pesanan diterima."));
        }
      }

      throw new Error(extractErrorMessage(error, "Gagal mengonfirmasi pesanan diterima."));
    }
  },

  async cancelOrder(orderId: string): Promise<CustomerOrder> {
    try {
      await ensureCsrfCookie();
      const response = await api.post(`/orders/${orderId}/cancel`, {});
      const source = toObject(response.data);
      return mapOrder(source.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 419) {
        try {
          await ensureCsrfCookie(true);
          const response = await api.post(`/orders/${orderId}/cancel`, {});
          const source = toObject(response.data);
          return mapOrder(source.data);
        } catch (retryError) {
          throw new Error(extractErrorMessage(retryError, "Gagal membatalkan transaksi trade-in."));
        }
      }

      throw new Error(extractErrorMessage(error, "Gagal membatalkan transaksi trade-in."));
    }
  },

  async submitTradeInFulfillment(
    orderId: string,
    payload: {
      fulfillment_method: "pengiriman" | "offline_store";
      shipment_tracking_number?: string | null;
    }
  ): Promise<CustomerOrder> {
    try {
      await ensureCsrfCookie();
      const response = await api.post(`/orders/${orderId}/trade-in-fulfillment`, payload);
      const source = toObject(response.data);
      return mapOrder(source.data);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 419) {
        try {
          await ensureCsrfCookie(true);
          const response = await api.post(`/orders/${orderId}/trade-in-fulfillment`, payload);
          const source = toObject(response.data);
          return mapOrder(source.data);
        } catch (retryError) {
          throw new Error(extractErrorMessage(retryError, "Gagal menyimpan data pengiriman trade-in."));
        }
      }

      throw new Error(extractErrorMessage(error, "Gagal menyimpan data pengiriman trade-in."));
    }
  },
};
