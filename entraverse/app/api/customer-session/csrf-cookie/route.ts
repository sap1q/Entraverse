import { NextRequest, NextResponse } from "next/server";
import {
  buildBackendOriginUrl,
  createForwardHeaders,
  readProxyRequestBody,
  toProxyResponse,
} from "@/lib/server/storefront-proxy";

export const dynamic = "force-dynamic";

const backendUnavailable = () =>
  NextResponse.json(
    {
      success: false,
      message: "Backend customer belum dikonfigurasi.",
    },
    { status: 503 }
  );

export async function GET(request: NextRequest) {
  const targetUrl = buildBackendOriginUrl("/sanctum/csrf-cookie");
  if (!targetUrl) {
    return backendUnavailable();
  }

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: createForwardHeaders(request),
    body: await readProxyRequestBody(request),
    cache: "no-store",
  });

  return toProxyResponse(response);
}
