import { isAxiosError } from "axios";
import api from "@/lib/axios";

type JsonRecord = Record<string, unknown>;

export type StoreOrigin = {
  source: "store_origin" | "env";
  id: string | null;
  label: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  province_id: string | null;
  province_name: string | null;
  city_id: string;
  city_name: string | null;
  district_id: string | null;
  district_name: string | null;
  subdistrict: string | null;
  address_detail: string | null;
  zip_code: string | null;
  location_note: string | null;
  full_address: string | null;
  is_active: boolean;
  updated_at: string | null;
};

export type StoreOriginPayload = {
  label: string;
  recipient_name: string;
  recipient_phone: string;
  province_id: string;
  city_id: string;
  district_id: string;
  subdistrict?: string | null;
  address_detail: string;
  zip_code?: string | null;
  location_note?: string | null;
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

const toBooleanValue = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true") return true;
    if (normalized === "0" || normalized === "false") return false;
  }
  return fallback;
};

const extractErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error)) return "Gagal memproses origin pengiriman.";

  const payload = toObject(error.response?.data);
  const message = toStringValue(payload.message);
  if (message) return message;

  const errors = toObject(payload.errors);
  const firstError = Object.values(errors)[0];
  if (Array.isArray(firstError) && firstError.length > 0) {
    const rowMessage = toStringValue(firstError[0]);
    if (rowMessage) return rowMessage;
  }

  return "Gagal memproses origin pengiriman.";
};

const mapOrigin = (raw: unknown): StoreOrigin | null => {
  const row = toObject(raw);
  const cityId = toStringValue(row.city_id);
  if (!cityId) return null;

  const source = toStringValue(row.source);

  return {
    source: source === "env" ? "env" : "store_origin",
    id: toStringValue(row.id),
    label: toStringValue(row.label),
    recipient_name: toStringValue(row.recipient_name),
    recipient_phone: toStringValue(row.recipient_phone),
    province_id: toStringValue(row.province_id),
    province_name: toStringValue(row.province_name),
    city_id: cityId,
    city_name: toStringValue(row.city_name),
    district_id: toStringValue(row.district_id),
    district_name: toStringValue(row.district_name),
    subdistrict: toStringValue(row.subdistrict),
    address_detail: toStringValue(row.address_detail),
    zip_code: toStringValue(row.zip_code),
    location_note: toStringValue(row.location_note),
    full_address: toStringValue(row.full_address),
    is_active: toBooleanValue(row.is_active, true),
    updated_at: toStringValue(row.updated_at),
  };
};

export const vendorShippingApi = {
  async getOrigin(): Promise<StoreOrigin | null> {
    try {
      const response = await api.get("/v1/admin/shipping/origin");
      const source = toObject(response.data);
      return mapOrigin(source.data);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  async saveOrigin(payload: StoreOriginPayload): Promise<StoreOrigin> {
    try {
      const response = await api.put("/v1/admin/shipping/origin", payload);
      const source = toObject(response.data);
      const mapped = mapOrigin(source.data);
      if (!mapped) {
        throw new Error("Respons origin tidak valid.");
      }

      return mapped;
    } catch (error) {
      if (error instanceof Error && error.message === "Respons origin tidak valid.") {
        throw error;
      }
      throw new Error(extractErrorMessage(error));
    }
  },
};
