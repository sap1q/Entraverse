const LOCAL_APP_ORIGIN = "http://localhost:3000";
const DEFAULT_PUBLIC_APP_ORIGIN = "https://entraverse.vercel.app";
const LEGACY_EXTERNAL_API_BASE_URLS = new Set([
  "https://api.entraverse.com/api",
  "https://api.entraver.com/api",
]);

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");

const resolveConfiguredApiBaseUrl = (): string => {
  const configuredValue = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  if (!configuredValue) return "";

  const normalizedValue = normalizeBaseUrl(configuredValue);
  if (LEGACY_EXTERNAL_API_BASE_URLS.has(normalizedValue)) {
    return "";
  }

  return normalizedValue;
};

const resolveDefaultAppOrigin = (): string => {
  const configuredAppOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppOrigin) {
    return normalizeBaseUrl(configuredAppOrigin);
  }

  if (process.env.NODE_ENV !== "production") {
    return LOCAL_APP_ORIGIN;
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  const vercelRuntimeUrl = process.env.VERCEL_URL?.trim();
  if (vercelRuntimeUrl) {
    return `https://${vercelRuntimeUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  }

  return DEFAULT_PUBLIC_APP_ORIGIN;
};

const configuredApiBaseUrl = resolveConfiguredApiBaseUrl();
const defaultAppOrigin = resolveDefaultAppOrigin();

export const API_BASE_URL = configuredApiBaseUrl || `${defaultAppOrigin}/api`;
export const API_ORIGIN = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/api(?:\/v\d+)?\/?$/i, "")
  : defaultAppOrigin;

const ABSOLUTE_URL_REGEX = /^(https?:\/\/|data:|blob:)/i;

const normalizePath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed.replace(/^\/+/, "")}`;
};

const prependBase = (base: string, value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (ABSOLUTE_URL_REGEX.test(trimmed)) return trimmed;

  const normalizedPath = normalizePath(trimmed);
  return base ? `${base}${normalizedPath}` : normalizedPath;
};

export const resolveApiBaseUrl = (value: string): string => prependBase(API_BASE_URL, value);
export const resolveApiOriginUrl = (value: string): string => prependBase(API_ORIGIN, value);
