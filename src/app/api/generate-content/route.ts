import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { genObject } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";
import { ragSearch } from "@/lib/tutor-agent";
import { formatDuration } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const BodySchema = z.object({
  /** Quando vier do plano: pega título/duração/skill do plan_item */
  planItemId: z.string().uuid().optional(),
  /** Quando vier solto: passa topic + kind explícitos */
  topic: z.string().min(3).max(200).optional(),
  kind: z.enum(["generated_summary", "generated_pdf", "generated_quiz"]).optional(),
});

const SummarySchema = z.object({
  title: z.string().min(5).max(120),
  /** Markdown — seções com ##, parágrafos curtos. Sem fluff. */
  body: z.string().min(200).max(4000),
});

const QuizSchema = z.object({
  title: z.string().min(5).max(120),
  questions: z
    .array(
      z.object({
        question: z.string().min(10).max(280),
        options: z.array(z.string().min(2).max(160)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(20).max(400),
      })
    )
    .min(3)
    .max(5),
});

const SUMMARY_SYSTEM = `Você é a Bússola — escreva um resumo de estudo em markdown PT-BR.

REGRAS:
- 1 título + 3-5 seções (## H2). Parágrafos curtos, sem floreio.
- Use CHUNKS reais como base; quando mencionar timestamp, formato "(mm:ss)".
- Inclua 1 seção "Pra praticar" com 2-3 ações concretas.
- Persona: contador brasileiro melhorando negociação.`;

const QUIZ_SYSTEM = `Você é a Bússola — gera um quiz curto de múltipla escolha PT-BR.

REGRAS:
- 3-5 questões. Cada uma tem 4 alternativas, 1 correta, explicação clara.
- Foco em aplicação prática, não decoreba. Cenários realistas (cliente atrasado, sócio resistente, honorário sob pressão).
- explanation: 1-2 frases dizendo POR QUE a correta é a melhor — referencia chunk quando possível.`;

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  const supabase = supabaseAdmin();

  // 1. Resolve tópico + kind + plan_item (se aplicável)
  let topic = body.topic ?? "";
  let kind: "generated_summary" | "generated_pdf" | "generated_quiz" =
    body.kind ?? "generated_summary";
  let planItemSourceCourse: number | null = null;

  if (body.planItemId) {
    if (!userId) {
      return NextResponse.json({ error: "auth required" }, { status: 401 });
    }
    const { data: pi } = await supabase
      .from("plan_items")
      .select("title, source, skill_slug, cefis_course_id, plan_id")
      .eq("id", body.planItemId)
      .maybeSingle();
    if (!pi) return NextResponse.json({ error: "plan_item not found" }, { status: 404 });
    if (!pi.source.startsWith("generated_")) {
      return NextResponse.json(
        { error: "plan_item source is not generated_*" },
        { status: 400 }
      );
    }
    // valida ownership via plan
    const { data: plan } = await supabase
      .from("study_plan")
      .select("user_id")
      .eq("id", pi.plan_id)
      .maybeSingle();
    if (!plan || plan.user_id !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    topic = pi.title;
    kind = pi.source as typeof kind;
    planItemSourceCourse = pi.cefis_course_id ?? null;
  }

  if (!topic) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  // 2. RAG
  const { chunks } = await ragSearch(topic, planItemSourceCourse);
  const slice = chunks.slice(0, 6);
  const chunkLines = slice.length
    ? slice
        .map(
          (c, i) =>
            `[${i}] "${c.course_title}" — "${c.lesson_title}" @ ${formatDuration(c.start_seconds)}:\n${c.chunk_text.slice(0, 500)}`
        )
        .join("\n\n")
    : "(sem chunks indexados pro tópico — use conhecimento geral e marque no body)";

  // 3. Gera o conteúdo conforme kind
  let title = "";
  let bodyText: string | null = null;
  let metadata: Record<string, unknown> = {};

  try {
    if (kind === "generated_quiz") {
      const quiz = await genObject({
        schema: QuizSchema,
        system: QUIZ_SYSTEM,
        prompt: `TÓPICO: ${topic}\n\nCHUNKS:\n${chunkLines}\n\nGere o quiz agora.`,
      });
      title = quiz.title;
      metadata = { questions: quiz.questions };
      bodyText = quiz.questions
        .map(
          (q, i) =>
            `### ${i + 1}. ${q.question}\n\n${q.options
              .map((o, oi) => `${oi === q.correctIndex ? "✅" : "▫️"} ${o}`)
              .join("\n")}\n\n_${q.explanation}_`
        )
        .join("\n\n");
    } else {
      const summary = await genObject({
        schema: SummarySchema,
        system: SUMMARY_SYSTEM,
        prompt: `TÓPICO: ${topic}\n\nCHUNKS:\n${chunkLines}\n\nGere o resumo em markdown agora.`,
      });
      title = summary.title;
      bodyText = summary.body;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `IA falhou: ${msg}` }, { status: 500 });
  }

  // 4. Persiste em generated_content (best-effort se anônimo)
  let savedId: string | null = null;
  try {
    const { data } = await supabase
      .from("generated_content")
      .insert({
        user_id: userId,
        kind: kind === "generated_quiz" ? "quiz" : kind === "generated_pdf" ? "pdf" : "summary",
        title,
        prompt: topic,
        body: bodyText,
        source_lesson_ids: slice.map((c) => c.lesson_id),
        source_course_ids: slice.map((c) => c.course_id).filter((v, i, a) => a.indexOf(v) === i),
        metadata,
      })
      .select("id")
      .single();
    savedId = data?.id ?? null;
  } catch (err) {
    console.warn("[generate-content] persist failed:", err);
  }

  return NextResponse.json({
    id: savedId,
    kind,
    title,
    body: bodyText,
    metadata,
    citations: slice.slice(0, 4).map((c) => ({
      courseId: c.course_id,
      lessonId: c.lesson_id,
      courseTitle: c.course_title,
      lessonTitle: c.lesson_title,
      startSeconds: c.start_seconds,
    })),
  });
}
