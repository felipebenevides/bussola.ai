import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { embed, getChatModel } from "./ai";
import { supabaseAdmin } from "./supabase";
import { getSettings } from "./settings";
import { formatDuration } from "./utils";

export interface RagChunk {
  lesson_id: number;
  course_id: number;
  course_title: string;
  lesson_title: string;
  lesson_position: number;
  chunk_text: string;
  start_seconds: number;
  end_seconds: number;
  similarity: number;
  course_cefis_url: string | null;
  lesson_cefis_url: string | null;
}

export interface CourseMatch {
  course_id: number;
  title: string;
  subtitle: string | null;
  summary: string | null;
  duration_seconds: number | null;
  lesson_count: number | null;
  category_ids: number[] | null;
  cefis_url: string | null;
  similarity: number;
}

export interface TutorCitation {
  courseId: number;
  lessonId: number;
  courseTitle: string;
  lessonTitle: string;
  startSeconds: number;
  endSeconds: number;
  similarity: number;
  deepLink: string;
}

export interface TutorAnswer {
  text: string;
  citations: TutorCitation[];
  suggestedCourses: Array<{ courseId: number; title: string; url: string }>;
  /** Indica se o RAG retornou material relevante */
  groundedInCefis: boolean;
}

/**
 * Constrói o deep-link para a CEFIS no segundo exato da aula.
 * Formato presumido: https://cefis.com.br/curso/{courseId}/aula/{lessonId}?t={seconds}
 * Se o link real for diferente, ajustar aqui (ponto único de mudança).
 */
export function buildLessonDeepLink(courseId: number, lessonId: number, startSeconds: number): string {
  const t = Math.max(0, Math.floor(startSeconds));
  return `https://cefis.com.br/curso/${courseId}/aula/${lessonId}?t=${t}`;
}

async function ragSearch(query: string): Promise<{
  chunks: RagChunk[];
  courses: CourseMatch[];
}> {
  const settings = await getSettings();
  const supabase = supabaseAdmin();

  const [vec] = await embed(query);

  const chunkRes = await supabase.rpc("match_lesson_chunks", {
    query_embedding: vec,
    match_threshold: settings.rag_match_threshold,
    match_count: settings.rag_top_k,
  });

  const courseRes = await supabase.rpc("match_courses", {
    query_embedding: vec,
    match_threshold: 0.5,
    match_count: 3,
  });

  return {
    chunks: (chunkRes.data as RagChunk[] | null) ?? [],
    courses: (courseRes.data as CourseMatch[] | null) ?? [],
  };
}

const AnswerSchema = z.object({
  answer: z
    .string()
    .describe(
      "Resposta curta e didática em português brasileiro (3-6 frases). Sem markdown pesado — texto que funciona tanto no web quanto no WhatsApp."
    ),
  used_chunk_indices: z
    .array(z.number().int().min(0))
    .describe(
      "Índices (0-based) dos chunks do contexto que realmente embasaram a resposta. Vazio se nenhum foi relevante."
    ),
  suggest_course_indices: z
    .array(z.number().int().min(0))
    .max(2)
    .describe("Índices (0-based) dos cursos sugeridos do contexto (no máximo 2)."),
  grounded_in_cefis: z
    .boolean()
    .describe("true se a resposta foi baseada em chunks/cursos da CEFIS; false se respondeu com conhecimento geral."),
});

const SYSTEM_PROMPT = `Você é a Bússola, tutora de IA da CEFIS. Seu papel é responder dúvidas do aluno sobre os conteúdos da plataforma.

REGRAS DE RESPOSTA:
1. Use o contexto fornecido (CHUNKS e CURSOS abaixo) como fonte primária.
2. Se o contexto cobre a pergunta, responda apoiada nele e marque os chunks usados em used_chunk_indices.
3. Se NENHUM chunk for relevante mas a pergunta é razoável, responda com conhecimento geral E comece com: "Esse tópico ainda não está no nosso catálogo indexado, mas posso te explicar:". Coloque grounded_in_cefis: false.
4. Seja didática, calorosa, eficiente. 3-6 frases. Português brasileiro.
5. Não invente fontes. Use SÓ os chunks/cursos do contexto. Se nenhum bate, é melhor admitir.
6. Não inclua URLs ou citações no texto da resposta — isso é montado depois pela aplicação a partir de used_chunk_indices.`;

