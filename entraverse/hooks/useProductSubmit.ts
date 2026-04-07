"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api, { apiUpload, clearPersistedAuth, getAuthToken, isAxiosError } from "@/lib/axios";
import { useToast } from "@/hooks/useToast";

type SubmitMode = "create" | "edit";

type SubmitOptions = {
  payload: Record<string, unknown> | FormData;
  mode: SubmitMode;
  productId?: string;
};

type SubmitSuccess = {
  ok: true;
  data: unknown;
};

type SubmitValidationError = {
  ok: false;
  validationErrors: Record<string, string[]>;
};

type SubmitFailure = {
  ok: false;
};

export type SubmitProductResult = SubmitSuccess | SubmitValidationError | SubmitFailure;

const getPayloadSize = (payload: Record<string, unknown> | FormData): number => {
  try {
    if (payload instanceof FormData) {
      const entries = Array.from(payload.entries()).map(([key, value]) => [key, String(value)]);
      return new Blob([JSON.stringify(entries)]).size;
    }
    return new Blob([JSON.stringify(payload)]).size;
  } catch {
    return -1;
  }
};

const getUnknownErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (typeof err === "object" && err !== null) {
    try {
      const asJson = JSON.stringify(err);
      if (asJson && asJson !== "{}") return asJson;
    } catch {
      // noop
    }
  }
  return "Objek error kosong. Kemungkinan request diblokir browser, CORS, atau server tidak merespons.";
};

const DATE_KEY_REGEX = /date/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const sanitizePayload = (input: unknown, parentKey = ""): unknown => {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizePayload(item));
  }

  if (input && typeof input === "object") {
    const output: Record<string, unknown> = {};
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
      output[key] = sanitizePayload(value, key);
    });
    return output;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();

    if (DATE_KEY_REGEX.test(parentKey)) {
      if (!trimmed || trimmed === "-" || !ISO_DATE_REGEX.test(trimmed)) return null;
      return trimmed;
    }

    return trimmed === "-" ? null : input;
  }

  if (input === undefined) return null;
  return input;
};

const hasBinaryPayload = (payload: Record<string, unknown> | FormData): payload is FormData => payload instanceof FormData;

export function useProductSubmit() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitProduct = async ({ payload, mode, productId }: SubmitOptions): Promise<SubmitProductResult> => {
    setLoading(true);
    setError(null);

    try {
      if (process.env.NODE_ENV === "development") {
        console.debug("[Product Submit Start]", {
          mode,
          productId: productId ?? null,
          hasToken: Boolean(getAuthToken()),
          apiBaseURL: String(api.defaults.baseURL ?? ""),
          payloadSizeBytes: getPayloadSize(payload),
          payloadKeys: Object.keys(payload),
        });
      }

      const token = getAuthToken();
      if (!token) {
        const message = "Sesi telah berakhir. Silakan login kembali.";
        setError(message);
        toast({
          title: "Sesi Habis",
          description: "Silakan login kembali",
          variant: "destructive",
        });
        router.push("/auth/login");
        return { ok: false };
      }

      if (mode === "edit" && !productId) {
        const message = "ID produk tidak valid untuk mode edit.";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return { ok: false };
      }

      const sanitizedPayload = hasBinaryPayload(payload)
        ? payload
        : (sanitizePayload(payload) as Record<string, unknown>);

      if (process.env.NODE_ENV === "development") {
        console.debug("[Product Submit Sanitized Payload]", {
          payloadSizeBytes: getPayloadSize(sanitizedPayload),
        });
      }

      const response = hasBinaryPayload(sanitizedPayload)
        ? mode === "edit" && productId
          ? await apiUpload.post(
              `/v1/admin/products/${productId}`,
              (() => {
                const formData = new FormData();
                sanitizedPayload.forEach((value, key) => {
                  formData.append(key, value);
                });
                formData.append("_method", "PUT");
                return formData;
              })(),
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            )
          : await apiUpload.post("/v1/admin/products", sanitizedPayload, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            })
        : mode === "edit" && productId
          ? await api.put(`/v1/admin/products/${productId}`, sanitizedPayload)
          : await api.post("/v1/admin/products", sanitizedPayload);

      toast({
        title: mode === "edit" ? "Produk Diperbarui" : "Produk Tersimpan",
        description: mode === "edit" ? "Perubahan produk berhasil disimpan." : "Produk berhasil dibuat.",
        variant: "success",
      });

      return { ok: true, data: response.data };
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        console.error("Submit product error", {
          message: err.message,
          name: err.name,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          url: err.config?.url,
          baseURL: err.config?.baseURL,
          method: err.config?.method,
          code: err.code,
          timeout: err.config?.timeout,
          hasResponse: Boolean(err.response),
          axiosSerialized: typeof err.toJSON === "function" ? err.toJSON() : undefined,
        });

        if (!err.response) {
          const message =
            err.code === "ECONNABORTED"
              ? "Koneksi timeout. Server terlalu lambat merespons."
              : "Tidak dapat terhubung ke server. Pastikan Laravel berjalan dan CORS sesuai origin frontend.";
          setError(message);
          toast({
            title: err.code === "ECONNABORTED" ? "Timeout" : "Network Error",
            description: message,
            variant: "destructive",
          });
          return { ok: false };
        }

        if (err.response?.status === 401) {
          const message = "Sesi telah berakhir. Silakan login kembali.";
          clearPersistedAuth();
          setError(message);
          toast({
            title: "Sesi Habis",
            description: "Silakan login kembali",
            variant: "destructive",
          });
          router.push("/auth/login");
          return { ok: false };
        }

        if (err.response?.status === 403) {
          const message = "Anda tidak memiliki izin untuk menyimpan produk.";
          setError(message);
          toast({
            title: "Akses Ditolak",
            description: "Anda tidak memiliki izin",
            variant: "destructive",
          });
          return { ok: false };
        }

        if (err.response?.status === 422) {
          const rawErrors = err.response.data?.errors;
          const errors =
            rawErrors && typeof rawErrors === "object" ? (rawErrors as Record<string, string[]>) : {};
          setError("Terdapat kesalahan validasi pada form.");
          toast({
            title: "Validasi Gagal",
            description: "Periksa kembali data yang diisi.",
            variant: "destructive",
          });
          return { ok: false, validationErrors: errors };
        }

        if (err.response?.status === 413) {
          const message = "Payload terlalu besar. Kurangi ukuran data varian/foto lalu coba lagi.";
          setError(message);
          toast({
            title: "Payload Too Large",
            description: message,
            variant: "destructive",
          });
          return { ok: false };
        }

        if (err.code === "ERR_NETWORK") {
          const message = "Network error. Pastikan server Laravel menyala.";
          setError(message);
          toast({
            title: "Network Error",
            description: "Tidak dapat terhubung ke server",
            variant: "destructive",
          });
          return { ok: false };
        }

        if (err.response.status >= 500) {
          const message = "Server error. Cek log Laravel untuk detail kegagalan backend.";
          setError(message);
          toast({
            title: "Server Error",
            description: message,
            variant: "destructive",
          });
          return { ok: false };
        }

        const message =
          (typeof err.response?.data?.message === "string" && err.response.data.message) ||
          err.message ||
          "Terjadi kesalahan saat menyimpan produk.";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return { ok: false };
      }

      const fallback = getUnknownErrorMessage(err);
      console.error("Submit product unknown error", { raw: err, fallback });
      setError(fallback);
      toast({
        title: "Error",
        description: fallback,
        variant: "destructive",
      });
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    submitProduct,
    loading,
    error,
  };
}
