import { resolveApiOriginUrl } from "@/lib/api-config";

const PROFILE_AVATAR_CACHE_KEY = "entraverse_profile_avatar_preview";

export const resolveApiAssetUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return resolveApiOriginUrl(trimmed);
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
