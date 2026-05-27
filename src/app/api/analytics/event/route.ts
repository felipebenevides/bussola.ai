import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSessionId, recordEvent } from "@/lib/analytics-server";
import { getCurrentUserId } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  eventType: z.enum(["page_view", "action"]).default("page_view"),
  path: z.string().max(500).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const sessionId = await ensureSessionId();
  const userId = await getCurrentUserId();
  const userAgent = req.headers.get("user-agent");

  await recordEvent({
    sessionId,
    userId,
    eventType: body.eventType,
    path: body.path ?? null,
    referrer: body.referrer ?? null,
    userAgent,
    metadata: body.metadata ?? null,
  });

  return NextResponse.json({ ok: true, sessionId });
}
