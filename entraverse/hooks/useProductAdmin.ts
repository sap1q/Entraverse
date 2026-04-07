"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api, { isAxiosError } from "@/lib/axios";
import { PRODUCT_MEDIA_MAX_PHOTOS, isInvalidPhotoValue } from "@/lib/product-media";

export type ProductDetail = {
  id: string;
  name: string;
  brand?: string | null;
  brand_id?: string | null;
  category?: string | null;
  category_id?: string | null;
  slug?: string | null;
  spu?: string | null;
  barcode?: string | null;
  description?: string | null;
  status?: string | null;
  product_status?: string | null;
  trade_in?: boolean;
  photos?: unknown[];
  images?: unknown[];
  gallery?: unknown[];
  media?: unknown[];
  main_image?: unknown;
  image?: unknown;
  inventory?: Record<string, unknown> | null;
  variants?: unknown[];
  variant_pricing?: unknown[];
};

type NormalizedPhoto = {
  url: string;
  isPrimary: boolean;
};

const URL_CANDIDATE_KEYS = [
  "url",
  "path",
  "photo",
  "image",
  "src",
  "image_url",
  "imageUrl",
  "original_url",
  "originalUrl",
  "main_image",
  "file",
  "file_name",
  "filename",
] as const;

const pickString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const findImageUrlInObject = (value: Record<string, unknown>, depth = 0): string => {
  for (const key of URL_CANDIDATE_KEYS) {
    const candidate = pickString(value[key]);
    if (candidate && !isInvalidPhotoValue(candidate)) return candidate;
  }

  if (depth >= 2) return "";

  for (const nested of Object.values(value)) {
    if (!nested || typeof nested !== "object") continue;
    const result = findImageUrlInObject(nested as Record<string, unknown>, depth + 1);
    if (result) return result;
  }

  return "";
};

const extractPhoto = (entry: unknown): NormalizedPhoto => {
  if (typeof entry === "string") {
    const url = entry.trim();
    return { url, isPrimary: false };
  }

  if (entry && typeof entry === "object") {
    const source = entry as {
      url?: unknown;
      path?: unknown;
      photo?: unknown;
      is_primary?: unknown;
      isPrimary?: unknown;
      primary?: unknown;
    };
    const directUrl =
      pickString(source.url) ||
      pickString(source.path) ||
      pickString(source.photo);
    const url = (directUrl && !isInvalidPhotoValue(directUrl))
      ? directUrl
      : findImageUrlInObject(entry as Record<string, unknown>);
    const isPrimary =
      source.is_primary === true || source.isPrimary === true || source.primary === true;
    return { url, isPrimary };
  }
  return { url: "", isPrimary: false };
};

const normalizeProductPhotos = (photos: unknown): string[] => {
  const source = Array.isArray(photos) ? photos : [];
  const ordered = source
    .map((entry, index) => ({ ...extractPhoto(entry), originalIndex: index }))
    .filter((entry) => !isInvalidPhotoValue(entry.url))
    .sort((a, b) => {
      if (a.isPrimary === b.isPrimary) return a.originalIndex - b.originalIndex;
      return a.isPrimary ? -1 : 1;
    });

  const unique = new Set<string>();
  const result: string[] = [];
  for (const entry of ordered) {
    const normalized = entry.url.trim();
    if (!normalized || unique.has(normalized)) continue;
    unique.add(normalized);
    result.push(normalized);
    if (result.length >= PRODUCT_MEDIA_MAX_PHOTOS) break;
  }

  return result;
};

const mergePhotoSources = (detail: ProductDetail): unknown[] => {
  const merged: unknown[] = [];

  // Keep explicit primary image first if provided by backend.
  if (detail.main_image != null) {
    merged.push({ url: detail.main_image, is_primary: true });
  }

  if (detail.image != null) {
    merged.push({ url: detail.image, is_primary: true });
  }

  if (Array.isArray(detail.photos)) merged.push(...detail.photos);
  if (Array.isArray(detail.images)) merged.push(...detail.images);
  if (Array.isArray(detail.gallery)) merged.push(...detail.gallery);
  if (Array.isArray(detail.media)) merged.push(...detail.media);

  // Some APIs can return a single string instead of array for photos/images.
  const photosAsScalar = (detail as { photos?: unknown }).photos;
  if (!Array.isArray(photosAsScalar) && typeof photosAsScalar === "string") {
    merged.push(photosAsScalar);
  }

  const imagesAsScalar = (detail as { images?: unknown }).images;
  if (!Array.isArray(imagesAsScalar) && typeof imagesAsScalar === "string") {
    merged.push(imagesAsScalar);
  }

  return merged;
};

const extractProduct = (payload: unknown): ProductDetail | null => {
  if (!payload) return null;
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (data && typeof data === "object") return data as ProductDetail;
  }
  if (payload && typeof payload === "object") {
    return payload as ProductDetail;
  }
  return null;
};

const isCanceled = (error: unknown): boolean => {
  if (isAxiosError(error)) return error.code === "ERR_CANCELED";
  return error instanceof DOMException && error.name === "AbortError";
};

export function useProduct(id?: string) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const requestIdRef = useRef(0);

  const fetchProduct = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestIdRef.current;
      const isLatestRequest = () => requestIdRef.current === requestId;

      if (!id) {
        if (isLatestRequest()) {
          setProduct(null);
          setNotFound(false);
          setError("ID produk tidak valid.");
          setLoading(false);
        }
        return;
      }

      if (isLatestRequest()) {
        setLoading(true);
        setError(null);
        setNotFound(false);
      }

      try {
        const endpoints = [`/v1/admin/products/${id}`, `/v1/products/${id}`];
        let detail: ProductDetail | null = null;
        let lastError: unknown = null;

        for (const endpoint of endpoints) {
          try {
            const response = await api.get(endpoint, { signal });
            detail = extractProduct(response.data);
            if (detail) break;
          } catch (candidateError) {
            if (isAxiosError(candidateError) && candidateError.response?.status === 404) {
              lastError = candidateError;
              continue;
            }
            throw candidateError;
          }
        }

        if (!detail) {
          if (process.env.NODE_ENV === "development") {
            console.debug("[Product Detail Fetch] endpoint candidates failed with 404", {
              id,
              endpoints,
              lastError,
            });
          }
          if (!isLatestRequest()) return;
          setProduct(null);
          setNotFound(true);
          setError("Produk tidak ditemukan.");
          return;
        }

        if (!isLatestRequest()) return;
        const mergedPhotoSources = mergePhotoSources(detail);
        setProduct({
          ...detail,
          photos: normalizeProductPhotos(mergedPhotoSources),
        });
        setNotFound(false);
      } catch (err) {
        if (isCanceled(err)) return;
        if (!isLatestRequest()) return;

        if (isAxiosError(err)) {
          if (err.response?.status === 404) {
            setNotFound(true);
            setError("Produk tidak ditemukan.");
          } else if (err.response?.status === 401) {
            setNotFound(false);
            setError("Sesi login berakhir. Silakan login kembali.");
          } else {
            setNotFound(false);
            setError(
              (typeof err.response?.data?.message === "string" && err.response.data.message) ||
                err.message ||
                "Gagal memuat data produk."
            );
          }
        } else {
          setNotFound(false);
          setError("Terjadi kesalahan saat memuat data produk.");
        }
        setProduct(null);
      } finally {
        if (!isLatestRequest()) return;
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchProduct(controller.signal);
    return () => controller.abort();
  }, [fetchProduct]);

  return { product, loading, error, notFound, refetch: fetchProduct };
}
