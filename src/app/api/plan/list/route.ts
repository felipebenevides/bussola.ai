import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/cefis-server";
import { listPlansForUser } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ plans: [], authenticated: false });
  }
  const plans = await listPlansForUser(userId);
  return NextResponse.json({ plans, authenticated: true });
}
