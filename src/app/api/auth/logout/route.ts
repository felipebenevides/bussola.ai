import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CEFIS_COOKIE, CEFIS_USER_COOKIE } from "@/lib/cefis-server";

export const runtime = "nodejs";

export async function POST() {
  const jar = await cookies();
  jar.delete(CEFIS_COOKIE);
  jar.delete(CEFIS_USER_COOKIE);
  return NextResponse.json({ ok: true });
}
