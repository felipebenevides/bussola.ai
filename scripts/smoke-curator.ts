/**
 * Smoke test do curador. Requer:
 *   1. `npm run dev`
 *   2. OpenAI key configurada em /admin
 *   3. Login feito com cookie `cefis_session` válido (gere via /login na UI;
 *      copie o cookie do browser e cole abaixo, ou exporte como env)
 *   4. user_profile + skill_assessment já populados (rodar /onboarding antes)
 *   5. Ingestão sample já rodada
 *
 * Como rodar:
 *   BUSSOLA_COOKIE='cefis_session=<token>' node --experimental-strip-types scripts/smoke-curator.ts
 *   # ou
 *   BUSSOLA_COOKIE='...' bun run scripts/smoke-curator.ts
 */

interface PlanItem {
  id: string;
  day_of_week: number;
  position: number;
  title: string;
  duration_minutes: number;
  source: string;
  cefis_course_id: number | null;
  cefis_lesson_id: number | null;
  source_ref: string | null;
  deep_link?: string | null;
}

interface PlanView {
  id: string;
  title: string;
  total_weeks: number;
  rationale: string | null;
  items: PlanItem[];
}

const BASE = (process.env.BUSSOLA_URL ?? "http://localhost:3000").replace(/\/$/, "");
const COOKIE = process.env.BUSSOLA_COOKIE;

if (!COOKIE) {
  console.error("BUSSOLA_COOKIE ausente. Cole o cookie cefis_session do browser e tente de novo.");
  process.exit(2);
}

async function run() {
  console.log(`[smoke-curator] gerando plano em ${BASE}…`);
  const res = await fetch(`${BASE}/api/curator/generate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: COOKIE! },
    body: "{}",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error(`HTTP ${res.status}: ${txt.slice(0, 400)}`);
    process.exit(1);
  }
  const body = (await res.json()) as { plan: PlanView };
  const plan = body.plan;
  console.log(`\nPlano: "${plan.title}" (${plan.total_weeks}w)`);
  console.log(`Rationale: ${plan.rationale}\n`);

  // ai.md: ≥ 50% dos items são cefis_lesson com chunk_index resolvido (ou seja, têm source_ref preenchido)
  const cefisLessons = plan.items.filter((i) => i.source === "cefis_lesson");
  const withTimestamp = cefisLessons.filter((i) => i.source_ref && Number(i.source_ref) > 0);
  const ratio = withTimestamp.length / Math.max(plan.items.length, 1);

  // Tempo total por dia ≤ available_minutes_per_day — passe via env, ou usa 60min como default
  const availPerDay = Number(process.env.AVAIL_MIN_PER_DAY ?? 60);

  const perDay = new Map<number, number>();
  for (const it of plan.items) {
    perDay.set(it.day_of_week, (perDay.get(it.day_of_week) ?? 0) + it.duration_minutes);
  }
  const offenders = [...perDay.entries()].filter(([d, m]) => {
    // Sáb (6) e Dom (7) podem ter blocos 2x conforme system prompt
    const cap = d >= 6 ? availPerDay * 2 : availPerDay;
    return m > cap;
  });

  for (const it of plan.items) {
    console.log(
      `  day=${it.day_of_week} pos=${it.position} ${it.duration_minutes}min  src=${it.source}  ${it.cefis_course_id ? `course=${it.cefis_course_id}` : ""} ${it.cefis_lesson_id ? `lesson=${it.cefis_lesson_id}` : ""} ${it.source_ref ? `start=${it.source_ref}s` : ""}\n    "${it.title}"`
    );
  }

  console.log(`\nItems com timestamp resolvido: ${withTimestamp.length}/${plan.items.length} (${Math.round(ratio * 100)}%)`);
  console.log(`Available min/dia: ${availPerDay}; dias estourando: ${offenders.length}`);

  const pass = ratio >= 0.5 && offenders.length === 0;
  console.log(pass ? "\n✅ smoke curator PASSOU" : "\n❌ smoke curator FALHOU");
  process.exit(pass ? 0 : 1);
}

run().catch((err) => {
  console.error("[smoke-curator] crash:", err);
  process.exit(2);
});
