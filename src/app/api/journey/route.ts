import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/cefis-server";
import { computeJourney } from "@/lib/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  const snapshot = await computeJourney(userId);
  return NextResponse.json(snapshot);
}
