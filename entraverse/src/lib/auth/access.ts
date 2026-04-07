import { TokenService } from "@/src/lib/auth/tokens";

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
  return withoutQuery.replace(/^\/api(?=\/)/, "");
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
  if (!TokenService.hasValidToken()) return "guest";
  return TokenService.getUserType() === "admin" ? "admin" : "customer";
};

export const hasStorefrontSession = (): boolean => {
  return getSessionRole() !== "guest";
};

export const buildAuthLoginRedirect = (path: string): string => {
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

    return buildAuthLoginRedirect(currentPath);
  }

  if (isCustomerApiPath(requestUrl)) {
    return buildAuthLoginRedirect(currentPath);
  }

  return buildAuthLoginRedirect(currentPath);
};
