import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { waSendText } from "@/lib/wa-client";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BodySchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().max(80).optional().nullable(),
  /** Mensagem customizada — se vier, substitui o welcome menu padrão.
   *  Usado pelo ChannelToggle pra continuar conteúdo no WhatsApp. */
  text: z.string().max(2000).optional().nullable(),
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
const RATE_LIMIT_MAX = 3; // 3 convites por número a cada 15 min

function inviteMessage(name: string | null): string {
  const hi = name ? `Oi, ${name}!` : "Oi!";
  return [
    `🧭 ${hi} Aqui é a *Bússola*, sua tutora baseada no catálogo CEFIS.`,
    "",
    "Você pediu para eu chamar pelo WhatsApp 💬",
    "",
    "Como posso te ajudar?",
    "",
    "1️⃣  *Listar cursos* indexados",
    "2️⃣  *Acessar o app* na web",
    "3️⃣  *Estudar pelo zap* — me manda sua dúvida que eu respondo com a aula no segundo certo",
    "",
    "Responde *1*, *2* ou *3* — ou já manda sua pergunta direto.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const phone = normalizePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "invalid phone" }, { status: 400 });
  }

  // Anti-abuso: até 3 convites do mesmo número numa janela de 15 min
  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin()
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("direction", "out")
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "too many invites", retryAfterMinutes: 15 },
        { status: 429 }
      );
    }
  } catch {
    // se a checagem falhar, segue — preferimos enviar a bloquear no caminho feliz
  }

  const customText = (body.text ?? "").trim();
  const text = customText
    ? customText.length > 2000
      ? customText.slice(0, 1990) + "…"
      : customText
    : inviteMessage((body.name ?? "").trim() || null);

  try {
    await waSendText(phone, text);
  } catch (err) {
    console.error("[whatsapp/invite] send failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }

  try {
    await supabaseAdmin().from("whatsapp_messages").insert({
      user_id: null,
      phone,
      direction: "out",
      kind: "text",
      content: text,
      evolution_message_id: null,
    });
  } catch {
    // não-crítico
  }

  return NextResponse.json({ ok: true, queued: true });
}
