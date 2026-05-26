import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { genObject } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── start: gerar 5 sub-skills do objetivo do aluno ────────────────────

const SkillSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "use snake_case minúsculo"),
  label: z.string().min(3).max(60),
  description: z.string().min(10).max(200),
  importance: z.number().int().min(1).max(10),
});

const StartResponseSchema = z.object({
  skills: z.array(SkillSchema).min(4).max(6),
});

const START_SYSTEM = `Você é a Bússola — diagnostique as lacunas de conhecimento de um aluno.

Você recebe o OBJETIVO do aluno (ex: "Passar na OAB", "Melhorar negociação com clientes").
Decomponha em 4-6 SUB-HABILIDADES concretas e mensuráveis — não tópicos vagos, mas competências
específicas que o aluno pode auto-avaliar.

Para cada sub-skill:
- slug: snake_case curto (ex: "abertura_negociacao", "leitura_balanco")
- label: nome amigável (ex: "Abertura de negociação")
- description: 1 frase explicando o que essa skill significa na prática
- importance: 1-10 baseado em quão crítica essa skill é para o objetivo (mais críticas = 8-10)

PERSONA: contador brasileiro com foco em negociação prática.
Evite skills genéricas tipo "comunicação" — seja específico.`;

const StartBodySchema = z.object({
  phase: z.literal("start"),
  goal: z.string().min(3).max(300).optional(),
});

const AnswerSchema = z.object({
  slug: z.string().min(2).max(40),
  label: z.string().min(3).max(60),
  /** Self-assessment 0-100 ("o quanto você domina isso") */
  selfScore: z.number().int().min(0).max(100),
  importance: z.number().int().min(1).max(10).default(5),
});

const SubmitBodySchema = z.object({
  phase: z.literal("submit"),
  answers: z.array(AnswerSchema).min(1).max(8),
});

const BodySchema = z.discriminatedUnion("phase", [StartBodySchema, SubmitBodySchema]);

function classify(score: number): "domina" | "lacuna_parcial" | "lacuna_critica" {
  if (score >= 70) return "domina";
  if (score >= 40) return "lacuna_parcial";
  return "lacuna_critica";
}

async function loadGoal(userId: string | null, fallback?: string): Promise<string> {
  if (!userId) return fallback ?? "Melhorar habilidades de negociação";
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("user_profile")
    .select("goal")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.goal ?? fallback ?? "Melhorar habilidades de negociação";
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (body.phase === "start") {
    const userId = await getCurrentUserId();
    const goal = await loadGoal(userId, body.goal);
    try {
      const out = await genObject({
        schema: StartResponseSchema,
        system: START_SYSTEM,
        prompt: `Objetivo do aluno: "${goal}"\n\nGere as sub-habilidades agora.`,
      });
      return NextResponse.json({ goal, skills: out.skills });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `IA falhou: ${msg}` }, { status: 500 });
    }
  }

  // submit
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      {
        error: "auth required",
        message: "Faça login na CEFIS pra salvar seu diagnóstico.",
      },
      { status: 401 }
    );
  }

  const rows = body.answers.map((a) => ({
    user_id: userId,
    skill_slug: a.slug,
    skill_label: a.label,
    score: a.selfScore,
    status: classify(a.selfScore),
    importance: a.importance,
    source: "diagnostic",
  }));

  const supabase = supabaseAdmin();
  // Upsert por (user_id, skill_slug)
  const { error } = await supabase
    .from("skill_assessment")
    .upsert(rows, { onConflict: "user_id,skill_slug" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Summary pra UI
  const critical = rows.filter((r) => r.status === "lacuna_critica");
  const partial = rows.filter((r) => r.status === "lacuna_parcial");
  const mastered = rows.filter((r) => r.status === "domina");

  return NextResponse.json({
    ok: true,
    summary: {
      critical: critical.map((c) => c.skill_label),
      partial: partial.map((p) => p.skill_label),
      mastered: mastered.map((m) => m.skill_label),
      total: rows.length,
    },
  });
}
