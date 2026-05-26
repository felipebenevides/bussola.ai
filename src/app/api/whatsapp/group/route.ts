import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { waCreateGroup, waSendText } from "@/lib/wa-client";
import { normalizePhone } from "@/lib/phone";
import { getCurrentUserId } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GROUP_VALIDITY_DAYS = 7;
const MAX_PARTICIPANTS = 5;

const BodySchema = z.object({
  name: z.string().min(2).max(80),
  participants: z
    .array(
      z.object({
        phone: z.string().min(10).max(20),
        name: z.string().max(80).optional().nullable(),
      })
    )
    .min(1)
    .max(MAX_PARTICIPANTS),
});

export async function POST(req: NextRequest) {
  // 1. Gate: precisa estar logado na CEFIS
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      {
        error: "auth required",
        message:
          "Pra criar um grupo de estudo é preciso estar logado na CEFIS. Vá em /login.",
      },
      { status: 401 }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // 2. Normaliza e deduplica telefones
  const phones: string[] = [];
  for (const p of body.participants) {
    const np = normalizePhone(p.phone);
    if (!np) continue;
    if (!phones.includes(np)) phones.push(np);
  }
  if (phones.length === 0) {
    return NextResponse.json({ error: "no valid phone" }, { status: 400 });
  }
  if (phones.length > MAX_PARTICIPANTS) {
    return NextResponse.json(
      { error: `máximo de ${MAX_PARTICIPANTS} participantes` },
      { status: 400 }
    );
  }

  // 3. 1 grupo ativo por user (unique index na tabela já protege, mas damos
  //    erro 409 amigável antes de bater na Evolution)
  const supabase = supabaseAdmin();
  const { data: existing } = await supabase
    .from("study_groups")
    .select("id, group_name, evolution_group_jid, expires_at, status")
    .eq("creator_user_id", userId)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "already exists",
        message:
          "Você já tem um grupo de estudo ativo. Espere ele expirar (7 dias) pra criar outro.",
        group: existing,
      },
      { status: 409 }
    );
  }

  // 4. Persiste linha pending antes de chamar Evolution (idempotência se
  //    o request travar)
  const expiresAt = new Date(
    Date.now() + GROUP_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const participantsJson = body.participants
    .map((p, i) => ({ phone: phones[i] ?? null, name: (p.name ?? "").trim() || null }))
    .filter((p): p is { phone: string; name: string | null } => !!p.phone);

  const { data: pending, error: insErr } = await supabase
    .from("study_groups")
    .insert({
      creator_user_id: userId,
      group_name: body.name,
      participants: participantsJson,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insErr || !pending) {
    return NextResponse.json(
      { error: "db insert failed", detail: insErr?.message },
      { status: 500 }
    );
  }

  // 5. Cria grupo via Evolution (síncrono pq retornamos o JID na resposta)
  let jid: string;
  try {
    const res = await waCreateGroup({
      subject: body.name,
      description: `Grupo de estudo Bússola · expira em ${GROUP_VALIDITY_DAYS} dias`,
      participants: phones,
    });
    jid = res.jid;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("study_groups")
      .update({ status: "failed", evolution_error: msg })
      .eq("id", pending.id);
    return NextResponse.json(
      { error: "evolution failed", detail: msg },
      { status: 502 }
    );
  }

  await supabase
    .from("study_groups")
    .update({ status: "active", evolution_group_jid: jid })
    .eq("id", pending.id);

  // 6. Mensagem de boas-vindas dentro do grupo recém-criado (a fila do Bun
  //    cuida do delay de 10s)
  try {
    await waSendText(
      jid,
      [
        `📚 *Grupo de estudo "${body.name}" criado!*`,
        "",
        "🧭 Aqui é a *Bússola*, sua tutora baseada no catálogo CEFIS.",
        "",
        `Esse grupo é exclusivo do *plano demo* e fica ativo por *${GROUP_VALIDITY_DAYS} dias*.`,
        "",
        "Qualquer um pode mandar dúvida — eu respondo com a aula no segundo certo.",
        "",
        "Digita *menu* pra ver as opções.",
      ].join("\n")
    );
  } catch {
    // não fatal — grupo já existe, apenas o broadcast falhou
  }

  return NextResponse.json({
    ok: true,
    id: pending.id,
    jid,
    expiresAt,
    participants: phones,
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ group: null, authenticated: false });
  }
  const { data } = await supabaseAdmin()
    .from("study_groups")
    .select("id, group_name, evolution_group_jid, participants, status, created_at, expires_at")
    .eq("creator_user_id", userId)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ group: data ?? null, authenticated: true });
}
