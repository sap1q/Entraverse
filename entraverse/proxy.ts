import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_HINT_COOKIE } from "@/src/constants/auth-cookies";

const encoder = new TextEncoder();

const getSessionSecret = (): string =>
  process.env.ADMIN_SESSION_SECRET?.trim() ||
  process.env.MOCK_ADMIN_SIGNING_KEY?.trim() ||
  "entraverse-admin-session-dev-secret";

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
};

const sign = async (payload: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
};

const hasValidAdminHint = async (request: NextRequest): Promise<boolean> => {
  const rawValue = request.cookies.get(ADMIN_SESSION_HINT_COOKIE)?.value;
  if (!rawValue) return false;

  const [encodedPayload, signature] = rawValue.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = await sign(encodedPayload);
  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as {
      role?: string;
      expiresAt?: number;
    };

    return payload.role === "admin" && typeof payload.expiresAt === "number" && Date.now() < payload.expiresAt;
  } catch {
    return false;
  }
};

const buildLoginRedirect = (request: NextRequest): URL => {
  const loginUrl = new URL("/auth/login", request.url);
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("redirect", redirectTarget);
  return loginUrl;
};

const getSafeRedirectPath = (request: NextRequest): string | null => {
  const redirectTarget = request.nextUrl.searchParams.get("redirect")?.trim();
  if (!redirectTarget || !redirectTarget.startsWith("/")) {
    return null;
  }

  return redirectTarget;
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminAuthRoute = pathname === "/auth/login" || pathname === "/auth/register";
  const hasSession = await hasValidAdminHint(request);

  if (isAdminRoute && !hasSession) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  if (isAdminAuthRoute && hasSession) {
    const redirectTarget = getSafeRedirectPath(request);

    if (redirectTarget?.startsWith("/admin")) {
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }

    if (redirectTarget) {
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/auth/login", "/auth/register"],
};
