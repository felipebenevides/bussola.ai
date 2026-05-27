import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { genObject } from "@/lib/ai";
import { ragSearch, buildLessonDeepLink, buildCourseDeepLink } from "@/lib/tutor-agent";
import { formatDuration } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const BodySchema = z.object({
  topic: z.string().min(3).max(200),
  minutes: z.number().int().min(1).max(60).default(10),
});

const ResponseSchema = z.object({
  title: z.string().min(5).max(100),
  /** 3-6 bullets condensados ao tempo disponível. */
  highlights: z.array(z.string().min(10).max(280)).min(2).max(6),
  /** Resumo final em 1-3 frases — a "ideia central pra levar embora". */
  takeaway: z.string().min(20).max(400),
});

const SYSTEM_PROMPT = `Você é a Bússola — tutora especialista em condensar conhecimento.
Você recebe um TÓPICO + TEMPO disponível (em minutos) + CHUNKS de aulas CEFIS reais.

OBJETIVO: criar uma síntese que cabe nos minutos solicitados (assumindo leitura ~200 palavras/min).
- 1 min → 1 bullet rápido + takeaway curtinho
- 5 min → 3 bullets densos + takeaway de 2 frases
- 10 min → 4-5 bullets, takeaway de 3 frases com nuance
- 30 min → 6 bullets profundos com exemplos práticos

REGRAS:
- Use os CHUNKS como fonte primária. Quando citar timestamp, mencione "(mm:ss)".
- Se chunks são insuficientes, complete com conhecimento geral mas avise no takeaway.
- Linguagem direta, PT-BR coloquial. Nada de "vamos explorar" ou "neste artigo".
- Bullets começam com verbo no infinitivo ou conceito direto, sem "Você vai aprender".
- Persona do leitor: contador brasileiro melhorando habilidades práticas (negociação principalmente).`;

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { chunks, courses } = await ragSearch(body.topic);
  const trimmedChunks = chunks.slice(0, Math.min(8, chunks.length));

  const contextLines: string[] = [];
  if (trimmedChunks.length > 0) {
    contextLines.push("CHUNKS:");
    trimmedChunks.forEach((c, i) => {
      contextLines.push(
        `[${i}] Curso "${c.course_title}" — Aula "${c.lesson_title}" @ ${formatDuration(c.start_seconds)} (sim ${c.similarity.toFixed(2)}):\n${c.chunk_text.slice(0, 500)}`
      );
    });
  } else {
    contextLines.push("CHUNKS: (nenhum chunk relevante — responda com conhecimento geral)");
  }

  let result: z.infer<typeof ResponseSchema>;
  try {
    result = await genObject({
      schema: ResponseSchema,
      system: SYSTEM_PROMPT,
      prompt: `TÓPICO: ${body.topic}\nTEMPO DISPONÍVEL: ${body.minutes} minutos\n\n${contextLines.join("\n\n")}\n\nGere o resumo agora.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `IA falhou: ${msg}` }, { status: 500 });
  }

  const citations = trimmedChunks.slice(0, 4).map((c) => ({
    courseId: c.course_id,
    lessonId: c.lesson_id,
    courseTitle: c.course_title,
    lessonTitle: c.lesson_title,
    startSeconds: c.start_seconds,
    deepLink: buildLessonDeepLink(c.course_id, c.lesson_id, c.start_seconds),
  }));

  const suggestedCourses = courses.slice(0, 3).map((c) => ({
    courseId: c.course_id,
    title: c.title,
    url: c.cefis_url ?? buildCourseDeepLink(c.course_id),
  }));

  return NextResponse.json({
    topic: body.topic,
    minutes: body.minutes,
    title: result.title,
    highlights: result.highlights,
    takeaway: result.takeaway,
    citations,
    suggestedCourses,
    groundedInCefis: trimmedChunks.length > 0,
  });
}
