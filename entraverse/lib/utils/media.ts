import { resolveApiOriginUrl } from "@/lib/api-config";
import { STOREFRONT_MEDIA_PROXY_PREFIX } from "@/src/constants/auth-cookies";

const PROFILE_AVATAR_CACHE_KEY = "entraverse_profile_avatar_preview";

const ABSOLUTE_URL_REGEX = /^(https?:)?\/\//i;

const normalizePath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed.replace(/^\/+/, "")}`;
};

const toStorefrontMediaProxyUrl = (value: string): string | null => {
  const absoluteApiOrigin = resolveApiOriginUrl("/");

  try {
    const assetUrl = new URL(value, absoluteApiOrigin);
    const apiOriginUrl = new URL(absoluteApiOrigin);
    const isLegacyLocalBackendHost =
      assetUrl.hostname === "localhost" ||
      assetUrl.hostname === "127.0.0.1" ||
      assetUrl.hostname === "::1";

    if (assetUrl.origin !== apiOriginUrl.origin && !isLegacyLocalBackendHost) {
      return assetUrl.toString();
    }

    const path = `${assetUrl.pathname}${assetUrl.search}`;
    return `${STOREFRONT_MEDIA_PROXY_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
  } catch {
    return null;
  }
};

export const resolveApiAssetUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(STOREFRONT_MEDIA_PROXY_PREFIX)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return toStorefrontMediaProxyUrl(trimmed) ?? normalizePath(trimmed);
  }

  if (ABSOLUTE_URL_REGEX.test(trimmed)) {
    return toStorefrontMediaProxyUrl(trimmed) ?? trimmed;
  }

  return toStorefrontMediaProxyUrl(resolveApiOriginUrl(trimmed)) ?? resolveApiOriginUrl(trimmed);
};

export const getNameInitials = (value: string | null | undefined, fallback = "U"): string => {
  const parts = (value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return fallback;

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

const canUseStorage = () => typeof window !== "undefined";

export const getCachedProfileAvatar = (): string | null => {
  if (!canUseStorage()) return null;

  const value = window.localStorage.getItem(PROFILE_AVATAR_CACHE_KEY);
  return value && value.trim() !== "" ? value : null;
};

export const setCachedProfileAvatar = (value: string | null | undefined): void => {
  if (!canUseStorage()) return;

  if (!value || value.trim() === "") {
    window.localStorage.removeItem(PROFILE_AVATAR_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(PROFILE_AVATAR_CACHE_KEY, value);
};

export const clearCachedProfileAvatar = (): void => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PROFILE_AVATAR_CACHE_KEY);
};

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Gagal membaca file avatar."));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file avatar."));
    reader.readAsDataURL(file);
  });
