import "server-only";
import { supabaseAdmin } from "./supabase";

export interface AppSettings {
  openai_api_key: string | null;
  openrouter_api_key: string | null;
  google_api_key: string | null;
  cefis_demo_api_key: string | null;
  chat_model: string;
  embedding_model: string;
  tts_voice_ana: string;
  tts_voice_bruno: string;
  tts_voice_tutor: string;
  whisper_model: string;
  rag_match_threshold: number;
  rag_top_k: number;
  feature_flags: Record<string, unknown>;
  // Evolution / WhatsApp
  evolution_api_url: string | null;
  evolution_api_key: string | null;
  evolution_instance: string | null;
  evolution_bot_phone: string | null;
  evolution_webhook_secret: string | null;
}

const DEFAULTS: AppSettings = {
  openai_api_key: null,
  openrouter_api_key: null,
  google_api_key: null,
  cefis_demo_api_key: null,
  chat_model: "gpt-4o-mini",
  embedding_model: "text-embedding-3-small",
  tts_voice_ana: "nova",
  tts_voice_bruno: "onyx",
  tts_voice_tutor: "onyx",
  whisper_model: "whisper-1",
  rag_match_threshold: 0.7,
  rag_top_k: 5,
  feature_flags: {},
  evolution_api_url: null,
  evolution_api_key: null,
  evolution_instance: null,
  evolution_bot_phone: null,
  evolution_webhook_secret: null,
};

let cache: { value: AppSettings; expiresAt: number } | null = null;
const TTL_MS = 60_000;

export async function getSettings(forceRefresh = false): Promise<AppSettings> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }

  const merged: AppSettings = { ...DEFAULTS };

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      merged.openai_api_key = data.openai_api_key ?? null;
      merged.openrouter_api_key = data.openrouter_api_key ?? null;
      merged.google_api_key = data.google_api_key ?? null;
      merged.cefis_demo_api_key = data.cefis_demo_api_key ?? null;
      merged.chat_model = data.chat_model ?? DEFAULTS.chat_model;
      merged.embedding_model = data.embedding_model ?? DEFAULTS.embedding_model;
      merged.tts_voice_ana = data.tts_voice_ana ?? DEFAULTS.tts_voice_ana;
      merged.tts_voice_bruno = data.tts_voice_bruno ?? DEFAULTS.tts_voice_bruno;
      merged.tts_voice_tutor = data.tts_voice_tutor ?? DEFAULTS.tts_voice_tutor;
      merged.whisper_model = data.whisper_model ?? DEFAULTS.whisper_model;
      merged.rag_match_threshold = data.rag_match_threshold ?? DEFAULTS.rag_match_threshold;
      merged.rag_top_k = data.rag_top_k ?? DEFAULTS.rag_top_k;
      merged.feature_flags = data.feature_flags ?? {};
      merged.evolution_api_url = data.evolution_api_url ?? null;
      merged.evolution_api_key = data.evolution_api_key ?? null;
      merged.evolution_instance = data.evolution_instance ?? null;
      merged.evolution_bot_phone = data.evolution_bot_phone ?? null;
      merged.evolution_webhook_secret = data.evolution_webhook_secret ?? null;
    }
  } catch {
    // Banco indisponível — usa env como fallback
  }

  // Fallback final: env vars
  if (!merged.openai_api_key && process.env.OPENAI_API_KEY) {
    merged.openai_api_key = process.env.OPENAI_API_KEY;
  }
  if (!merged.openrouter_api_key && process.env.OPENROUTER_API_KEY) {
    merged.openrouter_api_key = process.env.OPENROUTER_API_KEY;
  }
  if (!merged.google_api_key && process.env.GOOGLE_API_KEY) {
    merged.google_api_key = process.env.GOOGLE_API_KEY;
  }
  if (!merged.cefis_demo_api_key && process.env.CEFIS_DEMO_API_KEY) {
    merged.cefis_demo_api_key = process.env.CEFIS_DEMO_API_KEY;
  }

  cache = { value: merged, expiresAt: Date.now() + TTL_MS };
  return merged;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(`Falha ao salvar settings: ${error.message}`);
  cache = null;
  return getSettings(true);
}

export function invalidateSettingsCache() {
  cache = null;
}
