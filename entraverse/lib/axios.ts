import axios, { isAxiosError, type AxiosError } from "axios";
import {
  isAdminApiPath,
  isCustomerApiPath,
  getSessionRole,
  normalizeRequestPath,
  resolveUnauthorizedDestination,
  usesAuthenticatedApi,
} from "@/src/lib/auth/access";
import { TokenService } from "@/src/lib/auth/tokens";
import { API_BASE_URL } from "@/lib/api-config";
import {
  ADMIN_PROXY_PREFIX,
  ADMIN_SESSION_ENDPOINTS,
  ADMIN_STOREFRONT_PROXY_PREFIX,
  CUSTOMER_SESSION_ENDPOINTS,
  STOREFRONT_PROXY_PREFIX,
} from "@/src/constants/auth-cookies";

const CSRF_COOKIE_ENDPOINT = CUSTOMER_SESSION_ENDPOINTS.csrfCookie;
const CSRF_REFRESH_INTERVAL = 4 * 60 * 60 * 1000;
const XSRF_COOKIE_NAME = "XSRF-TOKEN";
const XSRF_HEADER_NAME = "X-XSRF-TOKEN";

let csrfCookiePromise: Promise<void> | null = null;
let csrfLastFetched = 0;

const buildAdminProxyUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith(ADMIN_PROXY_PREFIX)) return url;

  const normalized = url.replace(/^https?:\/\/[^/]+/i, "");
  const [path, query = ""] = normalized.split("?");
  const basePath = path.startsWith("/") ? path : `/${path}`;
  return query ? `${ADMIN_PROXY_PREFIX}${basePath}?${query}` : `${ADMIN_PROXY_PREFIX}${basePath}`;
};

const buildAdminStorefrontProxyUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith(ADMIN_STOREFRONT_PROXY_PREFIX)) return url;

  const normalized = url.replace(/^https?:\/\/[^/]+/i, "");
  const [path, query = ""] = normalized.split("?");
  const basePath = path.startsWith("/") ? path : `/${path}`;
  return query ? `${ADMIN_STOREFRONT_PROXY_PREFIX}${basePath}?${query}` : `${ADMIN_STOREFRONT_PROXY_PREFIX}${basePath}`;
};

const buildStorefrontProxyUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith(STOREFRONT_PROXY_PREFIX)) return url;

  const normalized = url.replace(/^https?:\/\/[^/]+/i, "");
  const [path, query = ""] = normalized.split("?");
  const basePath = path.startsWith("/") ? path : `/${path}`;
  return query ? `${STOREFRONT_PROXY_PREFIX}${basePath}?${query}` : `${STOREFRONT_PROXY_PREFIX}${basePath}`;
};

const isAppInternalApiUrl = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith("/api/");
};

const usesBearerToken = (url: string): boolean => {
  return isCustomerApiPath(url);
};

const shouldUseCsrfCookie = (url: string): boolean => {
  if (!url) return false;
  if (url.includes("/sanctum/csrf-cookie")) return false;

  const normalizedPath = normalizeRequestPath(url);

  return normalizedPath === "/login" ||
    normalizedPath === "/customer-session/login" ||
    normalizedPath === "/register" ||
    normalizedPath === "/customer-session/register" ||
    normalizedPath === "/logout" ||
    normalizedPath === "/customer-session/logout" ||
    normalizedPath === "/forgot-password" ||
    normalizedPath === "/reset-password";
};

