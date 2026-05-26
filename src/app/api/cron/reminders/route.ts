import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { waSendText } from "@/lib/wa-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REMINDER_GAP_HOURS = 18; // não relembra antes desse intervalo
const MAX_PER_RUN = 25;

interface Candidate {
  user_id: string;
  phone: string;
  first_name: string | null;
  available_minutes_per_day: number | null;
  last_reminder_sent_at: string | null;
}

function reminderText(opts: {
  name: string | null;
  minutes: number | null;
}): string {
  const hi = opts.name ? `Oi, ${opts.name}!` : "Oi!";
  const timeHint =
    opts.minutes && opts.minutes > 0
      ? `Você tem ~${opts.minutes} min reservados por dia — `
      : "";
  return [
    `🧭 ${hi} Aqui é a *Bússola* lembrando do seu estudo.`,
    "",
    `${timeHint}bora avançar agora? Manda uma dúvida que eu acho a aula CEFIS no segundo certo.`,
    "",
    "Ou digita *menu* pras opções (1=cursos, 2=app web, 3=estudar).",
  ].join("\n");
}

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron envia "Authorization: Bearer <CRON_SECRET>"
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const cutoff = new Date(Date.now() - REMINDER_GAP_HOURS * 3600 * 1000).toISOString();

  // Busca números pareados elegíveis: last_reminder_sent_at é null OU antigo o suficiente
  const { data: uw, error } = await supabase
    .from("user_whatsapp")
    .select("phone, user_id, last_reminder_sent_at")
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${cutoff}`)
    .limit(MAX_PER_RUN * 2);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!uw || uw.length === 0) {
    return NextResponse.json({ sent: 0, scanned: 0 });
  }

  // Hidrata com user_profile.available_minutes_per_day e users.first_name
  const userIds = uw.map((u) => u.user_id);
  const [profilesRes, usersRes] = await Promise.all([
    supabase
      .from("user_profile")
      .select("user_id, available_minutes_per_day")
      .in("user_id", userIds),
    supabase.from("users").select("id, first_name").in("id", userIds),
  ]);

  const profileByUser = new Map<string, number | null>();
  for (const p of profilesRes.data ?? []) {
    profileByUser.set(p.user_id, p.available_minutes_per_day);
  }
  const nameByUser = new Map<string, string | null>();
  for (const u of usersRes.data ?? []) {
    nameByUser.set(u.id, u.first_name);
  }

  const candidates: Candidate[] = uw.map((u) => ({
    user_id: u.user_id,
    phone: u.phone,
    first_name: nameByUser.get(u.user_id) ?? null,
    available_minutes_per_day: profileByUser.get(u.user_id) ?? null,
    last_reminder_sent_at: u.last_reminder_sent_at,
  }));

  // Filtra: precisa ter disponibilidade declarada (>0). Sem perfil → pula.
  const eligible = candidates
    .filter((c) => (c.available_minutes_per_day ?? 0) > 0)
    .slice(0, MAX_PER_RUN);

  let sent = 0;
  const errors: Array<{ phone: string; error: string }> = [];
  for (const c of eligible) {
    try {
      await waSendText(
        c.phone,
        reminderText({ name: c.first_name, minutes: c.available_minutes_per_day })
      );
      await supabase
        .from("user_whatsapp")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("phone", c.phone);
      await supabase.from("whatsapp_messages").insert({
        user_id: c.user_id,
        phone: c.phone,
        direction: "out",
        kind: "text",
        content: "[lembrete agendado]",
        evolution_message_id: null,
      });
      sent++;
    } catch (err) {
      errors.push({
        phone: c.phone,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    scanned: candidates.length,
    eligible: eligible.length,
    sent,
    errors: errors.length,
    errorDetails: errors,
  });
}
