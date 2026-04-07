import api, { isAxiosError } from "@/lib/axios";

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

export type WarrantyRecord = {
  id: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  invoice_number: string;
  serial_number: string;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "expired" | "upcoming" | "inactive";
  product_id: string;
  product: {
    id: string;
    name: string;
    spu: string | null;
    main_image: string | null;
  } | null;
  created_at: string | null;
  updated_at: string | null;
};

export type WarrantyPagination = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type WarrantyPayload = {
  customer_name: string;
  phone?: string;
  address?: string;
  invoice_number: string;
  serial_number: string;
  start_date: string;
  end_date: string;
  product_id: string;
};

export type WarrantyProductOption = {
  id: string;
  name: string;
  spu: string | null;
  main_image: string | null;
};

const mapWarranty = (raw: unknown): WarrantyRecord => {
  const row = toObject(raw);
  const productRow = toObject(row.product);

  return {
    id: toStringValue(row.id) ?? "",
    customer_name: toStringValue(row.customer_name) ?? "Pelanggan",
    phone: toStringValue(row.phone),
    address: toStringValue(row.address),
    invoice_number: toStringValue(row.invoice_number) ?? "-",
    serial_number: toStringValue(row.serial_number) ?? "-",
    start_date: toStringValue(row.start_date),
    end_date: toStringValue(row.end_date),
    status: (toStringValue(row.status) as WarrantyRecord["status"]) ?? "inactive",
    product_id: toStringValue(row.product_id) ?? "",
    product:
      Object.keys(productRow).length > 0
        ? {
            id: toStringValue(productRow.id) ?? "",
            name: toStringValue(productRow.name) ?? "Produk",
            spu: toStringValue(productRow.spu),
            main_image: toStringValue(productRow.main_image),
          }
        : null,
    created_at: toStringValue(row.created_at),
    updated_at: toStringValue(row.updated_at),
  };
};

const normalizeErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback;

  const responseMessage = toStringValue(error.response?.data?.message);
  if (responseMessage) return responseMessage;

  const errorBag = toObject(error.response?.data?.errors);
  const firstFieldErrors = Object.values(errorBag).find((value) => Array.isArray(value) && value.length > 0);
  if (Array.isArray(firstFieldErrors)) {
    const firstMessage = toStringValue(firstFieldErrors[0]);
    if (firstMessage) return firstMessage;
  }

  return error.message || fallback;
};

export const warrantyApi = {
  async lookup(invoiceNumber: string, serialNumber: string): Promise<WarrantyRecord> {
    try {
      const response = await api.post("/v1/warranties/lookup", {
        invoice_number: invoiceNumber,
        serial_number: serialNumber,
      });

      return mapWarranty(toObject(response.data).data);
    } catch (error) {
      throw new Error(normalizeErrorMessage(error, "Gagal mencari data garansi."));
    }
  },

  async getAdminList(params?: {
    search?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ data: WarrantyRecord[]; pagination: WarrantyPagination }> {
    try {
      const response = await api.get("/v1/admin/warranties", {
        params: {
          search: params?.search,
          page: params?.page,
          per_page: params?.perPage ?? 10,
        },
      });

      const payload = toObject(response.data);
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const pagination = toObject(payload.pagination);

      return {
        data: rows.map(mapWarranty),
        pagination: {
          current_page: Number(pagination.current_page ?? 1),
          per_page: Number(pagination.per_page ?? 10),
          total: Number(pagination.total ?? rows.length),
          last_page: Number(pagination.last_page ?? 1),
        },
      };
    } catch (error) {
      throw new Error(normalizeErrorMessage(error, "Gagal memuat daftar garansi."));
    }
  },

  async create(payload: WarrantyPayload): Promise<WarrantyRecord> {
    try {
      const response = await api.post("/v1/admin/warranties", payload);
      return mapWarranty(toObject(response.data).data);
    } catch (error) {
      throw new Error(normalizeErrorMessage(error, "Gagal menambahkan data garansi."));
    }
  },

  async update(id: string, payload: WarrantyPayload): Promise<WarrantyRecord> {
    try {
      const response = await api.put(`/v1/admin/warranties/${id}`, payload);
      return mapWarranty(toObject(response.data).data);
    } catch (error) {
      throw new Error(normalizeErrorMessage(error, "Gagal memperbarui data garansi."));
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await api.delete(`/v1/admin/warranties/${id}`);
    } catch (error) {
      throw new Error(normalizeErrorMessage(error, "Gagal menghapus data garansi."));
    }
  },

  async searchProducts(search: string): Promise<WarrantyProductOption[]> {
    try {
      const response = await api.get("/v1/admin/products", {
        params: {
          search,
          page: 1,
          per_page: 8,
        },
      });

      const payload = toObject(response.data);
      const rows = Array.isArray(payload.data) ? payload.data : [];

      return rows.map((raw) => {
        const row = toObject(raw);
        return {
          id: toStringValue(row.id) ?? "",
          name: toStringValue(row.name) ?? "Produk",
          spu: toStringValue(row.spu),
          main_image: toStringValue(row.main_image),
        } satisfies WarrantyProductOption;
      });
    } catch (error) {
      throw new Error(normalizeErrorMessage(error, "Gagal mencari produk."));
    }
  },
};
