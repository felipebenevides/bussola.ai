import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { genObject } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";
import { ragSearch, buildLessonDeepLink } from "@/lib/tutor-agent";
import { formatDuration } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── GET ?planItemId=... — retorna estudo salvo ou null ─────────────

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "auth required" }, { status: 401 });

  const planItemId = req.nextUrl.searchParams.get("planItemId");
  if (!planItemId) return NextResponse.json({ error: "planItemId required" }, { status: 400 });

  const supabase = supabaseAdmin();
  // valida ownership via plan_items → study_plan.user_id
  const { data: pi } = await supabase
    .from("plan_items")
    .select("id, plan_id, title")
    .eq("id", planItemId)
    .maybeSingle();
  if (!pi) return NextResponse.json({ error: "plan_item not found" }, { status: 404 });
  const { data: plan } = await supabase
    .from("study_plan")
    .select("user_id")
    .eq("id", pi.plan_id)
    .maybeSingle();
  if (!plan || plan.user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: study } = await supabase
    .from("generated_content")
    .select("id, title, body, metadata, created_at")
    .eq("plan_item_id", planItemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    planItem: { id: pi.id, title: pi.title },
    study: study ?? null,
  });
}

// ─── POST { planItemId } — gera e persiste estudo extenso ───────────

const PostBody = z.object({
  planItemId: z.string().uuid(),
});

const StudySchema = z.object({
  title: z.string().min(5).max(140),
  importance: z
    .string()
    .min(120)
    .max(800)
    .describe("2 parágrafos amarrando o item ao objetivo do aluno. Por que isso importa AGORA."),
  concepts: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        explanation: z.string().min(80).max(500),
      })
    )
    .min(3)
    .max(5)
    .describe("Conceitos-chave com explicação curta de 2-4 frases."),
  practice_examples: z
    .array(
      z.object({
        scenario: z.string().min(20).max(160),
        walkthrough: z.string().min(120).max(700),
      })
    )
    .min(3)
    .max(5)
    .describe("Cenários práticos do contador brasileiro — cada um com walkthrough passo-a-passo."),
  common_mistakes: z
    .array(
      z.object({
        mistake: z.string().min(20).max(160),
        fix: z.string().min(40).max(300),
      })
    )
    .min(2)
    .max(4)
    .describe("Erros comuns nesse tema e como evitar."),
  action_steps: z
    .array(z.string().min(20).max(220))
    .min(3)
    .max(5)
    .describe("Passos concretos pra aplicar hoje. Verbos no imperativo."),
  reflection_questions: z
    .array(z.string().min(15).max(180))
    .min(2)
    .max(4)
    .describe("Perguntas pra auto-avaliação. Não respostas — só perguntas."),
  used_chunk_indices: z
    .array(z.number().int().min(0))
    .describe("Índices (0-based) dos chunks usados pra embasar o estudo."),
});