const ensureCsrfCookie = async (force = false) => {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (!force && csrfCookiePromise && (now - csrfLastFetched) < CSRF_REFRESH_INTERVAL) {
    return csrfCookiePromise;
  }

  if (force) {
    csrfCookiePromise = null;
    csrfLastFetched = 0;
  }

  csrfCookiePromise = axios
    .get(CSRF_COOKIE_ENDPOINT, {
      withCredentials: true,
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
    .then(() => {
      csrfLastFetched = now;
    })
    .catch((error: Error) => {
      console.warn("[CSRF] Failed to fetch CSRF cookie:", error.message);
      csrfCookiePromise = null;
      throw error;
    });

  return csrfCookiePromise;
};

const readCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const target = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(target));

  if (!cookie) return null;

  const rawValue = cookie.slice(target.length);

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

const syncXsrfHeader = (headers: unknown) => {
  const token = readCookieValue(XSRF_COOKIE_NAME);
  if (!token || !headers) return;

  if (typeof headers === "object" && headers !== null && "set" in headers && typeof headers.set === "function") {
    headers.set(XSRF_HEADER_NAME, token);
    return;
  }

  if (typeof headers === "object" && headers !== null) {
    (headers as Record<string, unknown>)[XSRF_HEADER_NAME] = token;
  }
};

const clearXsrfHeader = (headers: unknown) => {
  if (!headers || typeof headers !== "object") return;

  const headerNames = [XSRF_HEADER_NAME, XSRF_HEADER_NAME.toLowerCase()];

  if ("delete" in headers && typeof headers.delete === "function") {
    const headersWithDelete = headers as { delete: (headerName: string) => void };
    headerNames.forEach((headerName) => headersWithDelete.delete(headerName));
    return;
  }

  const plainHeaders = headers as Record<string, unknown>;
  headerNames.forEach((headerName) => {
    delete plainHeaders[headerName];
  });
};

export const getAuthToken = (): string | null => {
  if (TokenService.hasValidToken()) {
    return TokenService.getToken();
  }

  if (getSessionRole() === "admin") {
    return "__admin_cookie_session__";
  }

  return null;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

export const apiUpload = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

export const persistAuthToken = (
  token: string,
  rememberMe?: boolean,
  expiresIn?: number,
  refreshToken?: string | null
) => {
  if (!token) return;

  if (typeof rememberMe === "boolean" || typeof expiresIn === "number" || refreshToken !== undefined) {
    TokenService.setToken(token, rememberMe ?? false, expiresIn, refreshToken);
  }

  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  apiUpload.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const clearPersistedAuth = () => {
  TokenService.logout();
  delete api.defaults.headers.common.Authorization;
  delete apiUpload.defaults.headers.common.Authorization;
};

const attachDefaultAuthorization = () => {
  const token = getAuthToken();
  if (!token || token === "__admin_cookie_session__") return;

  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  apiUpload.defaults.headers.common.Authorization = `Bearer ${token}`;
};

attachDefaultAuthorization();

const handleUnauthorizedResponse = async (
  error: AxiosError,
  retryRequest: (requestConfig: Record<string, unknown>) => Promise<unknown>
) => {
  const status = error.response?.status;
  const requestUrl = String(error.config?.url ?? "");
  const isAuthFlowRequest =
    requestUrl.includes(ADMIN_SESSION_ENDPOINTS.login) ||
    requestUrl.includes(ADMIN_SESSION_ENDPOINTS.register) ||
    requestUrl.includes(ADMIN_SESSION_ENDPOINTS.logout) ||
    requestUrl.includes("/sanctum/csrf-cookie");

  if (status === 401 && !isAuthFlowRequest && usesAuthenticatedApi(requestUrl)) {
    const sessionRole = getSessionRole();
    const originalRequest = (error.config ?? {}) as Record<string, unknown> & {
      _retry?: boolean;
      headers?: Record<string, string>;
    };

    if (!originalRequest._retry && isCustomerApiPath(requestUrl)) {
      originalRequest._retry = true;
      const newToken = await TokenService.refreshToken();

      if (newToken) {
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        };
        return retryRequest(originalRequest);
      }
    }

    clearPersistedAuth();
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname + window.location.search;
      const nextLocation = resolveUnauthorizedDestination({
        requestUrl,
        currentPath,
        sessionRole,
      });

      if (window.location.pathname + window.location.search !== nextLocation) {
        window.location.href = nextLocation;
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[API Error] ${status ?? "NO_STATUS"} ${requestUrl}`, error.response?.data);
  }

  return Promise.reject(error);
};

const retryOnCsrfMismatch = async (
  error: AxiosError,
  retryRequest: (requestConfig: Record<string, unknown>) => Promise<unknown>
) => {
  const status = error.response?.status;
  const requestUrl = String(error.config?.url ?? "");
  const method = String(error.config?.method ?? "get").toLowerCase();
  const originalRequest = (error.config ?? {}) as Record<string, unknown> & {
    _csrfRetry?: boolean;
    headers?: unknown;
  };

  if (
    status === 419 &&
    !originalRequest._csrfRetry &&
    ["post", "put", "patch", "delete"].includes(method) &&
    shouldUseCsrfCookie(requestUrl) &&
    !requestUrl.includes("/sanctum/csrf-cookie")
  ) {
    originalRequest._csrfRetry = true;
    await ensureCsrfCookie(true);
    clearXsrfHeader(originalRequest.headers);
    return retryRequest(originalRequest);
  }

  return null;
};

api.interceptors.request.use(
  async (config) => {
    const method = String(config.method ?? "get").toLowerCase();
    const originalUrl = String(config.url ?? "");
    const sessionRole = getSessionRole();
    const requestUrl = originalUrl.startsWith(ADMIN_PROXY_PREFIX) || originalUrl.startsWith(ADMIN_STOREFRONT_PROXY_PREFIX)
      ? originalUrl
      : isAdminApiPath(originalUrl)
        ? buildAdminProxyUrl(originalUrl)
        : sessionRole === "admin" && isCustomerApiPath(originalUrl)
          ? buildAdminStorefrontProxyUrl(originalUrl)
          : isCustomerApiPath(originalUrl)
            ? buildStorefrontProxyUrl(originalUrl)
            : originalUrl;

    if (requestUrl !== originalUrl) {
      config.baseURL = "";
      config.url = requestUrl;
    }

    if (isAppInternalApiUrl(String(config.url ?? ""))) {
      config.baseURL = "";
    }

    if (["post", "put", "patch", "delete"].includes(method) && shouldUseCsrfCookie(requestUrl)) {
      await ensureCsrfCookie();
      syncXsrfHeader(config.headers);
    }

    const token = getAuthToken();
    if (token && token !== "__admin_cookie_session__" && usesBearerToken(requestUrl)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    if (process.env.NODE_ENV === "development") {
      const safeData = (() => {
        if (!config.data || typeof config.data !== "object") return config.data;
        const clone = { ...(config.data as Record<string, unknown>) };
        if (typeof clone.password === "string") clone.password = "***";
        return clone;
      })();

      console.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: safeData,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiUpload.interceptors.request.use(
  async (config) => {
    const method = String(config.method ?? "get").toLowerCase();
    const originalUrl = String(config.url ?? "");
    const sessionRole = getSessionRole();
    const requestUrl = originalUrl.startsWith(ADMIN_PROXY_PREFIX) || originalUrl.startsWith(ADMIN_STOREFRONT_PROXY_PREFIX)
      ? originalUrl
      : isAdminApiPath(originalUrl)
        ? buildAdminProxyUrl(originalUrl)
        : sessionRole === "admin" && isCustomerApiPath(originalUrl)
          ? buildAdminStorefrontProxyUrl(originalUrl)
          : isCustomerApiPath(originalUrl)
            ? buildStorefrontProxyUrl(originalUrl)
            : originalUrl;

    if (requestUrl !== originalUrl) {
      config.baseURL = "";
      config.url = requestUrl;
    }

    if (isAppInternalApiUrl(String(config.url ?? ""))) {
      config.baseURL = "";
    }

    if (["post", "put", "patch", "delete"].includes(method) && shouldUseCsrfCookie(requestUrl)) {
      await ensureCsrfCookie();
      syncXsrfHeader(config.headers);
    }

    const token = getAuthToken();
    if (token && token !== "__admin_cookie_session__" && usesBearerToken(requestUrl)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[API Response] ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const csrfRetried = await retryOnCsrfMismatch(error, (requestConfig) => api(requestConfig));
    if (csrfRetried) {
      return csrfRetried;
    }

    return handleUnauthorizedResponse(error, (requestConfig) => api(requestConfig));
  }
);

apiUpload.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const csrfRetried = await retryOnCsrfMismatch(error, (requestConfig) => apiUpload(requestConfig));
    if (csrfRetried) {
      return csrfRetried;
    }

    return handleUnauthorizedResponse(error, (requestConfig) => apiUpload(requestConfig));
  }
);

export default api;
export { ensureCsrfCookie, isAxiosError };
