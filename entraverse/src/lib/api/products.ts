import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { PRODUCT_ENDPOINTS } from "@/lib/constants";
import type { Product } from "@/src/types/product";

type ProductsApiResponse = {
  data?: unknown;
};

const normalizeError = (err: unknown, fallback: string): never => {
  if (isAxiosError(err)) {
    throw new Error(err.response?.data?.message ?? fallback);
  }

  throw err;
};

const toProduct = (value: unknown): Product | null => {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const id =
    typeof row.id === "number"
      ? row.id
      : typeof row.id === "string" && row.id.trim() !== ""
        ? Number.parseInt(row.id, 10)
        : Number.NaN;
  const name = typeof row.name === "string" ? row.name : null;
  const brand =
    typeof row.brand === "string"
      ? row.brand
      : row.brand && typeof row.brand === "object" && typeof (row.brand as Record<string, unknown>).name === "string"
        ? ((row.brand as Record<string, unknown>).name as string)
        : null;

  if (!Number.isFinite(id) || !name || !brand) {
    return null;
  }

  return {
    id,
    name,
    brand,
    description: typeof row.description === "string" ? row.description : null,
    price: typeof row.price === "number" ? row.price : 0,
    formatted_price: typeof row.formatted_price === "string" ? row.formatted_price : null,
    stock: typeof row.stock === "number" ? row.stock : undefined,
    main_image:
      typeof row.main_image === "string"
        ? row.main_image
        : typeof row.image === "string"
          ? row.image
          : null,
    status:
      row.status === "active" || row.status === "inactive" || row.status === "draft"
        ? row.status
        : undefined,
  };
};

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await client.get<ProductsApiResponse>(PRODUCT_ENDPOINTS.list, {
      params: {
        per_page: 20,
      },
    });

    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    return rows.map(toProduct).filter((product): product is Product => product !== null);
  } catch (err) {
    return normalizeError(err, "Gagal memuat daftar produk.");
  }
}