const SYSTEM_PROMPT = `Você é a Bússola — uma tutora de IA criando MATERIAL DE ESTUDO EXTENSO e didático
para um item específico do plano semanal do aluno.

PERSONA DO ALUNO: contador(a) brasileiro(a) melhorando habilidades de negociação prática.

ESTILO:
- Professor experiente do Harvard Negotiation Project — usa BATNA, ZOPA, interesses vs posições
  com naturalidade, sem citar bibliografia o tempo todo.
- Exemplos sempre concretos do cotidiano contábil: honorários, sócio resistente, cliente que
  atrasa, escritório familiar.
- PT-BR coloquial moderado. Direto, sem floreio.

REGRAS:
1. Use CHUNKS como fonte primária. Quando citar uma aula, mencione o momento em mm:ss
   (os start_seconds já vêm formatados na linha do chunk).
2. preencha used_chunk_indices com TODOS os chunks que realmente influenciaram o conteúdo.
3. importance: 2 parágrafos amarrando o item ao goal do aluno. Por que isso vale o tempo dele HOJE.
4. concepts: 3-5 conceitos-chave. Cada um com nome curto + explicação prática em 2-4 frases.
5. practice_examples: 3-5 cenários CONCRETOS do mundo contábil. Cada walkthrough é passo-a-passo:
   "Cliente A liga pedindo desconto de 30%. Você (a) escuta o porquê real do pedido; (b) usa ZOPA
   pra entender até onde pode ir; (c) ancora a contra-proposta no valor entregue..."
6. common_mistakes: 2-4 erros comuns + como corrigir. Não jargão, exemplos diretos.
7. action_steps: 3-5 passos imperativos pra usar HOJE. "Liste os 3 maiores clientes e o que cada
   um valoriza além de preço" — não genérico.
8. reflection_questions: 2-4 perguntas abertas pro aluno se auto-avaliar.
9. Nunca invente cursos/aulas fora dos CHUNKS fornecidos.

TAMANHO TOTAL: ~800-1500 palavras distribuídas entre as seções.`;

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "auth required" }, { status: 401 });

  let body: z.infer<typeof PostBody>;
  try {
    body = PostBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // 1. Carrega o plan_item + valida ownership
  const { data: pi } = await supabase
    .from("plan_items")
    .select(
      "id, plan_id, title, duration_minutes, source, source_ref, cefis_course_id, cefis_lesson_id, skill_slug"
    )
    .eq("id", body.planItemId)
    .maybeSingle();
  if (!pi) return NextResponse.json({ error: "plan_item not found" }, { status: 404 });

  const { data: plan } = await supabase
    .from("study_plan")
    .select("user_id, title, rationale")
    .eq("id", pi.plan_id)
    .maybeSingle();
  if (!plan || plan.user_id !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 2. Carrega contexto do perfil pra adaptar
  const { data: profile } = await supabase
    .from("user_profile")
    .select("goal, available_minutes_per_day, learning_style")
    .eq("user_id", userId)
    .maybeSingle();

  // 3. RAG focado no título do item + skill_slug + curso (se houver)
  const ragQuery = [pi.title, pi.skill_slug, plan.title].filter(Boolean).join(" — ");
  const { chunks } = await ragSearch(ragQuery, pi.cefis_course_id);
  const usedChunks = chunks.slice(0, 8);

  const chunkLines = usedChunks.length
    ? usedChunks
        .map(
          (c, i) =>
            `[${i}] Curso "${c.course_title}" — Aula "${c.lesson_title}" @ ${formatDuration(c.start_seconds)}:\n${c.chunk_text.slice(0, 700)}`
        )
        .join("\n\n")
    : "(sem chunks indexados — use conhecimento geral e marque used_chunk_indices=[])";

  const userPrompt = `ITEM DO PLANO: "${pi.title}"
Duração planejada: ${pi.duration_minutes} min
Skill: ${pi.skill_slug ?? "negociação geral"}
Plano: "${plan.title}"

PERFIL DO ALUNO:
- Objetivo: ${profile?.goal ?? "Melhorar negociação"}
- Estilo: ${profile?.learning_style ?? "mixed"}
- Tempo/dia: ${profile?.available_minutes_per_day ?? 30} min

CONTEXTO CEFIS:
${chunkLines}

Gere o material de estudo extenso e didático agora.`;

  // 4. Gera o estudo
  let study: z.infer<typeof StudySchema>;
  try {
    study = await genObject({
      schema: StudySchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `IA falhou: ${msg}` }, { status: 500 });
  }

  // 5. Monta o markdown final
  const cited = (study.used_chunk_indices ?? [])
    .filter((i) => i >= 0 && i < usedChunks.length)
    .map((i) => usedChunks[i]);

  const markdown = [
    `# ${study.title}`,
    "",
    `## Por que isso importa agora`,
    study.importance,
    "",
    `## Conceitos-chave`,
    ...study.concepts.map((c) => `### ${c.name}\n${c.explanation}`),
    "",
    `## Como funciona na prática`,
    ...study.practice_examples.map(
      (e, i) => `### Exemplo ${i + 1} — ${e.scenario}\n${e.walkthrough}`
    ),
    "",
    `## Erros comuns e como evitar`,
    ...study.common_mistakes.map((m) => `- **${m.mistake}** — ${m.fix}`),
    "",
    `## Plano de ação imediato`,
    ...study.action_steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `## Pra fixar (auto-avaliação)`,
    ...study.reflection_questions.map((q) => `- ${q}`),
    "",
    cited.length > 0
      ? `## Aulas CEFIS citadas\n${cited
          .map(
            (c) =>
              `- **${c.course_title}** — _${c.lesson_title}_ @ ${formatDuration(c.start_seconds)}`
          )
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // 6. Persiste (deleta versão anterior se existir → 1 por item)
  await supabase.from("generated_content").delete().eq("plan_item_id", pi.id);

  const { data: saved, error: insErr } = await supabase
    .from("generated_content")
    .insert({
      user_id: userId,
      plan_item_id: pi.id,
      kind: "summary",
      title: study.title,
      prompt: pi.title,
      body: markdown,
      source_lesson_ids: cited.map((c) => c.lesson_id),
      source_course_ids: Array.from(new Set(cited.map((c) => c.course_id))),
      metadata: {
        concepts: study.concepts.length,
        examples: study.practice_examples.length,
        action_steps: study.action_steps.length,
      },
    })
    .select("id, title, body, metadata, created_at")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    planItem: { id: pi.id, title: pi.title },
    study: saved,
    citations: cited.map((c) => ({
      courseId: c.course_id,
      lessonId: c.lesson_id,
      courseTitle: c.course_title,
      lessonTitle: c.lesson_title,
      startSeconds: c.start_seconds,
      deepLink: buildLessonDeepLink(c.course_id, c.lesson_id, c.start_seconds),
    })),
  });
}
