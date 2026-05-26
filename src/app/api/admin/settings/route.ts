import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SENSITIVE_FIELDS = [
  "openai_api_key",
  "openrouter_api_key",
  "google_api_key",
  "cefis_demo_api_key",
  "evolution_api_key",
  "evolution_webhook_secret",
] as const;

const ALLOWED_FIELDS = [
  "openai_api_key",
  "openrouter_api_key",
  "google_api_key",
  "cefis_demo_api_key",
  "chat_model",
  "embedding_model",
  "tts_voice_ana",
  "tts_voice_bruno",
  "tts_voice_tutor",
  "whisper_model",
  "rag_match_threshold",
  "rag_top_k",
  "feature_flags",
  "evolution_api_url",
  "evolution_api_key",
  "evolution_instance",
  "evolution_bot_phone",
  "evolution_webhook_secret",
] as const;

function checkPassword(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD não configurado em .env" },
      { status: 500 }
    );
  }
  const provided = req.headers.get("x-admin-password");
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  const denied = checkPassword(req);
  if (denied) return denied;

  const settings = await getSettings(true);
  const masked: Record<string, unknown> = { ...settings };
  for (const f of SENSITIVE_FIELDS) {
    const v = settings[f];
    masked[f] = v ? maskKey(v) : null;
  }
  // Flags '_has*' booleanas para o cliente saber se há valor sem expor nada
  masked._hasOpenAI = !!settings.openai_api_key;
  masked._hasOpenRouter = !!settings.openrouter_api_key;
  masked._hasGoogle = !!settings.google_api_key;
  masked._hasCefisDemo = !!settings.cefis_demo_api_key;
  masked._hasEvolutionKey = !!settings.evolution_api_key;
  masked._hasEvolutionSecret = !!settings.evolution_webhook_secret;
  masked._hasEvolutionConfig =
    !!settings.evolution_api_url && !!settings.evolution_api_key && !!settings.evolution_instance;

  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const denied = checkPassword(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  for (const k of ALLOWED_FIELDS) {
    if (!(k in body) || body[k] === undefined) continue;
    // Não sobrescreve campo sensível com string vazia
    if (SENSITIVE_FIELDS.includes(k as (typeof SENSITIVE_FIELDS)[number]) && body[k] === "") continue;
    patch[k] = body[k];
  }

  try {
    await updateSettings(patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

function maskKey(key: string): string {
  if (key.length < 12) return "•••••";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
