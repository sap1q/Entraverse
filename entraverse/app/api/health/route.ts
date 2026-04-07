import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "entraverse-internal-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
