import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { genObject } from "@/lib/ai";
import { waSendText } from "@/lib/wa-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const QUIZ_GAP_HOURS = 36; // máx 1 quiz a cada 36h por aluno
const MAX_PER_RUN = 15;

const QuizSchema = z.object({
  /** Pergunta de aplicação prática (cenário do contador BR). 1-2 frases. */
  question: z
    .string()
    .min(20)
    .max(280)
    .describe(
      "Pergunta CURTA de aplicação prática sobre o skill_label. Cenário realista do contador brasileiro. 1-2 frases."
    ),
  options: z
    .array(z.string().min(2).max(120))
    .length(4)
    .describe("4 alternativas plausíveis, sem letras (A/B/C/D)."),
  correct_index: z.number().int().min(0).max(3),
  explanation: z
    .string()
    .min(30)
    .max(280)
    .describe(
      "Por que a correta é a melhor resposta — em 1-2 frases, conecta com o conceito."
    ),
});

const SYSTEM_PROMPT = `Você é a Bússola — gera UMA pergunta curta de revisão diária para um aluno
contador brasileiro melhorando habilidades práticas (negociação especialmente).

REGRAS:
- Pergunta de APLICAÇÃO PRÁTICA — cenário realista: cliente atrasado, sócio resistente,
  honorário sob pressão, escritório familiar. NUNCA pergunta de teoria pura.
- 4 alternativas plausíveis, sem prefixo de letra. 1 é claramente melhor pela razão certa.
- explanation: por que a correta é a melhor, em 1-2 frases. Conecta com o conceito do skill.
- Tom: caloroso, direto. PT-BR coloquial moderado.`;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function quizToWhatsappText(opts: {
  firstName: string | null;
  skillLabel: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}): string {
  const hi = opts.firstName ? `Bom dia, ${opts.firstName}!` : "Bom dia!";
  const letters = ["a", "b", "c", "d"];
  const optsLines = opts.options.map((o, i) => `${letters[i]}) ${o}`).join("\n");
  return [
    `🧭 ${hi} Quiz rápido pra fixar *${opts.skillLabel}*:`,
    "",
    `❓ ${opts.question}`,
    "",
    optsLines,
    "",
    `Responda com a letra. Se quiser ver a resposta agora, mande *resposta*.`,
    "",
    `||resposta correta: ${letters[opts.correctIndex]}. ${opts.explanation}||`,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = supabaseAdmin();
  const cutoff = new Date(Date.now() - QUIZ_GAP_HOURS * 3600 * 1000).toISOString();

  // 1. Alunos elegíveis: têm WhatsApp pareado e não receberam quiz nas últimas 36h
  const { data: uw, error } = await supabase
    .from("user_whatsapp")
    .select("phone, user_id, last_quiz_sent_at")
    .or(`last_quiz_sent_at.is.null,last_quiz_sent_at.lt.${cutoff}`)
    .limit(MAX_PER_RUN * 2);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!uw || uw.length === 0) {
    return NextResponse.json({ scanned: 0, sent: 0 });
  }

  const userIds = uw.map((u) => u.user_id);

  // 2. Carrega skill_assessment crítica de cada user (importance + status=lacuna)
  const { data: skills } = await supabase
    .from("skill_assessment")
    .select("user_id, skill_slug, skill_label, status, importance")
    .in("user_id", userIds)
    .in("status", ["lacuna_critica", "lacuna_parcial"])
    .order("importance", { ascending: false });

  const skillByUser = new Map<
    string,
    Array<{ skill_slug: string; skill_label: string; status: string; importance: number }>
  >();
  for (const s of skills ?? []) {
    const arr = skillByUser.get(s.user_id) ?? [];
    arr.push(s);
    skillByUser.set(s.user_id, arr);
  }

  // 3. first_name pra saudação
  const { data: users } = await supabase
    .from("users")
    .select("id, first_name")
    .in("id", userIds);
  const nameByUser = new Map<string, string | null>();
  for (const u of users ?? []) nameByUser.set(u.id, u.first_name);

  // 4. Loop: pra cada aluno, pega 1 skill crítica e gera 1 quiz
  const eligible = uw.filter((u) => (skillByUser.get(u.user_id)?.length ?? 0) > 0).slice(0, MAX_PER_RUN);

  let sent = 0;
  const errors: Array<{ phone: string; error: string }> = [];

  for (const u of eligible) {
    const userSkills = skillByUser.get(u.user_id)!;
    const skill = userSkills[0]; // mais importante (já ordenado desc)

    try {
      const quiz = await genObject({
        schema: QuizSchema,
        system: SYSTEM_PROMPT,
        prompt: `Gere 1 pergunta de revisão sobre: "${skill.skill_label}" (slug: ${skill.skill_slug}, status: ${skill.status}).`,
      });

      const text = quizToWhatsappText({
        firstName: nameByUser.get(u.user_id) ?? null,
        skillLabel: skill.skill_label,
        question: quiz.question,
        options: quiz.options,
        correctIndex: quiz.correct_index,
        explanation: quiz.explanation,
      });

      await waSendText(u.phone, text);

      await supabase
        .from("user_whatsapp")
        .update({ last_quiz_sent_at: new Date().toISOString() })
        .eq("phone", u.phone);

      await supabase.from("whatsapp_messages").insert({
        user_id: u.user_id,
        phone: u.phone,
        direction: "out",
        kind: "text",
        content: "[quiz diário]",
        evolution_message_id: null,
      });

      sent++;
    } catch (err) {
      errors.push({
        phone: u.phone,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    scanned: uw.length,
    eligible: eligible.length,
    sent,
    errors: errors.length,
    errorDetails: errors,
  });
}