export async function askTutor(opts: {
  query: string;
  userId?: string | null;
  channel?: "web" | "whatsapp";
}): Promise<TutorAnswer> {
  const query = opts.query.trim();
  if (!query) {
    return { text: "Pode mandar a pergunta? 🙂", citations: [], suggestedCourses: [], groundedInCefis: false };
  }

  let chunks: RagChunk[] = [];
  let courses: CourseMatch[] = [];
  try {
    const r = await ragSearch(query);
    chunks = r.chunks;
    courses = r.courses;
  } catch {
    // Banco/embedding indisponível — segue sem RAG (responde com knowledge geral)
  }

  const contextLines: string[] = [];
  if (chunks.length > 0) {
    contextLines.push("CHUNKS (trechos de aulas com transcrição):");
    chunks.forEach((c, i) => {
      contextLines.push(
        `[${i}] Curso "${c.course_title}" — Aula "${c.lesson_title}" (a partir de ${formatDuration(c.start_seconds)}, similaridade ${c.similarity.toFixed(2)}):\n${c.chunk_text.slice(0, 600)}`
      );
    });
  } else {
    contextLines.push("CHUNKS: (nenhum trecho relevante encontrado nas transcrições)");
  }
  if (courses.length > 0) {
    contextLines.push("\nCURSOS (metadados, sem transcrição indexada):");
    courses.forEach((c, i) => {
      contextLines.push(
        `[${i}] "${c.title}"${c.subtitle ? " — " + c.subtitle : ""} (similaridade ${c.similarity.toFixed(2)})`
      );
    });
  }

  const userPrompt = `Pergunta do aluno: ${query}

${contextLines.join("\n\n")}`;

  let parsed: z.infer<typeof AnswerSchema>;
  try {
    const model = await getChatModel();
    const result = await generateObject({
      model,
      schema: AnswerSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
    parsed = result.object;
  } catch {
    // Modelo indisponível — fallback minimalista
    return {
      text:
        "Não consegui consultar a IA agora. Verifique se a OpenAI key está configurada em /admin.",
      citations: [],
      suggestedCourses: [],
      groundedInCefis: false,
    };
  }

  const citations: TutorCitation[] = (parsed.used_chunk_indices ?? [])
    .filter((i) => i >= 0 && i < chunks.length)
    .map((i) => {
      const c = chunks[i];
      return {
        courseId: c.course_id,
        lessonId: c.lesson_id,
        courseTitle: c.course_title,
        lessonTitle: c.lesson_title,
        startSeconds: c.start_seconds,
        endSeconds: c.end_seconds,
        similarity: c.similarity,
        deepLink: buildLessonDeepLink(c.course_id, c.lesson_id, c.start_seconds),
      };
    });

  const suggestedCourses = (parsed.suggest_course_indices ?? [])
    .filter((i) => i >= 0 && i < courses.length)
    .map((i) => ({
      courseId: courses[i].course_id,
      title: courses[i].title,
      url: courses[i].cefis_url ?? `https://cefis.com.br/curso/${courses[i].course_id}`,
    }));

  return {
    text: parsed.answer,
    citations,
    suggestedCourses,
    groundedInCefis: parsed.grounded_in_cefis,
  };
}

/**
 * Formata a resposta do tutor em texto plain pronto para enviar no WhatsApp.
 * Sem markdown pesado, com emojis sutis e links absolutos (clicáveis nativos do zap).
 */
export function formatTutorForWhatsApp(answer: TutorAnswer): string {
  const lines: string[] = [answer.text];

  if (answer.citations.length > 0) {
    lines.push(""); // linha em branco
    lines.push("📺 Aulas que embasam essa resposta:");
    for (const c of answer.citations) {
      lines.push(
        `• ${c.courseTitle} — Aula "${c.lessonTitle}" (em ${formatDuration(c.startSeconds)})\n  ${c.deepLink}`
      );
    }
  }

  if (answer.suggestedCourses.length > 0) {
    lines.push("");
    lines.push("📚 Sugestão de curso completo:");
    for (const s of answer.suggestedCourses) {
      lines.push(`• ${s.title}\n  ${s.url}`);
    }
  }

  return lines.join("\n");
}
