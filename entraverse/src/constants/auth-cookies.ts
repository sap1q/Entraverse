export const ADMIN_SESSION_COOKIE = "entraverse_admin_session";
export const ADMIN_SESSION_HINT_COOKIE = "entraverse_admin_hint";
export const ADMIN_PROXY_PREFIX = "/api/admin-proxy";
export const ADMIN_STOREFRONT_PROXY_PREFIX = "/api/admin-storefront-proxy";
export const STOREFRONT_PROXY_PREFIX = "/api/storefront-proxy";
export const STOREFRONT_MEDIA_PROXY_PREFIX = "/api/storefront-media";

export const ADMIN_SESSION_ENDPOINTS = {
  login: "/api/admin-session/login",
  register: "/api/admin-session/register",
  logout: "/api/admin-session/logout",
} as const;

export const CUSTOMER_SESSION_ENDPOINTS = {
  csrfCookie: "/api/customer-session/csrf-cookie",
  login: "/api/customer-session/login",
  register: "/api/customer-session/register",
  logout: "/api/customer-session/logout",
} as const;
