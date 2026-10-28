import { NextResponse } from "next/server";

/**
 * Liveness/readiness probe for hosting and CI smoke tests.
 * Intentionally dependency-free until Phase 03 (then adds a DB ping).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "golf-cart-store",
    phase: "01-foundation",
    time: new Date().toISOString(),
  });
}
