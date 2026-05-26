import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { embed, genObject } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";
import { getSettings } from "@/lib/settings";
import { loadPlan } from "@/lib/plan";

const ModeSchema = z.object({
  mode: z.enum(["auto", "course", "custom"]).default("auto"),
  courseId: z.number().int().positive().optional(),
  customName: z.string().min(2).max(80).optional(),
  customGoal: z.string().min(3).max(500).optional(),
});

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

REGRAS GERAIS:
1. Plano de 1 semana (seg a dom = day_of_week 1..7). Total de items: 4-7.
2. Cada item ocupa ≤ minutos/dia do aluno. Distribuir respeitando esse orçamento.
3. PRIORIZE source='cefis_lesson' com chunk_index — esses têm timestamp e abrem direto no segundo da explicação.
4. Se não houver chunk para o dia, use source='cefis_lesson' com course_index (aula introdutória do curso sugerido) OU 'generated_summary'/'generated_quiz' para reforço.
5. Não invente cursos que não estão no contexto.
6. day_of_week 6/7 (sáb/dom) podem ter blocos maiores (ex: 2x o normal).
7. Tom: títulos diretos, sem "curso de", começa com verbo ("Entender X", "Praticar Y", "Revisar Z").
8. rationale por item: 1 frase explicando porque entra naquele dia.
9. rationale geral (do plano): 2-3 frases explicando a lógica da semana.

ADAPTAÇÃO AO ESTILO DE APRENDIZAGEM (campo "Estilo" no perfil):
- visual → maximize 'cefis_lesson' (aulas em vídeo). Reforços usam 'generated_summary' (lê-se rápido).
  No rationale, mencione "assistir" / "ver na prática" / "mapa visual".
- auditory → priorize 'cefis_lesson' (vídeo tem áudio) e inclua pelo menos 1 'generated_podcast' na semana.
  No rationale, mencione "escutar no trajeto" / "ouvir o trecho".
- kinesthetic → inclua pelo menos 2 'generated_quiz' (mão na massa) e priorize chunks que falem de
  exemplos práticos. No rationale, mencione "praticar" / "simular" / "aplicar com cliente real".
- mixed (default) → balanceie: ~50% aula CEFIS, ~25% resumo IA, ~25% quiz IA.

Nunca use APENAS conteúdo IA — sempre tenha pelo menos 2 'cefis_lesson' por semana pra ancorar no
catálogo real.`;

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado. Faça login em /login." }, { status: 401 });
  }

  let modeBody: z.infer<typeof ModeSchema> = { mode: "auto" };
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = ModeSchema.safeParse(json);
    if (parsed.success) modeBody = parsed.data;
  } catch {
    // body opcional — segue com mode=auto
  }

  const supabase = supabaseAdmin();
  const settings = await getSettings();

  // Validação do mode
  let scopedCourse: { id: number; title: string } | null = null;
  if (modeBody.mode === "course") {
    if (!modeBody.courseId) {
      return NextResponse.json(
        { error: "courseId é obrigatório quando mode=course" },
        { status: 400 }
      );
    }
    const { data: course } = await supabase
      .from("cefis_courses")
      .select("id, title")
      .eq("id", modeBody.courseId)
      .maybeSingle();
    if (!course) {
      return NextResponse.json({ error: "Curso CEFIS não encontrado" }, { status: 404 });
    }
    scopedCourse = course;
  }

  if (modeBody.mode === "custom" && (!modeBody.customName || !modeBody.customGoal)) {
    return NextResponse.json(
      { error: "customName e customGoal são obrigatórios quando mode=custom" },
      { status: 400 }
    );
  }

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

  // 3. RAG sobre o conteúdo CEFIS — query muda conforme o mode
  const effectiveGoal =
    modeBody.mode === "custom" && modeBody.customGoal ? modeBody.customGoal : profile.goal;
  const ragQuery =
    modeBody.mode === "course" && scopedCourse
      ? `${scopedCourse.title}. ${effectiveGoal}.`
      : `${effectiveGoal}. Foco: ${weakArea}. Persona: contador buscando melhorar habilidades práticas.`;

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
    const fetchCount = modeBody.mode === "course" ? 30 : 8;
    const [chunkRes, courseRes] = await Promise.all([
      supabase.rpc("match_lesson_chunks", {
        query_embedding: vec,
        match_threshold: Math.min(settings.rag_match_threshold, 0.55),
        match_count: fetchCount,
      }),
      supabase.rpc("match_courses", {
        query_embedding: vec,
        match_threshold: 0.45,
        match_count: 5,
      }),
    ]);
    chunks = (chunkRes.data as typeof chunks | null) ?? [];
    courses = (courseRes.data as typeof courses | null) ?? [];

    // Filtra chunks por curso quando mode=course
    if (modeBody.mode === "course" && scopedCourse) {
      const filtered = chunks.filter((c) => c.course_id === scopedCourse!.id);
      if (filtered.length > 0) {
        chunks = filtered.slice(0, 8);
      }
      // se vazio depois do filtro, deixa os top globais — melhor ter algo do que nada
      // o prompt vai avisar que o curso era esperado
      courses = courses.filter((c) => c.course_id === scopedCourse!.id);
    }
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

  const modeNote =
    modeBody.mode === "course" && scopedCourse
      ? `\nMODO: Plano focado no curso CEFIS "${scopedCourse.title}" (id=${scopedCourse.id}). Use prioritariamente chunks/aulas DESSE curso.`
      : modeBody.mode === "custom" && modeBody.customName
        ? `\nMODO: Plano avulso "${modeBody.customName}" — usuário definiu nome e meta. Não fixe em um curso CEFIS específico; use o catálogo livremente onde fizer sentido.`
        : "";

  const userPrompt = `PERFIL DO ALUNO:
- Objetivo: ${effectiveGoal}
- Minutos/dia: ${profile.available_minutes_per_day ?? 30}
- Deadline: ${profile.deadline ?? "sem deadline definida"}
- Estilo: ${profile.learning_style ?? "mixed"}
- Área fraca prioritária: ${weakArea}${modeNote}

CONTEXTO CEFIS — CHUNKS COM TRANSCRIÇÃO (use chunk_index nos items):
${chunkLines}

CONTEXTO CEFIS — CURSOS (use course_index nos items quando não tiver chunk apropriado):
${courseLines}

Monte o plano de 1 semana agora.`;

  // 5. Gerar plano
  let plan: z.infer<typeof PlanSchema>;
  try {
    plan = await genObject({
      schema: PlanSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao gerar plano: ${msg}` }, { status: 500 });
  }

  // 6. Desativar planos anteriores + inserir novo
  await supabase.from("study_plan").update({ active: false }).eq("user_id", userId);

  // Title respeita customName quando mode=custom
  const finalTitle =
    modeBody.mode === "custom" && modeBody.customName
      ? modeBody.customName
      : modeBody.mode === "course" && scopedCourse
        ? `${scopedCourse.title}: ${plan.title}`
        : plan.title;

  const { data: planRow, error: planErr } = await supabase
    .from("study_plan")
    .insert({
      user_id: userId,
      title: finalTitle,
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
