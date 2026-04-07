import api, { isAxiosError } from "@/lib/axios";
import { resolveApiAssetUrl } from "@/lib/utils/media";

type AnyObject = Record<string, unknown>;

export type TradeInTransactionStatus =
  | "menunggu_review"
  | "disetujui"
  | "ditolak"
  | "menunggu_pengiriman"
  | "dikirim_pelanggan"
  | "kunjungan_toko"
  | "selesai"
  | "dibatalkan";

export type TradeInFulfillmentMethod = "belum_dipilih" | "pengiriman" | "offline_store";

export type TradeInTransactionPhoto = {
  id: string;
  slot_id: string | null;
  label: string | null;
  image_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string | null;
};

export type TradeInTransaction = {
  id: string;
  transaction_number: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_city: string | null;
  customer_address: string | null;
  trade_in_only: boolean;
  requested_product: {
    id: string;
    name: string;
    spu: string;
  } | null;
  requested_product_name: string | null;
  requested_product_variant_sku: string | null;
  device_brand: string | null;
  device_model: string | null;
  device_variant: string | null;
  physical_condition: string | null;
  device_age: string | null;
  service_history: string | null;
  accessory_summary: unknown[];
  answers: Record<string, unknown>;
  estimated_amount: number;
  offered_amount: number;
  status: TradeInTransactionStatus;
  fulfillment_method: TradeInFulfillmentMethod;
  shipment_courier: string | null;
  shipment_tracking_number: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  reviewer: {
    id: string;
    name: string;
    email: string;
  } | null;
  photo_count: number;
  cover_photo_url: string | null;
  photos: TradeInTransactionPhoto[];
  created_at: string | null;
  updated_at: string | null;
};

type TradeInTransactionListResponse = {
  data: TradeInTransaction[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

const toObject = (value: unknown): AnyObject => {
  if (!value || typeof value !== "object") return {};
  return value as AnyObject;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return false;
};

const toArrayValue = <T = unknown>(value: unknown): T[] => {
  return Array.isArray(value) ? (value as T[]) : [];
};

const mapPhoto = (raw: unknown): TradeInTransactionPhoto => {
  const row = toObject(raw);

  return {
    id: toStringValue(row.id) ?? crypto.randomUUID(),
    slot_id: toStringValue(row.slot_id),
    label: toStringValue(row.label),
    image_url: resolveApiAssetUrl(toStringValue(row.image_url)),
    mime_type: toStringValue(row.mime_type),
    file_size: row.file_size == null ? null : toNumberValue(row.file_size),
    sort_order: toNumberValue(row.sort_order),
    is_primary: toBooleanValue(row.is_primary),
    created_at: toStringValue(row.created_at),
  };
};

const mapTransaction = (raw: unknown): TradeInTransaction => {
  const row = toObject(raw);
  const requestedProduct = toObject(row.requested_product);
  const reviewer = toObject(row.reviewer);

  return {
    id: toStringValue(row.id) ?? crypto.randomUUID(),
    transaction_number: toStringValue(row.transaction_number) ?? "-",
    customer_name: toStringValue(row.customer_name) ?? "Pelanggan",
    customer_phone: toStringValue(row.customer_phone),
    customer_email: toStringValue(row.customer_email),
    customer_city: toStringValue(row.customer_city),
    customer_address: toStringValue(row.customer_address),
    trade_in_only: toBooleanValue(row.trade_in_only),
    requested_product:
      Object.keys(requestedProduct).length > 0
        ? {
            id: toStringValue(requestedProduct.id) ?? "",
            name: toStringValue(requestedProduct.name) ?? "-",
            spu: toStringValue(requestedProduct.spu) ?? "-",
          }
        : null,
    requested_product_name: toStringValue(row.requested_product_name),
    requested_product_variant_sku: toStringValue(row.requested_product_variant_sku),
    device_brand: toStringValue(row.device_brand),
    device_model: toStringValue(row.device_model),
    device_variant: toStringValue(row.device_variant),
    physical_condition: toStringValue(row.physical_condition),
    device_age: toStringValue(row.device_age),
    service_history: toStringValue(row.service_history),
    accessory_summary: toArrayValue(row.accessory_summary),
    answers: toObject(row.answers),
    estimated_amount: toNumberValue(row.estimated_amount),
    offered_amount: toNumberValue(row.offered_amount),
    status: (toStringValue(row.status) ?? "menunggu_review") as TradeInTransactionStatus,
    fulfillment_method: (toStringValue(row.fulfillment_method) ?? "belum_dipilih") as TradeInFulfillmentMethod,
    shipment_courier: toStringValue(row.shipment_courier),
    shipment_tracking_number: toStringValue(row.shipment_tracking_number),
    customer_notes: toStringValue(row.customer_notes),
    admin_notes: toStringValue(row.admin_notes),
    reviewed_at: toStringValue(row.reviewed_at),
    completed_at: toStringValue(row.completed_at),
    reviewer:
      Object.keys(reviewer).length > 0
        ? {
            id: toStringValue(reviewer.id) ?? "",
            name: toStringValue(reviewer.name) ?? "-",
            email: toStringValue(reviewer.email) ?? "-",
          }
        : null,
    photo_count: toNumberValue(row.photo_count),
    cover_photo_url: resolveApiAssetUrl(toStringValue(row.cover_photo_url)),
    photos: toArrayValue(row.photos).map(mapPhoto),
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    const payload = toObject(error.response?.data);
    const message = toStringValue(payload.message);
    if (message) return message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export const tradeInTransactionApi = {
  async getAll(params?: {
    search?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }): Promise<TradeInTransactionListResponse> {
    try {
      const response = await api.get("/v1/admin/trade-in-transactions", {
        params: {
          search: params?.search,
          status: params?.status,
          page: params?.page ?? 1,
          per_page: params?.perPage ?? 10,
        },
      });

      const payload = toObject(response.data);
      const rows = toArrayValue(payload.data);
      const pagination = toObject(payload.pagination);

      return {
        data: rows.map(mapTransaction),
        pagination: {
          current_page: toNumberValue(pagination.current_page) || 1,
          per_page: toNumberValue(pagination.per_page) || (params?.perPage ?? 10),
          total: toNumberValue(pagination.total),
          last_page: Math.max(1, toNumberValue(pagination.last_page) || 1),
        },
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gagal memuat transaksi trade-in."));
    }
  },

  async updateStatus(
    transactionId: string,
    payload: {
      status: TradeInTransactionStatus;
      admin_notes?: string;
    }
  ): Promise<TradeInTransaction> {
    try {
      const response = await api.patch(`/v1/admin/trade-in-transactions/${transactionId}/status`, payload);
      const body = toObject(response.data);
      return mapTransaction(body.data);
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Gagal memperbarui status trade-in."));
    }
  },
};
