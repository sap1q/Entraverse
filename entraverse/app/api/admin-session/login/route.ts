import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl, createAdminSession, setAdminSessionCookies } from "@/lib/server/admin-session";
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
  const targetUrl = buildBackendApiUrl("/v1/admin/login");
  if (!targetUrl) {
    return backendUnavailable();
  }

  const rawBody = await request.text();
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: rawBody,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<AuthPayload> | null;
  if (!response.ok || !payload?.data?.token || !payload.data.admin) {
    return NextResponse.json(
      payload ?? {
        success: false,
        message: "Login gagal.",
        data: null,
      },
      { status: response.status || 500 }
    );
  }

  const session = createAdminSession({
    token: payload.data.token,
    admin: payload.data.admin,
    expiresIn: payload.data.expires_in,
  });

  const nextResponse = NextResponse.json(
    {
      ...payload,
      data: {
        admin: session.admin,
        token_type: payload.data.token_type,
        expires_in: payload.data.expires_in,
      },
    },
    { status: response.status }
  );

  setAdminSessionCookies(nextResponse.cookies, session);
  return nextResponse;
}
