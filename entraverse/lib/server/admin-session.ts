import { createHmac, timingSafeEqual } from "node:crypto";
import type { Admin } from "@/types/auth.types";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_HINT_COOKIE } from "@/src/constants/auth-cookies";

type AdminSummary = Pick<Admin, "id" | "name" | "email" | "role">;

type AdminSessionPayload = {
  token: string;
  expiresAt: number;
  admin: AdminSummary;
};

type AdminSessionHintPayload = {
  role: "admin";
  expiresAt: number;
  adminId: string;
};

type CookieWriter = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    }
  ) => void;
};

const DEFAULT_SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;

const getSessionSecret = (): string =>
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  process.env.MOCK_ADMIN_SIGNING_KEY?.trim() ||
  "entraverse-admin-session-dev-secret";

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");

const toBase64Url = (value: string): string => Buffer.from(value).toString("base64url");

const fromBase64Url = (value: string): string => Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string): string =>
  createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");

const encodeSignedPayload = (payload: object): string => {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

const decodeSignedPayload = <T>(rawValue: string | null | undefined): T | null => {
  if (!rawValue) return null;

  const [encodedPayload, signature] = rawValue.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload)) as T;
  } catch {
    return null;
  }
};

const sanitizeAdmin = (admin: Admin): AdminSummary => ({
  id: String(admin.id),
  name: String(admin.name),
  email: String(admin.email),
  role: admin.role,
});

const resolveExpiresAt = (expiresIn?: number | null): number => {
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + (expiresIn * 1000);
  }

  return Date.now() + (DEFAULT_SESSION_LIFETIME_SECONDS * 1000);
};

const getCookieMaxAge = (expiresAt: number): number =>
  Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

const getCookieOptions = (maxAge: number, httpOnly: boolean) => ({
  httpOnly,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export const createAdminSession = (params: {
  token: string;
  admin: Admin;
  expiresIn?: number | null;
}) => {
  const expiresAt = resolveExpiresAt(params.expiresIn);
  const admin = sanitizeAdmin(params.admin);

  const sessionPayload: AdminSessionPayload = {
    token: params.token,
    expiresAt,
    admin,
  };

  const hintPayload: AdminSessionHintPayload = {
    role: "admin",
    expiresAt,
    adminId: admin.id,
  };

  return {
    admin,
    expiresAt,
    maxAge: getCookieMaxAge(expiresAt),
    sessionValue: encodeSignedPayload(sessionPayload),
    hintValue: encodeSignedPayload(hintPayload),
  };
};

export const readAdminSession = (rawValue: string | null | undefined): AdminSessionPayload | null => {
  const payload = decodeSignedPayload<AdminSessionPayload>(rawValue);
  if (!payload?.token || !payload.admin?.id || !payload.expiresAt) {
    return null;
  }

  if (Date.now() >= payload.expiresAt) {
    return null;
  }

  return payload;
};

export const readAdminHint = (rawValue: string | null | undefined): AdminSessionHintPayload | null => {
  const payload = decodeSignedPayload<AdminSessionHintPayload>(rawValue);
  if (!payload?.adminId || payload.role !== "admin" || !payload.expiresAt) {
    return null;
  }

  if (Date.now() >= payload.expiresAt) {
    return null;
  }

  return payload;
};

export const setAdminSessionCookies = (
  cookies: CookieWriter,
  session: ReturnType<typeof createAdminSession>
): void => {
  cookies.set(ADMIN_SESSION_COOKIE, session.sessionValue, getCookieOptions(session.maxAge, true));
  cookies.set(ADMIN_SESSION_HINT_COOKIE, session.hintValue, getCookieOptions(session.maxAge, false));
};

export const clearAdminSessionCookies = (cookies: CookieWriter): void => {
  cookies.set(ADMIN_SESSION_COOKIE, "", getCookieOptions(0, true));
  cookies.set(ADMIN_SESSION_HINT_COOKIE, "", getCookieOptions(0, false));
};

const normalizeBackendStorefrontPath = (path: string, apiBaseUrl: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath.startsWith("/v1/")) {
    return normalizedPath;
  }

  const hasApiV1 = /\/api\/v1$/i.test(normalizeBaseUrl(apiBaseUrl));
  const prefix = hasApiV1 ? "" : "/v1";

  if (normalizedPath === "/user" || normalizedPath.startsWith("/user/")) {
    return `${prefix}${normalizedPath}`;
  }

  if (normalizedPath === "/user-addresses" || normalizedPath.startsWith("/user-addresses/")) {
    return `${prefix}/user/addresses${normalizedPath.slice("/user-addresses".length)}`;
  }

  if (normalizedPath === "/user/addresses" || normalizedPath.startsWith("/user/addresses/")) {
    return `${prefix}${normalizedPath}`;
  }

  if (normalizedPath === "/orders" || normalizedPath.startsWith("/orders/")) {
    return `${prefix}${normalizedPath}`;
  }

  if (normalizedPath === "/shipping/cost" || normalizedPath === "/checkout/process" || normalizedPath === "/trade-in/transactions") {
    return `${prefix}${normalizedPath}`;
  }

  return normalizedPath;
};

export const getBackendApiBaseUrl = (): string | null => {
  const configuredValue = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!configuredValue) return null;
  return normalizeBaseUrl(configuredValue);
};

export const buildBackendApiUrl = (path: string): string | null => {
  const baseUrl = getBackendApiBaseUrl();
  if (!baseUrl) return null;
  const normalizedPath = normalizeBackendStorefrontPath(path, baseUrl);
  return `${baseUrl}${normalizedPath}`;
};
