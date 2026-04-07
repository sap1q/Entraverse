import api, { apiUpload } from "@/lib/axios";
import type { Brand, BrandListResponse, BrandMutationPayload } from "@/types/brand.types";

type AnyObject = Record<string, unknown>;

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

const mapBrand = (raw: unknown): Brand => {
  const row = toObject(raw);
  return {
    id: toStringValue(row.id) ?? crypto.randomUUID(),
    name: toStringValue(row.name) ?? "Unknown Brand",
    slug: toStringValue(row.slug) ?? "unknown-brand",
    logo: toStringValue(row.logo),
    logo_url: toStringValue(row.logo_url) ?? toStringValue(row.logo),
    description: toStringValue(row.description),
    is_active: Boolean(row.is_active),
    product_count: toNumberValue(row.product_count),
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
};

const buildFormData = (payload: BrandMutationPayload): FormData => {
  const formData = new FormData();

  if (payload.name !== undefined) {
    formData.append("name", payload.name);
  }
  if (payload.slug !== undefined) {
    formData.append("slug", payload.slug);
  }
  if (payload.description !== undefined) {
    formData.append("description", payload.description);
  }
  if (payload.is_active !== undefined) {
    formData.append("is_active", payload.is_active ? "1" : "0");
  }
  if (payload.logo) {
    formData.append("logo", payload.logo);
  }
  if (payload.remove_logo) {
    formData.append("remove_logo", "1");
  }

  return formData;
};

export const brandApi = {
  async getAll(params?: {
    search?: string;
    page?: number;
    perPage?: number;
    includeInactive?: boolean;
  }): Promise<BrandListResponse> {
    const response = await api.get("/v1/admin/brands", {
      params: {
        search: params?.search,
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 20,
        include_inactive: params?.includeInactive ? 1 : undefined,
      },
    });

    const payload = toObject(response.data);
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const meta = toObject(payload.meta);

    return {
      success: payload.success !== false,
      data: rows.map(mapBrand),
      meta: {
        current_page: toNumberValue(meta.current_page) || 1,
        last_page: toNumberValue(meta.last_page) || 1,
        total: toNumberValue(meta.total),
        per_page: toNumberValue(meta.per_page) || (params?.perPage ?? 20),
      },
    };
  },

  async create(payload: BrandMutationPayload): Promise<Brand> {
    const response = await apiUpload.post("/v1/admin/brands", buildFormData(payload), {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const body = toObject(response.data);
    return mapBrand(body.data);
  },

  async update(brandId: string, payload: BrandMutationPayload): Promise<Brand> {
    const formData = buildFormData(payload);
    formData.append("_method", "PUT");

    const response = await apiUpload.post(`/v1/admin/brands/${brandId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const body = toObject(response.data);
    return mapBrand(body.data);
  },

  async delete(brandId: string): Promise<void> {
    await api.delete(`/v1/admin/brands/${brandId}`);
  },
};

