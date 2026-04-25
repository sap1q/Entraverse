import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/src/constants/auth-cookies";
import { buildBackendApiUrl, clearAdminSessionCookies, readAdminSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  const session = readAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const targetUrl = buildBackendApiUrl("/v1/admin/logout");

  if (targetUrl && session?.token) {
    try {
      await fetch(targetUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
        cache: "no-store",
      });
    } catch {
      // Frontend cookie cleanup should continue even if backend logout fails.
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil.",
    data: null,
  });

  clearAdminSessionCookies(response.cookies);
  return response;
}
