import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { waAddGroupParticipants } from "@/lib/wa-client";
import { normalizePhone } from "@/lib/phone";
import { getCurrentUserId } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PARTICIPANTS = 5;

const BodySchema = z.object({
  groupId: z.string().uuid(),
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

  const supabase = supabaseAdmin();

  // 1. Carrega o grupo + valida ownership (logado OU anônimo via creator_phone)
  const userId = await getCurrentUserId();
  const { data: group } = await supabase
    .from("study_groups")
    .select(
      "id, creator_user_id, creator_phone, group_name, evolution_group_jid, participants, status, expires_at"
    )
    .eq("id", body.groupId)
    .maybeSingle();

  if (!group) {
    return NextResponse.json({ error: "group not found" }, { status: 404 });
  }
  if (group.status !== "active" && group.status !== "pending") {
    return NextResponse.json({ error: "group not active" }, { status: 400 });
  }
  if (!group.evolution_group_jid) {
    return NextResponse.json({ error: "group has no jid" }, { status: 400 });
  }

  // Ownership: se grupo tem user_id, exige login do owner. Senão, qualquer um
  // que conheça o id pode adicionar (beta).
  if (group.creator_user_id && group.creator_user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 2. Normaliza + valida cota
  const existing = Array.isArray(group.participants)
    ? (group.participants as Array<{ phone: string; name: string | null }>)
    : [];
  const existingPhones = new Set(existing.map((p) => p.phone));

  const newOnes: Array<{ phone: string; name: string | null }> = [];
  for (const p of body.participants) {
    const np = normalizePhone(p.phone);
    if (!np || existingPhones.has(np)) continue;
    if (newOnes.some((n) => n.phone === np)) continue;
    newOnes.push({ phone: np, name: (p.name ?? "").trim() || null });
  }

  if (newOnes.length === 0) {
    return NextResponse.json(
      { error: "no new participants (todos já estão no grupo ou inválidos)" },
      { status: 400 }
    );
  }

  const totalAfter = existing.length + newOnes.length;
  if (totalAfter > MAX_PARTICIPANTS) {
    return NextResponse.json(
      {
        error: "exceeds quota",
        message: `Grupo já tem ${existing.length} membros. Limite total é ${MAX_PARTICIPANTS} — você pode adicionar no máximo ${MAX_PARTICIPANTS - existing.length}.`,
      },
      { status: 409 }
    );
  }

  // 3. Chama Evolution via Bun
  let result;
  try {
    result = await waAddGroupParticipants({
      groupJid: group.evolution_group_jid,
      participants: newOnes.map((n) => n.phone),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "evolution failed", detail: msg }, { status: 502 });
  }

  // 4. Atualiza participantes no DB (só os efetivamente aceitos, fallback p/ todos)
  const acceptedPhones = new Set(
    result.added.length > 0 ? result.added.map((j) => j.replace(/\D/g, "")) : newOnes.map((n) => n.phone)
  );
  const acceptedRows = newOnes.filter((n) => acceptedPhones.has(n.phone));
  const updated = [...existing, ...acceptedRows];

  await supabase
    .from("study_groups")
    .update({ participants: updated })
    .eq("id", group.id);

  return NextResponse.json({
    ok: true,
    added: acceptedRows,
    rejected: result.rejected,
    total: updated.length,
    remainingSlots: MAX_PARTICIPANTS - updated.length,
  });
}
