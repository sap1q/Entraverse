import { NextRequest, NextResponse } from "next/server";
import {
  buildBackendOriginUrl,
  createForwardHeaders,
  readProxyRequestBody,
  toProxyResponse,
} from "@/lib/server/storefront-proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const backendUnavailable = () =>
  NextResponse.json(
    {
      success: false,
      message: "Backend asset storefront belum dikonfigurasi.",
    },
    { status: 503 }
  );

const proxyAssetRequest = async (request: NextRequest, context: RouteContext) => {
  const { path = [] } = await context.params;
  const pathname = `/${path.join("/")}`;
  const targetUrl = buildBackendOriginUrl(pathname);

  if (!targetUrl) {
    return backendUnavailable();
  }

  const response = await fetch(`${targetUrl}${request.nextUrl.search}`, {
    method: request.method,
    headers: createForwardHeaders(request),
    body: await readProxyRequestBody(request),
    cache: "no-store",
  });

  return toProxyResponse(response);
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyAssetRequest(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxyAssetRequest(request, context);
}
