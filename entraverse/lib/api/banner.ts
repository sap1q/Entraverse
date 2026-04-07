import api, { apiUpload, isAxiosError } from "@/lib/axios";
import { resolveApiOriginUrl } from "@/lib/api-config";
import type {
  Banner,
  BannerApiResponse,
  BannerFormData,
  BannerReorderItem,
} from "@/lib/api/types/banner.types";

type UnknownRecord = Record<string, unknown>;

const toAbsoluteUrl = (value: string): string => {
  const normalized = value.trim();
  return resolveApiOriginUrl(normalized);
};

const asObject = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asBanner = (value: unknown): Banner | null => {
  const row = asObject(value);
  const id = typeof row.id === "string" ? row.id : null;
  const imagePath = typeof row.image_path === "string" ? row.image_path : null;
  const imageUrl = typeof row.image_url === "string" ? row.image_url : null;
  const order = typeof row.order === "number" ? row.order : Number(row.order ?? 0);

  if (!id || !imagePath || !imageUrl) return null;

  return {
    id,
    title: typeof row.title === "string" ? row.title : null,
    alt_text: typeof row.alt_text === "string" ? row.alt_text : null,
    image_path: imagePath,
    image_url: toAbsoluteUrl(imageUrl),
    link_url: typeof row.link_url === "string" ? row.link_url : null,
    order: Number.isFinite(order) ? order : 0,
    is_active: Boolean(row.is_active),
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    deleted_at: typeof row.deleted_at === "string" ? row.deleted_at : null,
  };
};

const extractBannerList = (payload: unknown): Banner[] => {
  const source = asObject(payload);
  const data = source.data;

  if (Array.isArray(data)) {
    return data
      .map(asBanner)
      .filter((item): item is Banner => item !== null);
  }

  if (data && typeof data === "object") {
    const nested = asObject(data).data;
    if (Array.isArray(nested)) {
      return nested
        .map(asBanner)
        .filter((item): item is Banner => item !== null);
    }
  }

  return [];
};

const extractSingleBanner = (payload: unknown): Banner | null => {
  const source = asObject(payload);
  const data = asBanner(source.data);
  if (data) return data;

  const nested = asObject(source.data).data;
  return asBanner(nested);
};

const createPayload = (payload: BannerFormData): FormData => {
  const formData = new FormData();

  if (payload.title?.trim()) {
    formData.append("title", payload.title.trim());
  }
  if (payload.alt_text?.trim()) {
    formData.append("alt_text", payload.alt_text.trim());
  }
  if (payload.link_url?.trim()) {
    formData.append("link_url", payload.link_url.trim());
  }
  if (typeof payload.is_active === "boolean") {
    formData.append("is_active", payload.is_active ? "1" : "0");
  }
  if (payload.image) {
    formData.append("image", payload.image);
  }

  return formData;
};

const extractBannerErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const message = error.response?.data?.message;
  if (typeof message === "string" && message.trim() !== "") {
    return message;
  }

  const firstError = error.response?.data?.errors
    ? Object.values(error.response.data.errors)[0]
    : null;

  if (Array.isArray(firstError) && typeof firstError[0] === "string" && firstError[0].trim() !== "") {
    return firstError[0];
  }

  if (typeof firstError === "string" && firstError.trim() !== "") {
    return firstError;
  }

  return fallback;
};

export const bannerApi = {
  async getAll(params: { withTrashed?: boolean; onlyTrashed?: boolean } = {}): Promise<Banner[]> {
    const response = await api.get<BannerApiResponse<Banner[]>>("/v1/admin/banners", {
      params: {
        with_trashed: params.withTrashed ? 1 : undefined,
        only_trashed: params.onlyTrashed ? 1 : undefined,
      },
    });

    return extractBannerList(response.data);
  },

  async getById(id: string): Promise<Banner | null> {
    const response = await api.get<BannerApiResponse<Banner>>(`/v1/admin/banners/${id}`, {
      params: { with_trashed: 1 },
    });

    return extractSingleBanner(response.data);
  },

  async create(payload: BannerFormData): Promise<Banner> {
    try {
      const response = await apiUpload.post<BannerApiResponse<Banner>>(
        "/v1/admin/banners",
        createPayload(payload),
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const banner = extractSingleBanner(response.data);
      if (!banner) {
        throw new Error("Respons banner tidak valid.");
      }

      return banner;
    } catch (error) {
      throw new Error(extractBannerErrorMessage(error, "Gagal menyimpan banner."));
    }
  },

  async update(id: string, payload: BannerFormData): Promise<Banner> {
    const formData = createPayload(payload);
    formData.append("_method", "PUT");

    try {
      const response = await apiUpload.post<BannerApiResponse<Banner>>(
        `/v1/admin/banners/${id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const banner = extractSingleBanner(response.data);
      if (!banner) {
        throw new Error("Respons banner tidak valid.");
      }

      return banner;
    } catch (error) {
      throw new Error(extractBannerErrorMessage(error, "Gagal memperbarui banner."));
    }
  },

  async updateOrder(banners: BannerReorderItem[]): Promise<void> {
    await api.post("/v1/admin/banners/reorder", { banners });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/v1/admin/banners/${id}`);
  },

  async restore(id: string): Promise<void> {
    await api.post(`/v1/admin/banners/${id}/restore`);
  },

  async forceDelete(id: string): Promise<void> {
    await api.delete(`/v1/admin/banners/${id}/force`);
  },

  async getActive(): Promise<Banner[]> {
    const response = await api.get<BannerApiResponse<Banner[]>>("/v1/banners/active");
    return extractBannerList(response.data).filter((banner) => banner.is_active);
  },
};
