import { isAxiosError } from "axios";
import { apiUpload } from "@/lib/axios";

type JsonRecord = Record<string, unknown>;

export type TradeInSubmissionPayload = {
  requested_product_id?: string;
  requested_product_name?: string;
  requested_product_variant_sku?: string;
  trade_in_only?: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_city?: string;
  customer_address: string;
  customer_notes?: string;
  device_brand?: string;
  device_model: string;
  device_variant?: string;
  physical_condition: string;
  device_age: string;
  service_history: string;
  accessory_summary: string[];
  estimated_amount: number;
  photo_slots: string[];
  photos: File[];
};

export type TradeInSubmissionResult = {
  id: string;
  transactionNumber: string;
  status: string;
  estimatedAmount: number;
  photoCount: number;
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

const toNumberValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const extractErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const payload = toObject(error.response?.data);
    const message = toStringValue(payload.message);
    if (message) return message;

    const errors = toObject(payload.errors);
    for (const value of Object.values(errors)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        return value[0];
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Gagal mengirim pengajuan trade-in.";
};

const buildFormData = (payload: TradeInSubmissionPayload): FormData => {
  const formData = new FormData();

  if (payload.requested_product_id) formData.append("requested_product_id", payload.requested_product_id);
  if (payload.requested_product_name) formData.append("requested_product_name", payload.requested_product_name);
  if (payload.requested_product_variant_sku) {
    formData.append("requested_product_variant_sku", payload.requested_product_variant_sku);
  }

  formData.append("trade_in_only", payload.trade_in_only ? "1" : "0");
  formData.append("customer_name", payload.customer_name);
  formData.append("customer_phone", payload.customer_phone);
  formData.append("customer_email", payload.customer_email);
  formData.append("customer_address", payload.customer_address);
  formData.append("device_model", payload.device_model);
  formData.append("physical_condition", payload.physical_condition);
  formData.append("device_age", payload.device_age);
  formData.append("service_history", payload.service_history);
  formData.append("estimated_amount", String(payload.estimated_amount));

  if (payload.customer_city) formData.append("customer_city", payload.customer_city);
  if (payload.customer_notes) formData.append("customer_notes", payload.customer_notes);
  if (payload.device_brand) formData.append("device_brand", payload.device_brand);
  if (payload.device_variant) formData.append("device_variant", payload.device_variant);

  payload.accessory_summary.forEach((item) => {
    formData.append("accessory_summary[]", item);
  });

  payload.photo_slots.forEach((slot) => {
    formData.append("photo_slots[]", slot);
  });

  payload.photos.forEach((file) => {
    formData.append("photos[]", file);
  });

  return formData;
};

export const tradeInApi = {
  async submit(payload: TradeInSubmissionPayload): Promise<TradeInSubmissionResult> {
    try {
      const response = await apiUpload.post("/trade-in/transactions", buildFormData(payload), {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const body = toObject(response.data);
      const data = toObject(body.data);

      return {
        id: toStringValue(data.id) ?? "",
        transactionNumber: toStringValue(data.transaction_number) ?? "",
        status: toStringValue(data.status) ?? "menunggu_review",
        estimatedAmount: toNumberValue(data.estimated_amount),
        photoCount: toNumberValue(data.photo_count),
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};
