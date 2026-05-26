import { NextResponse } from "next/server";
import { getCefisClient } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const client = await getCefisClient();
  if (!client) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  try {
    const user = await client.me();
    return NextResponse.json({ authenticated: true, user });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { authenticated: false, error: msg },
      { status: 401 }
    );
  }
}
