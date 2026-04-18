import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/src/constants/auth-cookies";
import { buildBackendApiUrl, clearAdminSessionCookies, readAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const STOREFRONT_PATH_PATTERNS = [
  /^\/user(?:\/|$)/,
  /^\/logout(?:\/|$)/,
  /^\/user-addresses(?:\/|$)/,
  /^\/user\/addresses(?:\/|$)/,
  /^\/shipping\/cost(?:\/|$)/,
  /^\/checkout\/process(?:\/|$)/,
  /^\/orders(?:\/|$)/,
  /^\/trade-in\/transactions(?:\/|$)/,
] as const;

const unauthorized = () =>
  NextResponse.json(
    {
      success: false,
      message: "Sesi admin tidak valid. Silakan login kembali.",
      data: null,
    },
    { status: 401 }
  );

const backendUnavailable = () =>
  NextResponse.json(
    {
      success: false,
      message: "Backend API belum dikonfigurasi.",
      data: null,
    },
    { status: 503 }
  );

const notFound = () =>
  NextResponse.json(
    {
      success: false,
      message: "Route storefront tidak diizinkan lewat proxy admin.",
      data: null,
    },
    { status: 404 }
  );

const forwardRequest = async (request: NextRequest, context: RouteContext) => {
  const { path = [] } = await context.params;
  const cookieStore = await cookies();
  const session = readAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session?.token) {
    const response = unauthorized();
    clearAdminSessionCookies(response.cookies);
    return response;
  }

  const targetPathname = `/${path.join("/")}`;
  const targetPath = `${targetPathname}${request.nextUrl.search}`;

  if (!STOREFRONT_PATH_PATTERNS.some((pattern) => pattern.test(targetPathname))) {
    return notFound();
  }

  const targetUrl = buildBackendApiUrl(targetPath);
  if (!targetUrl) {
    return backendUnavailable();
  }

  const method = request.method.toUpperCase();
  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "application/json",
    Authorization: `Bearer ${session.token}`,
    "X-Requested-With": "XMLHttpRequest",
  });

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const incomingFormData = await request.formData();
      const formData = new FormData();
      incomingFormData.forEach((value, key) => {
        formData.append(key, value);
      });
      body = formData;
    } else {
      const textBody = await request.text();
      if (textBody) {
        body = textBody;
      }
      if (contentType) {
        headers.set("Content-Type", contentType);
      }
    }
  }

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseContentType = upstreamResponse.headers.get("content-type") ?? "application/json";
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", responseContentType);

  const nextResponse = responseContentType.includes("application/json")
    ? NextResponse.json(await upstreamResponse.json().catch(() => null), {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    : new NextResponse(await upstreamResponse.arrayBuffer(), {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });

  if (upstreamResponse.status === 401) {
    clearAdminSessionCookies(nextResponse.cookies);
  }

  return nextResponse;
};

export const GET = forwardRequest;
export const POST = forwardRequest;
export const PUT = forwardRequest;
export const PATCH = forwardRequest;
export const DELETE = forwardRequest;
