import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSessionId, recordEvent } from "@/lib/analytics-server";
import { getCurrentUserId } from "@/lib/cefis-server";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().min(8).max(20).optional().nullable(),
  /** Pra correlacionar com a tela onde a identificação aconteceu */
  source: z
    .enum(["login", "onboarding", "invite_modal", "group_modal", "other"])
    .default("other"),
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
  const email = body.email?.trim().toLowerCase() || null;
  const phone = body.phone ? normalizePhone(body.phone) : null;

  await recordEvent({
    sessionId,
    userId,
    email,
    phone,
    eventType: "identify",
    userAgent,
    metadata: { source: body.source },
  });

  // Quando a identificação inclui email/phone, propaga PARA TRÁS na sessão:
  // todos os eventos anteriores do mesmo session_id ganham o email/phone
  // pra facilitar análise (junção sem JOIN).
  if (email || phone) {
    try {
      const patch: Record<string, string> = {};
      if (email) patch.email = email;
      if (phone) patch.phone = phone;
      await supabaseAdmin()
        .from("analytics_events")
        .update(patch)
        .eq("session_id", sessionId)
        .or(
          [
            email ? "email.is.null" : null,
            phone ? "phone.is.null" : null,
          ]
            .filter(Boolean)
            .join(",")
        );
    } catch {
      // não-crítico
    }
  }

  return NextResponse.json({ ok: true, sessionId });
}
