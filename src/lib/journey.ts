import "server-only";
import { supabaseAdmin } from "./supabase";

/**
 * Jornada do Herói — modelo simplificado em 5 fases.
 *
 * XP é derivado de eventos reais:
 *   - 10 XP por pergunta feita no tutor (web ou WhatsApp)
 *   - 5 XP por mensagem do tutor que veio com citação (proxy de "aluno acessou
 *     o conteúdo")
 *
 * Streak é calculado por dias distintos com pelo menos 1 pergunta nos últimos
 * 30 dias terminando hoje. Quebra de streak = qualquer dia sem pergunta.
 */

export interface Level {
  slug: "aprendiz" | "aventureiro" | "estrategista" | "mestre" | "lenda";
  name: string;
  phase: string; // fase da jornada de Campbell
  emoji: string;
  minXp: number;
  nextXp: number | null; // null = é o último nível
}

const LEVELS: Level[] = [
  { slug: "aprendiz",     name: "Aprendiz",     phase: "Chamado da Aventura",      emoji: "🧭", minXp: 0,   nextXp: 30  },
  { slug: "aventureiro",  name: "Aventureiro",  phase: "Cruzando o Limiar",        emoji: "🚪", minXp: 30,  nextXp: 100 },
  { slug: "estrategista", name: "Estrategista", phase: "Provas, Aliados e Inimigos", emoji: "⚔️", minXp: 100, nextXp: 250 },
  { slug: "mestre",       name: "Mestre",       phase: "Ordália e Recompensa",     emoji: "🏆", minXp: 250, nextXp: 600 },
  { slug: "lenda",        name: "Lenda",        phase: "Retorno com o Elixir",     emoji: "🌟", minXp: 600, nextXp: null },
];

export function levelForXp(xp: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  return current;
}

export interface JourneySnapshot {
  authenticated: boolean;
  xp: number;
  level: Level;
  progress: number; // 0..1 pra próxima fase (1 quando estiver na lenda)
  questionsTotal: number;
  citationsTotal: number;
  streak: number;
  lastActivityAt: string | null;
}

export async function computeJourney(userId: string | null): Promise<JourneySnapshot> {
  const empty: JourneySnapshot = {
    authenticated: false,
    xp: 0,
    level: LEVELS[0],
    progress: 0,
    questionsTotal: 0,
    citationsTotal: 0,
    streak: 0,
    lastActivityAt: null,
  };
  if (!userId) return empty;

  const supabase = supabaseAdmin();

  // 1. perguntas (user role no tutor) — count "exact" via head
  const tutorCountRes = await supabase
    .from("tutor_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user");

  // 2. mensagens recebidas pelo WhatsApp (kind=text, direction=in)
  const waCountRes = await supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "in")
    .eq("kind", "text");

  // 3. respostas do tutor com citação (heurística: jsonb não vazio)
  const citationsRes = await supabase
    .from("tutor_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "assistant")
    .not("citations", "is", null);

  const questionsTotal = (tutorCountRes.count ?? 0) + (waCountRes.count ?? 0);
  const citationsTotal = citationsRes.count ?? 0;
  const xp = questionsTotal * 10 + citationsTotal * 5;

  // 4. streak — busca dias com atividade nos últimos 30 dias
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentTutor = await supabase
    .from("tutor_messages")
    .select("created_at")
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since);
  const recentWa = await supabase
    .from("whatsapp_messages")
    .select("created_at")
    .eq("user_id", userId)
    .eq("direction", "in")
    .gte("created_at", since);

  const dates = new Set<string>();
  let lastActivity: number | null = null;
  for (const r of [...(recentTutor.data ?? []), ...(recentWa.data ?? [])]) {
    if (!r.created_at) continue;
    const d = new Date(r.created_at);
    dates.add(toDayKey(d));
    const t = d.getTime();
    if (lastActivity === null || t > lastActivity) lastActivity = t;
  }

  const streak = computeStreak(dates);
  const level = levelForXp(xp);
  const progress = level.nextXp
    ? Math.min(1, (xp - level.minXp) / (level.nextXp - level.minXp))
    : 1;

  return {
    authenticated: true,
    xp,
    level,
    progress,
    questionsTotal,
    citationsTotal,
    streak,
    lastActivityAt: lastActivity ? new Date(lastActivity).toISOString() : null,
  };
}

function toDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

function computeStreak(dates: Set<string>): number {
  // Conta dias consecutivos terminando hoje (UTC). Quebra na primeira lacuna.
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = toDayKey(cursor);
    if (dates.has(key)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else if (streak === 0) {
      // sem atividade hoje — checa ontem antes de declarar streak=0
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      const yKey = toDayKey(cursor);
      if (dates.has(yKey)) {
        streak = 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
    if (streak > 30) break;
  }
  return streak;
}
