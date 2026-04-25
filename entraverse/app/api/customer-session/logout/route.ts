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
      data: null,
    },
    { status: 503 }
  );

export async function POST(request: NextRequest) {
  const targetUrl = buildBackendOriginUrl("/logout");
  if (!targetUrl) {
    return backendUnavailable();
  }

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: createForwardHeaders(request),
    body: await readProxyRequestBody(request),
    cache: "no-store",
  });

  return toProxyResponse(response);
}
