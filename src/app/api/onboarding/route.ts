import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { genObject } from "@/lib/ai";
import { getCurrentUserId, getCefisClient } from "@/lib/cefis-server";
import { supabaseAdmin } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";

/**
 * Quando o aluno digita um número BR sem código de país (10 ou 11 dígitos),
 * adiciona "55" na frente. Acima disso assumimos que já tem DDI.
 */
function ensureBrCountryCode(p: string | null): string | null {
  if (!p) return null;
  if (p.length === 10 || p.length === 11) return "55" + p;
  return p;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).max(20),
});

// Schema que o modelo retorna a cada turno
const TurnSchema = z.object({
  next_message: z
    .string()
    .describe(
      "Próxima fala do tutor em PT-BR (1-3 frases). Pode ser uma pergunta nova OU a confirmação final ('Anotei tudo, vou montar seu plano →')."
    ),
  complete: z
    .boolean()
    .describe(
      "true APENAS quando você já coletou os 5 dados obrigatórios (goal, time_per_day, deadline, weak_area, phone) e está mandando a mensagem final de confirmação."
    ),
  profile: z
    .object({
      goal: z.string().min(3).describe("Objetivo do aluno em 1 frase curta."),
      available_minutes_per_day: z
        .number()
        .int()
        .min(5)
        .max(480)
        .describe("Minutos por dia disponíveis para estudar."),
      deadline_iso: z
        .string()
        .nullable()
        .describe(
          "Deadline em formato ISO YYYY-MM-DD, ou null se o aluno não tem data alvo."
        ),
      learning_style: z
        .enum(["visual", "auditory", "kinesthetic", "mixed"])
        .describe("Estilo de aprendizagem percebido."),
      weak_area: z
        .string()
        .min(3)
        .describe(
          "Área onde o aluno se sente mais fraco — por padrão 'negociacao' para a persona deste hackathon."
        ),
      phone_raw: z
        .string()
        .nullable()
        .describe(
          "WhatsApp do aluno como ele falou — pode vir com (), -, espaços, +55, etc. O backend normaliza. Null APENAS se o aluno se recusar a informar."
        ),
    })
    .nullable()
    .describe("Perfil consolidado. Preenchido APENAS quando complete=true."),
});

