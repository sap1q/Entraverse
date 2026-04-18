import { TokenService } from "@/src/lib/auth/tokens";
import {
  ADMIN_SESSION_HINT_COOKIE,
  ADMIN_PROXY_PREFIX,
  ADMIN_STOREFRONT_PROXY_PREFIX,
  STOREFRONT_PROXY_PREFIX,
} from "@/src/constants/auth-cookies";

export type SessionRole = "guest" | "customer" | "admin";

const ADMIN_API_PATTERNS = [
  /^\/v1\/admin(?:\/|$)/,
  /^\/v1\/integrations(?:\/|$)/,
] as const;

const CUSTOMER_API_PATTERNS = [
  /^\/user(?:\/|$)/,
  /^\/logout(?:\/|$)/,
  /^\/user-addresses(?:\/|$)/,
  /^\/shipping\/cost(?:\/|$)/,
  /^\/checkout\/process(?:\/|$)/,
  /^\/orders(?:\/|$)/,
  /^\/trade-in\/transactions(?:\/|$)/,
] as const;

export const normalizeRequestPath = (url: string): string => {
  const withoutOrigin = url.replace(/^https?:\/\/[^/]+/i, "");
  const withoutQuery = withoutOrigin.split("?")[0] ?? withoutOrigin;
  return withoutQuery
    .replace(new RegExp(`^${ADMIN_PROXY_PREFIX}(?=/)`), "")
    .replace(new RegExp(`^${ADMIN_STOREFRONT_PROXY_PREFIX}(?=/)`), "")
    .replace(new RegExp(`^${STOREFRONT_PROXY_PREFIX}(?=/)`), "")
    .replace(/^\/api\/admin-proxy(?=\/)/, "")
    .replace(/^\/api\/admin-storefront-proxy(?=\/)/, "")
    .replace(/^\/api\/storefront-proxy(?=\/)/, "")
    .replace(/^\/api(?=\/)/, "");
};

const hasAdminSessionHint = (): boolean => {
  if (typeof document === "undefined") return false;

  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${ADMIN_SESSION_HINT_COOKIE}=`));
};

export const isAdminApiPath = (url: string): boolean => {
  const requestPath = normalizeRequestPath(url);
  return ADMIN_API_PATTERNS.some((pattern) => pattern.test(requestPath));
};

export const isCustomerApiPath = (url: string): boolean => {
  const requestPath = normalizeRequestPath(url);
  return CUSTOMER_API_PATTERNS.some((pattern) => pattern.test(requestPath));
};

export const usesAuthenticatedApi = (url: string): boolean => {
  if (!url) return false;
  return isAdminApiPath(url) || isCustomerApiPath(url);
};

export const getSessionRole = (): SessionRole => {
  if (TokenService.hasValidToken()) {
    return TokenService.getUserType() === "admin" ? "admin" : "customer";
  }

  const userType = TokenService.getUserType();
  const userProfile = TokenService.getUserProfile();
  if (userType === "customer" && userProfile) {
    return "customer";
  }

  const hasAdminProfile = TokenService.getUserType() === "admin" && Boolean(TokenService.getUserProfile());
  if (hasAdminProfile || hasAdminSessionHint()) {
    return "admin";
  }

  return "guest";
};

export const hasStorefrontSession = (): boolean => {
  const role = getSessionRole();
  return role === "customer" || role === "admin";
};

export const hasStorefrontAccountSession = (): boolean => {
  const role = getSessionRole();
  return role === "customer" || role === "admin";
};

export const buildStorefrontLoginRedirect = (path: string): string => {
  return `/login?redirect=${encodeURIComponent(path)}`;
};

export const buildAdminLoginRedirect = (path: string): string => {
  return `/auth/login?redirect=${encodeURIComponent(path)}`;
};

export const resolveUnauthorizedDestination = ({
  requestUrl,
  currentPath,
  sessionRole,
}: {
  requestUrl: string;
  currentPath: string;
  sessionRole: SessionRole;
}): string => {
  if (isAdminApiPath(requestUrl)) {
    if (sessionRole === "customer") {
      return "/";
    }

    return buildAdminLoginRedirect(currentPath);
  }

  if (isCustomerApiPath(requestUrl)) {
    if (sessionRole === "admin") {
      return "/";
    }

    return buildStorefrontLoginRedirect(currentPath);
  }

  return buildStorefrontLoginRedirect(currentPath);
};
