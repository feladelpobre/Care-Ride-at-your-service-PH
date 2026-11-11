import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Monitoring endpoint (spec §7). Reports configuration, never secret values. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    ai: isAiConfigured() ? "configured" : "missing_key",
    storage: storageMode(),
    time: new Date().toISOString(),
  });
}
