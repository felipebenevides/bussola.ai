import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/cefis-server";
import { getActivePlanForUser } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const plan = await getActivePlanForUser(userId);
  if (!plan) {
    return NextResponse.json({ plan: null });
  }
  return NextResponse.json({ plan });
}
