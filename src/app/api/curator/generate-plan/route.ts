import { NextResponse } from "next/server";
import { z } from "zod";
import { generateObject } from "ai";
import { embed, getChatModel } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";
import { getSettings } from "@/lib/settings";
import { loadPlan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PlanItemSchema = z.object({
  day_of_week: z.number().int().min(1).max(7),
  position: z.number().int().min(0).max(10),
  title: z.string().min(3).max(120),
  duration_minutes: z.number().int().min(5).max(180),
  source: z.enum([
    "cefis_lesson",
    "cefis_track",
    "generated_pdf",
    "generated_podcast",
    "generated_quiz",
    "generated_summary",
  ]),
  chunk_index: z
    .number()
    .int()
    .nullable()
    .describe(
      "Quando source=cefis_lesson, o índice do CHUNK do contexto usado para escolher a aula (deixa preencher course_id/lesson_id/start_seconds). null para outras sources."
    ),
  course_index: z
    .number()
    .int()
    .nullable()
    .describe(
      "Quando source=cefis_lesson ou cefis_track sem chunk, índice do CURSO sugerido no contexto. null caso contrário."
    ),
  rationale: z.string().min(5).max(280),
});

const PlanSchema = z.object({
  title: z.string().min(5).max(80),
  rationale: z.string().min(20).max(500),
  items: z.array(PlanItemSchema).min(4).max(8),
});

const SYSTEM_PROMPT = `Você é a Curadora da Bússola — uma agente que monta um plano de estudos personalizado de UMA SEMANA combinando aulas reais da CEFIS (catálogo indexado) com conteúdo IA quando necessário.

INPUTS QUE VOCÊ RECEBE:
- Perfil do aluno (objetivo, minutos/dia, deadline, estilo, área fraca)
- CHUNKS: trechos de aulas CEFIS com transcrição indexada (cada um aponta para uma aula real, com start_seconds — destrava deep-link no segundo exato)
- CURSOS: cursos CEFIS relevantes (sem transcrição indexada, mas reais)

REGRAS:
1. Plano de 1 semana (seg a dom = day_of_week 1..7). Total de items: 4-7.
2. Cada item ocupa ≤ minutos/dia do aluno. Distribuir respeitando esse orçamento.
3. PRIORIZE source='cefis_lesson' com chunk_index — esses têm timestamp e abrem direto no segundo da explicação.
4. Se não houver chunk para o dia, use source='cefis_lesson' com course_index (aula introdutória do curso sugerido) OU 'generated_summary'/'generated_quiz' para reforço.
5. Não invente cursos que não estão no contexto.
6. day_of_week 6/7 (sáb/dom) podem ter blocos maiores (ex: 2x o normal).
7. Tom: títulos diretos, sem "curso de", começa com verbo ("Entender X", "Praticar Y", "Revisar Z").
8. rationale por item: 1 frase explicando porque entra naquele dia.
9. rationale geral (do plano): 2-3 frases explicando a lógica da semana.`;

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado. Faça login em /login." }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const settings = await getSettings();

  // 1. Carregar perfil
  const { data: profile, error: profErr } = await supabase
    .from("user_profile")
    .select("goal, available_minutes_per_day, deadline, learning_style")
    .eq("user_id", userId)
    .maybeSingle();
  if (profErr || !profile) {
    return NextResponse.json(
      { error: "Perfil não encontrado. Complete o onboarding em /onboarding." },
      { status: 400 }
    );
  }

  // 2. Carregar skill_assessment para inferir áreas fracas
  const { data: skills } = await supabase
    .from("skill_assessment")
    .select("skill_slug, skill_label, status, importance")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .limit(3);

  const weakArea =
    skills?.find((s) => s.status === "lacuna_critica")?.skill_label ?? "negociacao";

  // 3. RAG sobre o conteúdo CEFIS, query = goal + weakArea
  const ragQuery = `${profile.goal}. Foco: ${weakArea}. Persona: contador buscando melhorar habilidades práticas.`;

  let chunks: Array<{
    course_id: number;
    lesson_id: number;
    course_title: string;
    lesson_title: string;
    chunk_text: string;
    start_seconds: number;
    similarity: number;
  }> = [];
  let courses: Array<{
    course_id: number;
    title: string;
    summary: string | null;
    duration_seconds: number | null;
    similarity: number;
  }> = [];

  try {
    const [vec] = await embed(ragQuery);
    const [chunkRes, courseRes] = await Promise.all([
      supabase.rpc("match_lesson_chunks", {
        query_embedding: vec,
        match_threshold: Math.min(settings.rag_match_threshold, 0.65),
        match_count: 8,
      }),
      supabase.rpc("match_courses", {
        query_embedding: vec,
        match_threshold: 0.45,
        match_count: 5,
      }),
    ]);
    chunks = (chunkRes.data as typeof chunks | null) ?? [];
    courses = (courseRes.data as typeof courses | null) ?? [];
  } catch (err) {
    console.error("[curator] RAG falhou:", err);
  }

  // 4. Montar prompt
  const chunkLines = chunks.length
    ? chunks
        .map(
          (c, i) =>
            `[chunk ${i}] Curso "${c.course_title}" — Aula "${c.lesson_title}" (start ${c.start_seconds}s, sim ${c.similarity.toFixed(2)}):\n${c.chunk_text.slice(0, 350)}`
        )
        .join("\n\n")
    : "(nenhum chunk com transcrição encontrado para essa query)";

  const courseLines = courses.length
    ? courses
        .map(
          (c, i) =>
            `[curso ${i}] id=${c.course_id} "${c.title}" — ${c.summary?.slice(0, 200) ?? "(sem resumo)"}`
        )
        .join("\n")
    : "(nenhum curso correlacionado)";

  const userPrompt = `PERFIL DO ALUNO:
- Objetivo: ${profile.goal}
- Minutos/dia: ${profile.available_minutes_per_day ?? 30}
- Deadline: ${profile.deadline ?? "sem deadline definida"}
- Estilo: ${profile.learning_style ?? "mixed"}
- Área fraca prioritária: ${weakArea}

CONTEXTO CEFIS — CHUNKS COM TRANSCRIÇÃO (use chunk_index nos items):
${chunkLines}

CONTEXTO CEFIS — CURSOS (use course_index nos items quando não tiver chunk apropriado):
${courseLines}

Monte o plano de 1 semana agora.`;

  // 5. Gerar plano
  let plan: z.infer<typeof PlanSchema>;
  try {
    const model = await getChatModel();
    const result = await generateObject({
      model,
      schema: PlanSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    plan = result.object;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao gerar plano: ${msg}` }, { status: 500 });
  }

  // 6. Desativar planos anteriores + inserir novo
  await supabase.from("study_plan").update({ active: false }).eq("user_id", userId);

  const { data: planRow, error: planErr } = await supabase
    .from("study_plan")
    .insert({
      user_id: userId,
      title: plan.title,
      total_weeks: 1,
      active: true,
      rationale: plan.rationale,
    })
    .select("id")
    .single();
  if (planErr || !planRow) {
    return NextResponse.json(
      { error: `Falha ao salvar plano: ${planErr?.message ?? "desconhecido"}` },
      { status: 500 }
    );
  }

  // 7. Resolver items: aplicar chunk_index/course_index para preencher course/lesson/start
  const itemsToInsert = plan.items.map((it) => {
    let cefis_course_id: number | null = null;
    let cefis_lesson_id: number | null = null;
    let source_ref: string | null = null;
    if (it.source === "cefis_lesson") {
      if (it.chunk_index !== null && chunks[it.chunk_index]) {
        const c = chunks[it.chunk_index];
        cefis_course_id = c.course_id;
        cefis_lesson_id = c.lesson_id;
        source_ref = String(c.start_seconds);
      } else if (it.course_index !== null && courses[it.course_index]) {
        cefis_course_id = courses[it.course_index].course_id;
      }
    }
    return {
      plan_id: planRow.id,
      week: 1,
      day_of_week: it.day_of_week,
      position: it.position,
      title: it.title,
      duration_minutes: it.duration_minutes,
      source: it.source,
      source_ref,
      cefis_course_id,
      cefis_lesson_id,
      skill_slug: weakArea.toLowerCase().replace(/\s+/g, "_"),
    };
  });

  const { error: itemsErr } = await supabase.from("plan_items").insert(itemsToInsert);
  if (itemsErr) {
    console.error("[curator] insert plan_items:", itemsErr.message);
  }

  const view = await loadPlan(planRow.id, userId);
  return NextResponse.json({ plan: view });
}
