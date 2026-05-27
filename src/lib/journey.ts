import "server-only";
import { supabaseAdmin } from "./supabase";

/**
 * Jornada do Herói — gamificação inspirada em Duolingo, adaptada à narrativa
 * do monomito (Campbell).
 *
 * Pilares:
 *  - XP cumulativo → nível (Aprendiz → Lenda) com fala de mascote por fase
 *  - Streak diário com protetor de ofensiva
 *  - Liga semanal (Bronze → Diamante) computada por XP da última semana
 *  - Gemas (moeda virtual) — proxy de "engajamento de qualidade"
 *  - Meta diária de XP com barra de progresso
 *
 * XP é derivado de eventos reais:
 *   - 10 XP por pergunta feita no tutor (web ou WhatsApp)
 *   - 5 XP por resposta do tutor com citação (proxy de conteúdo acessado)
 *   - Gemas: 1 por citação recebida (premia tutor que entrega aula real)
 */

export interface Level {
  slug: "aprendiz" | "aventureiro" | "estrategista" | "mestre" | "lenda";
  name: string;
  phase: string;
  emoji: string;
  minXp: number;
  nextXp: number | null;
  /** Fala do mascote 🧭 quando o aluno está nessa fase. */
  mascotQuote: string;
}

const LEVELS: Level[] = [
  {
    slug: "aprendiz",
    name: "Aprendiz",
    phase: "Chamado da Aventura",
    emoji: "🧭",
    minXp: 0,
    nextXp: 30,
    mascotQuote: "Toda jornada começa com um passo. Vamos descobrir até onde você consegue ir.",
  },
  {
    slug: "aventureiro",
    name: "Aventureiro",
    phase: "Cruzando o Limiar",
    emoji: "🚪",
    minXp: 30,
    nextXp: 100,
    mascotQuote: "Você cruzou o limiar. Daqui pra frente o terreno fica interessante.",
  },
  {
    slug: "estrategista",
    name: "Estrategista",
    phase: "Provas, Aliados e Inimigos",
    emoji: "⚔️",
    minXp: 100,
    nextXp: 250,
    mascotQuote: "Você já não improvisa — você planeja. Continue testando os limites.",
  },
  {
    slug: "mestre",
    name: "Mestre",
    phase: "Ordália e Recompensa",
    emoji: "🏆",
    minXp: 250,
    nextXp: 600,
    mascotQuote: "Você domina o que assustava no começo. Hora de ensinar outros.",
  },
  {
    slug: "lenda",
    name: "Lenda",
    phase: "Retorno com o Elixir",
    emoji: "🌟",
    minXp: 600,
    nextXp: null,
    mascotQuote: "Você é a Bússola de quem está começando agora. Lendário.",
  },
];

export function levelForXp(xp: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  return current;
}

// ─── Ligas semanais ─────────────────────────────────────────────────

export interface League {
  slug: "bronze" | "prata" | "ouro" | "esmeralda" | "diamante";
  name: string;
  emoji: string;
  minWeeklyXp: number;
  nextMinWeeklyXp: number | null;
  /** Cor do gradient pra UI (Tailwind class names). */
  gradient: string;
}

const LEAGUES: League[] = [
  { slug: "bronze",    name: "Bronze",    emoji: "🥉", minWeeklyXp: 0,   nextMinWeeklyXp: 50,  gradient: "from-amber-700 to-amber-900"      },
  { slug: "prata",     name: "Prata",     emoji: "🥈", minWeeklyXp: 50,  nextMinWeeklyXp: 150, gradient: "from-zinc-400 to-zinc-600"         },
  { slug: "ouro",      name: "Ouro",      emoji: "🥇", minWeeklyXp: 150, nextMinWeeklyXp: 300, gradient: "from-yellow-400 to-amber-600"      },
  { slug: "esmeralda", name: "Esmeralda", emoji: "💚", minWeeklyXp: 300, nextMinWeeklyXp: 500, gradient: "from-emerald-400 to-emerald-700"   },
  { slug: "diamante",  name: "Diamante",  emoji: "💎", minWeeklyXp: 500, nextMinWeeklyXp: null, gradient: "from-cyan-400 via-sky-500 to-violet-600" },
];

function leagueForWeeklyXp(xp: number): League {
  let current = LEAGUES[0];
  for (const l of LEAGUES) if (xp >= l.minWeeklyXp) current = l;
  return current;
}

// ─── Meta diária + protetor ─────────────────────────────────────────

const DAILY_XP_GOAL = 30;
const FREEZE_THRESHOLD_STREAK = 3; // ganha protetor com streak >= 3

// ─── Snapshot ───────────────────────────────────────────────────────

export interface JourneySnapshot {
  authenticated: boolean;
  xp: number;
  level: Level;
  progress: number;
  questionsTotal: number;
  citationsTotal: number;
  streak: number;
  lastActivityAt: string | null;
  recentDays: string[];
  ladder: Array<Level & { unlocked: boolean; current: boolean }>;

  // ─── Novos pilares Duolingo-style ──────────────────────────────
  /** XP acumulado nos últimos 7 dias. Define a liga. */
  weeklyXp: number;
  league: League;
  leagueProgress: number; // 0..1 pra próxima liga (1 quando é Diamante)
  /** Gemas conquistadas (1 por citação recebida). */
  gems: number;
  /** XP ganho HOJE (UTC) — pra meta diária. */
  todayXp: number;
  dailyGoal: number;
  dailyProgress: number; // todayXp/dailyGoal, capped em 1
  /** Quantos protetores de ofensiva o aluno tem disponíveis. */
  streakFreezesAvailable: number;
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
    recentDays: [],
    ladder: LEVELS.map((l, i) => ({ ...l, unlocked: i === 0, current: i === 0 })),
    weeklyXp: 0,
    league: LEAGUES[0],
    leagueProgress: 0,
    gems: 0,
    todayXp: 0,
    dailyGoal: DAILY_XP_GOAL,
    dailyProgress: 0,
    streakFreezesAvailable: 0,
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
  const gems = citationsTotal; // 1 gema por citação real do tutor

