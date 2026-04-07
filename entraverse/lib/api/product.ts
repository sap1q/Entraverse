import { isAxiosError } from "axios";
import client from "@/lib/api/client";
import { PRODUCT_ENDPOINTS } from "@/lib/constants";

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    await client.delete(PRODUCT_ENDPOINTS.adminDelete(productId));
  } catch (error) {
    if (isAxiosError(error)) {
      const message =
        (typeof error.response?.data?.message === "string" && error.response.data.message) ||
        error.message ||
        "Gagal menghapus produk.";

      throw Object.assign(new Error(message), { status: error.response?.status });
    }

    throw error;
  }
};

export type QuickProductStatusPayload = {
  status?: "active" | "inactive" | "draft";
  is_featured?: boolean;
  stock_status?: "in_stock" | "out_of_stock" | "preorder";
};

type QuickProductStatusApiResponse = {
  data?: Record<string, unknown>;
};

export const patchProductStatus = async (
  productId: string,
  payload: QuickProductStatusPayload
): Promise<Record<string, unknown> | null> => {
  try {
    const response = await client.patch<QuickProductStatusApiResponse>(
      PRODUCT_ENDPOINTS.adminStatus(productId),
      payload
    );
    return response.data?.data ?? null;
  } catch (error) {
    if (isAxiosError(error)) {
      const message =
        (typeof error.response?.data?.message === "string" && error.response.data.message) ||
        error.message ||
        "Gagal memperbarui status produk.";

      throw Object.assign(new Error(message), { status: error.response?.status });
    }

    throw error;
  }
};