const SYSTEM_PROMPT = `Você é a Bússola, tutora de IA da CEFIS. Seu papel agora é fazer um onboarding curto e acolhedor (máximo 5 perguntas) para entender o aluno.

PERSONA TÍPICA do hackathon: contador(a) brasileiro(a) querendo melhorar habilidades de NEGOCIAÇÃO (com clientes, honorários, sócios). Use isso como pano de fundo — se o aluno não disser outro objetivo, sugira/confirme negociação.

INFORMAÇÕES OBRIGATÓRIAS A COLETAR (1 por turno, na ordem):
1. Objetivo principal (goal)
2. Quantos minutos por dia consegue estudar (available_minutes_per_day) — e, na mesma pergunta, se tem deadline (deadline_iso)
3. Como prefere aprender — assistindo, lendo, ouvindo, na prática (learning_style)
4. Onde sente mais dificuldade hoje (weak_area)
5. WhatsApp pessoal pra receber resumos e lembretes da Bússola (phone_raw) — peça com DDD: "Pra fechar, qual seu WhatsApp com DDD? Vou te mandar lembrete pra não perder o ritmo e dá pra estudar pelo zap também."

REGRAS:
- 1 pergunta por turno. NUNCA empilhe múltiplas perguntas no mesmo balão (exceto tempo+deadline, que casam).
- Tom: caloroso, direto, 1-3 frases. Português brasileiro natural ("oi", "beleza", "saca?" sem exagero).
- Use o primeiro nome do aluno quando ele já tiver sido informado no system.
- Quando o aluno responde algo ambíguo, parafraseie e siga.
- Quando já tiver os 5 dados: complete=true + next_message de confirmação ("Show, anotei tudo. Vou montar seu plano agora →") + profile preenchido (com phone_raw extraído da fala do aluno).
- weak_area default: "negociacao" (mesmo se o aluno não souber dizer).
- learning_style: mapear "vídeo/assistindo" → visual; "ouvindo/podcast" → auditory; "fazendo/prática" → kinesthetic; resto → mixed.
- phone_raw: copie a string que o aluno mandou (ex: "11 99999-9999", "+55 11 99999 9999", "11999999999"). O backend normaliza. Se o aluno recusar ("prefiro não", "depois eu mando"), aceite e siga com phone_raw=null — não force.
- Se faltar info crítica (ex: aluno só disse "oi"), faça a primeira pergunta.`;

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Histórico inválido." }, { status: 400 });
  }
  const { messages } = parsed.data;

  // Tentar enriquecer o system com perfil CEFIS (nome, cidade, ocupação)
  let cefisHeader = "";
  try {
    const client = await getCefisClient();
    if (client) {
      const me = await client.me();
      const parts = [
        me.first_name && `Nome: ${me.first_name}`,
        me.occupation && `Ocupação: ${me.occupation}`,
        me.city && `Cidade: ${me.city}`,
      ].filter(Boolean);
      if (parts.length > 0) {
        cefisHeader = `\n\nDADOS DO ALUNO (já vieram do login CEFIS, não pergunte de novo):\n${parts.join("\n")}`;
      }
    }
  } catch {
    // segue sem dados pré-carregados
  }

  const turnHistory =
    messages.length > 0
      ? messages.map((m) => `${m.role === "user" ? "ALUNO" : "BÚSSOLA"}: ${m.content}`).join("\n")
      : "(conversa ainda não começou — faça a saudação + primeira pergunta)";

  const userPrompt = `Histórico da conversa até agora:
${turnHistory}

Decida a próxima fala da Bússola e (se já tiver os 4 dados) preencha profile + complete=true.`;

  let turn: z.infer<typeof TurnSchema>;
  try {
    turn = await genObject({
      schema: TurnSchema,
      system: SYSTEM_PROMPT + cefisHeader,
      prompt: userPrompt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Se completou, persistir
  let savedProfileId: string | null = null;
  if (turn.complete && turn.profile) {
    const userId = await getCurrentUserId();
    if (userId) {
      try {
        const supabase = supabaseAdmin();
        const deadline =
          turn.profile.deadline_iso && /^\d{4}-\d{2}-\d{2}$/.test(turn.profile.deadline_iso)
            ? turn.profile.deadline_iso
            : null;
        const normalizedPhone = turn.profile.phone_raw
          ? ensureBrCountryCode(normalizePhone(turn.profile.phone_raw))
          : null;
        const { error } = await supabase.from("user_profile").upsert(
          {
            user_id: userId,
            goal: turn.profile.goal,
            available_minutes_per_day: turn.profile.available_minutes_per_day,
            learning_style: turn.profile.learning_style,
            deadline,
            phone: normalizedPhone,
            raw_conversation: messages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) {
          console.error("[onboarding] upsert user_profile:", error.message);
        } else {
          savedProfileId = userId;
        }

        // Salva também a "weak_area" como skill_assessment crítica (alimenta o curador)
        await supabase.from("skill_assessment").upsert(
          {
            user_id: userId,
            skill_slug: turn.profile.weak_area.toLowerCase().replace(/\s+/g, "_"),
            skill_label: turn.profile.weak_area,
            score: 30,
            status: "lacuna_critica",
            importance: 9,
            source: "onboarding",
          },
          { onConflict: "user_id,skill_slug" }
        );
      } catch (err) {
        console.error("[onboarding] persistência falhou:", err);
      }
    }
  }

  return NextResponse.json({
    message: turn.next_message,
    complete: turn.complete,
    profileSaved: !!savedProfileId,
  });
}
