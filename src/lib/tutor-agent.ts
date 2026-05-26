import "server-only";
import { z } from "zod";
import { embed, genObject } from "./ai";
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

async function ragSearch(
  query: string,
  courseId?: number | null
): Promise<{
  chunks: RagChunk[];
  courses: CourseMatch[];
}> {
  const settings = await getSettings();
  const supabase = supabaseAdmin();

  const [vec] = await embed(query);

  // Quando o usuário escolheu um curso na sidebar, pegamos mais candidatos do
  // RPC e filtramos client-side para o course_id alvo. O sample tem ~58 chunks
  // no total — buscar 60 cobre todos os cursos com folga.
  const isScoped = typeof courseId === "number" && courseId > 0;
  const matchCount = isScoped ? 60 : settings.rag_top_k;

  const chunkRes = await supabase.rpc("match_lesson_chunks", {
    query_embedding: vec,
    match_threshold: isScoped ? 0.4 : settings.rag_match_threshold,
    match_count: matchCount,
  });

  const courseRes = await supabase.rpc("match_courses", {
    query_embedding: vec,
    match_threshold: 0.5,
    match_count: isScoped ? 30 : 3,
  });

  const allChunks = (chunkRes.data as RagChunk[] | null) ?? [];
  const allCourses = (courseRes.data as CourseMatch[] | null) ?? [];

  const filteredChunks = isScoped
    ? allChunks.filter((c) => c.course_id === courseId).slice(0, settings.rag_top_k)
    : allChunks;

  const filteredCourses = isScoped
    ? allCourses.filter((c) => c.course_id === courseId).slice(0, 3)
    : allCourses;

  return { chunks: filteredChunks, courses: filteredCourses };
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

const SYSTEM_PROMPT = `Você é a Bússola, tutora de IA da CEFIS. Responde dúvidas do aluno (persona típica: contador brasileiro melhorando negociação) sobre o conteúdo da plataforma.

PERSONA E TOM:
- Postura de "professor experiente" — alguém que estudou Harvard Negotiation Project, Roger Fisher, William Ury — sem citar bibliografia o tempo todo, mas usando os conceitos (BATNA, ZOPA, interesses vs. posições, ganhar-ganhar) com naturalidade.
- Dá exemplos práticos do mundo do aluno: honorários contábeis, negociação com sócio, cliente que atrasa pagamento.
- Calorosa, direta, sem floreio. PT-BR coloquial moderado.

REGRAS DE RESPOSTA:
1. Use o contexto (CHUNKS e CURSOS abaixo) como fonte primária. Marque em used_chunk_indices os chunks que realmente embasaram.
2. Se NENHUM chunk for relevante mas a pergunta é razoável, responda com conhecimento geral E comece com: "Esse tópico ainda não está no nosso catálogo indexado, mas posso te explicar:". Coloque grounded_in_cefis=false.
3. 3-6 frases. Sem markdown pesado (funciona em web e WhatsApp).
4. Quando citar um chunk, mencione no corpo da resposta o momento da aula em mm:ss (ex: "a Profa. fala disso por volta de 2:30 em 'Aula X'") — os start_seconds de cada chunk vêm formatados como [mm:ss] na própria linha do chunk no contexto. Use exatamente esse formato.
5. NÃO escreva URLs nem links — a aplicação anexa cards de aula automaticamente a partir de used_chunk_indices.
6. Não invente cursos/aulas fora do contexto. Se nada bate, admita.`;

export async function askTutor(opts: {
  query: string;
  userId?: string | null;
  channel?: "web" | "whatsapp";
  courseId?: number | null;
  courseTitle?: string | null;
}): Promise<TutorAnswer> {
  const query = opts.query.trim();
  if (!query) {
    return { text: "Pode mandar a pergunta? 🙂", citations: [], suggestedCourses: [], groundedInCefis: false };
  }

  let chunks: RagChunk[] = [];
  let courses: CourseMatch[] = [];
  try {
    const r = await ragSearch(query, opts.courseId ?? null);
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
        `[${i}] Curso "${c.course_title}" — Aula "${c.lesson_title}" [mm:ss=${formatDuration(c.start_seconds)}] (similaridade ${c.similarity.toFixed(2)}):\n${c.chunk_text.slice(0, 600)}`
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

  const scopeLine = opts.courseTitle
    ? `O aluno está com foco específico no curso "${opts.courseTitle}". Priorize material desse curso e, se a pergunta fugir totalmente do escopo, avise gentilmente.\n\n`
    : "";

  const userPrompt = `${scopeLine}Pergunta do aluno: ${query}

${contextLines.join("\n\n")}`;

  let parsed: z.infer<typeof AnswerSchema>;
  try {
    parsed = await genObject({
      schema: AnswerSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
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
