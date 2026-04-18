import { NextRequest, NextResponse } from "next/server";
import { getBackendApiBaseUrl } from "@/lib/server/admin-session";

const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");

export const getBackendOriginUrl = (): string | null => {
  const apiBaseUrl = getBackendApiBaseUrl();
  if (!apiBaseUrl) return null;

  return normalizeBaseUrl(apiBaseUrl.replace(/\/api(?:\/v\d+)?$/i, ""));
};

export const buildBackendOriginUrl = (path: string): string | null => {
  const originUrl = getBackendOriginUrl();
  if (!originUrl) return null;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${originUrl}${normalizedPath}`;
};

export const buildBackendStorefrontApiUrl = (path: string): string | null => {
  const apiBaseUrl = getBackendApiBaseUrl();
  if (!apiBaseUrl) return null;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBaseUrl(apiBaseUrl)}${normalizedPath}`;
};

export const copySetCookieHeaders = (source: Headers, target: Headers): void => {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === "function" ? getSetCookie.call(source) : [];

  if (setCookies.length > 0) {
    setCookies.forEach((value) => target.append("set-cookie", value));
    return;
  }

  const rawSetCookie = source.get("set-cookie");
  if (rawSetCookie) {
    target.append("set-cookie", rawSetCookie);
  }
};

export const createForwardHeaders = (
  request: NextRequest,
  overrides: Record<string, string> = {}
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: request.headers.get("accept") || "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...overrides,
  };

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.Cookie = cookie;
  }

  const xsrfToken = request.headers.get("x-xsrf-token");
  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.Authorization = authorization;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    headers.Origin = origin;
  }

  const referer = request.headers.get("referer");
  if (referer) {
    headers.Referer = referer;
  }

  return headers;
};

export const readProxyRequestBody = async (request: NextRequest): Promise<string | undefined> => {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  return await request.text();
};

export const toProxyResponse = async (response: Response): Promise<NextResponse> => {
  const bodyBuffer = await response.arrayBuffer();
  const isBodylessStatus = response.status === 204 || response.status === 205 || response.status === 304;
  const nextResponse = new NextResponse(isBodylessStatus ? null : bodyBuffer, {
    status: response.status,
    headers: response.headers.get("content-type")
      ? {
          "Content-Type": response.headers.get("content-type") as string,
        }
      : undefined,
  });

  copySetCookieHeaders(response.headers, nextResponse.headers);
  return nextResponse;
};
