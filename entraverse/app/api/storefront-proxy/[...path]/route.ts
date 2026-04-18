import { NextRequest, NextResponse } from "next/server";
import {
  buildBackendStorefrontApiUrl,
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
      message: "Backend API storefront belum dikonfigurasi.",
      data: null,
    },
    { status: 503 }
  );

const proxyRequest = async (request: NextRequest, context: RouteContext) => {
  const { path = [] } = await context.params;
  const pathname = `/${path.join("/")}`;
  const targetUrl = buildBackendStorefrontApiUrl(pathname);
  if (!targetUrl) {
    return backendUnavailable();
  }

  const queryString = request.nextUrl.search;
  const response = await fetch(`${targetUrl}${queryString}`, {
    method: request.method,
    headers: createForwardHeaders(request),
    body: await readProxyRequestBody(request),
    cache: "no-store",
  });

  return toProxyResponse(response);
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