  // 4. atividade dos últimos 30 dias — pra streak + recentDays + weeklyXp + todayXp
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sinceToday = startOfUtcDay().toISOString();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [recentTutor, recentWa, recentCitations] = await Promise.all([
    supabase
      .from("tutor_messages")
      .select("created_at, citations")
      .eq("user_id", userId)
      .gte("created_at", since30),
    supabase
      .from("whatsapp_messages")
      .select("created_at, direction, kind")
      .eq("user_id", userId)
      .gte("created_at", since30),
    supabase
      .from("tutor_messages")
      .select("created_at, citations")
      .eq("user_id", userId)
      .eq("role", "assistant")
      .not("citations", "is", null)
      .gte("created_at", since30),
  ]);

  // Pra streak + recentDays usamos perguntas do user (in)
  const dates = new Set<string>();
  let lastActivity: number | null = null;

  // weeklyXp e todayXp: contamos perguntas + citações no respectivo período
  let questionsToday = 0;
  let questionsWeek = 0;
  let citationsToday = 0;
  let citationsWeek = 0;

  const tutorUserRows = (recentTutor.data ?? []).filter(
    (r) => true // role já filtra abaixo via campo
  );
  for (const r of tutorUserRows) {
    if (!r.created_at) continue;
    const ts = new Date(r.created_at);
    const t = ts.getTime();
    if (lastActivity === null || t > lastActivity) lastActivity = t;
    // tutor_messages aqui pode incluir assistant — só conta no streak/recentDays
    // se quisermos. Filtro abaixo só pra perguntas de user usa o count total acima.
    dates.add(toDayKey(ts));
  }
  // perguntas user no tutor (pra weekly/today) — contamos pelo conjunto retornado
  // do select acima filtrando role. Mas a query pegou TODAS as msgs — refaço com filtro:
  const userTutorRows = (recentTutor.data ?? []).filter(
    () => true
  );
  // Re-busca específica de perguntas user pra contagem precisa (era mais simples):
  const userTutorRes = await supabase
    .from("tutor_messages")
    .select("created_at")
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", since30);
  for (const r of userTutorRes.data ?? []) {
    if (!r.created_at) continue;
    const ts = new Date(r.created_at);
    if (ts.getTime() >= new Date(sinceToday).getTime()) questionsToday++;
    if (ts.getTime() >= new Date(since7d).getTime()) questionsWeek++;
    dates.add(toDayKey(ts));
    const t = ts.getTime();
    if (lastActivity === null || t > lastActivity) lastActivity = t;
  }
  for (const r of recentWa.data ?? []) {
    if (!r.created_at) continue;
    if (r.direction !== "in" || r.kind !== "text") continue;
    const ts = new Date(r.created_at);
    if (ts.getTime() >= new Date(sinceToday).getTime()) questionsToday++;
    if (ts.getTime() >= new Date(since7d).getTime()) questionsWeek++;
    dates.add(toDayKey(ts));
    const t = ts.getTime();
    if (lastActivity === null || t > lastActivity) lastActivity = t;
  }
  for (const r of recentCitations.data ?? []) {
    if (!r.created_at) continue;
    const ts = new Date(r.created_at);
    if (ts.getTime() >= new Date(sinceToday).getTime()) citationsToday++;
    if (ts.getTime() >= new Date(since7d).getTime()) citationsWeek++;
  }
  // suppress unused vars
  void tutorUserRows;
  void userTutorRows;

  const todayXp = questionsToday * 10 + citationsToday * 5;
  const weeklyXp = questionsWeek * 10 + citationsWeek * 5;

  const streak = computeStreak(dates);
  const level = levelForXp(xp);
  const progress = level.nextXp
    ? Math.min(1, (xp - level.minXp) / (level.nextXp - level.minXp))
    : 1;

  const league = leagueForWeeklyXp(weeklyXp);
  const leagueProgress = league.nextMinWeeklyXp
    ? Math.min(1, (weeklyXp - league.minWeeklyXp) / (league.nextMinWeeklyXp - league.minWeeklyXp))
    : 1;

  const dailyProgress = Math.min(1, todayXp / DAILY_XP_GOAL);
  // 1 protetor de ofensiva a partir de streak ≥ 3, +1 a cada múltiplo de 7
  const streakFreezesAvailable = streak >= FREEZE_THRESHOLD_STREAK
    ? 1 + Math.floor(streak / 7)
    : 0;

  return {
    authenticated: true,
    xp,
    level,
    progress,
    questionsTotal,
    citationsTotal,
    streak,
    lastActivityAt: lastActivity ? new Date(lastActivity).toISOString() : null,
    recentDays: Array.from(dates).sort(),
    ladder: LEVELS.map((l) => ({
      ...l,
      unlocked: xp >= l.minXp,
      current: l.slug === level.slug,
    })),
    weeklyXp,
    league,
    leagueProgress,
    gems,
    todayXp,
    dailyGoal: DAILY_XP_GOAL,
    dailyProgress,
    streakFreezesAvailable,
  };
}

function toDayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function computeStreak(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = toDayKey(cursor);
    if (dates.has(key)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else if (streak === 0) {
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
