import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/src/constants/auth-cookies";
import { buildBackendApiUrl, createAdminSession, readAdminSession, setAdminSessionCookies } from "@/lib/server/admin-session";
import type { ApiResponse, AuthPayload } from "@/types/auth.types";

export const dynamic = "force-dynamic";

const backendUnavailable = () =>
  NextResponse.json(
    {
      success: false,
      message: "Backend API admin belum dikonfigurasi.",
      data: null,
    },
    { status: 503 }
  );

export async function POST(request: NextRequest) {
  const targetUrl = buildBackendApiUrl("/v1/admin/register");
  if (!targetUrl) {
    return backendUnavailable();
  }

  const cookieStore = await cookies();
  const existingSession = readAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const rawBody = await request.text();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (existingSession?.token) {
    headers.Authorization = `Bearer ${existingSession.token}`;
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: rawBody,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<AuthPayload> | null;
  if (!response.ok || !payload?.data?.admin) {
    return NextResponse.json(
      payload ?? {
        success: false,
        message: "Registrasi admin gagal.",
        data: null,
      },
      { status: response.status || 500 }
    );
  }

  const nextResponse = NextResponse.json(
    {
      ...payload,
      data: {
        admin: payload.data.admin,
        token_type: payload.data.token_type,
        expires_in: payload.data.expires_in,
      },
    },
    { status: response.status }
  );

  if (!existingSession?.token && payload.data.token) {
    const session = createAdminSession({
      token: payload.data.token,
      admin: payload.data.admin,
      expiresIn: payload.data.expires_in,
    });
    setAdminSessionCookies(nextResponse.cookies, session);
  }

  return nextResponse;
}
