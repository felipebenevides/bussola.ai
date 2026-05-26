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
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // 1. Normaliza e deduplica telefones (preservando ordem do input)
  const phones: string[] = [];
  const participantsNorm: Array<{ phone: string; name: string | null }> = [];
  for (const p of body.participants) {
    const np = normalizePhone(p.phone);
    if (!np || phones.includes(np)) continue;
    phones.push(np);
    participantsNorm.push({ phone: np, name: (p.name ?? "").trim() || null });
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

  // 2. Identidade: prioriza CEFIS login; senão usa o 1º participante como
  //    organizador anônimo (beta aberto).
  const userId = await getCurrentUserId();
  const creatorPhone = userId ? null : phones[0];

  const supabase = supabaseAdmin();

  // 3. Já tem grupo ativo? (mesma identidade)
  let existingQuery = supabase
    .from("study_groups")
    .select("id, group_name, evolution_group_jid, expires_at, status")
    .in("status", ["pending", "active"]);
  existingQuery = userId
    ? existingQuery.eq("creator_user_id", userId)
    : existingQuery.eq("creator_phone", creatorPhone!).is("creator_user_id", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "already exists",
        message:
          "Já existe um grupo ativo pra você. Aguarde os 7 dias da demo expirar antes de criar outro.",
        group: existing,
      },
      { status: 409 }
    );
  }

  // 4. Persiste linha pending antes de chamar Evolution
  const expiresAt = new Date(
    Date.now() + GROUP_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: pending, error: insErr } = await supabase
    .from("study_groups")
    .insert({
      creator_user_id: userId,
      creator_phone: creatorPhone,
      group_name: body.name,
      participants: participantsNorm,
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

  // 5. Cria grupo via Evolution
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

  // 6. Mensagem de boas-vindas no grupo
  try {
    await waSendText(
      jid,
      [
        `📚 *Grupo de estudo "${body.name}" criado!*`,
        "",
        "🧭 Aqui é a *Bússola*, sua tutora baseada no catálogo CEFIS.",
        "",
        `Esse grupo é do *plano demo* (aberto pra beta) e fica ativo por *${GROUP_VALIDITY_DAYS} dias*.`,
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
    mode: userId ? "cefis" : "beta-anonymous",
  });
}

export async function GET() {
  const userId = await getCurrentUserId();
  // Anônimo não tem como ser identificado sem o telefone — devolve null mas
  // não erra. A interface vai assumir "sem grupo ativo" e permitir criar.
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
