import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import OpenAI from "openai";
import type { z } from "zod";
import { getSettings } from "./settings";

/**
 * Estratégia:
 * - Chat (generateObject): tenta OpenRouter primeiro; em qualquer erro cai pra OpenAI direto.
 * - Embeddings + Whisper + TTS: SEMPRE OpenAI direto. OpenRouter não cobre esses endpoints.
 *
 * OpenRouter usa interface OpenAI-compatible em https://openrouter.ai/api/v1.
 * Model names lá são prefixados por provider: `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`.
 * Se o `chat_model` em /admin já tiver `/`, respeitamos. Se não tiver, prefixamos `openai/`.
 */

// ─── Providers ────────────────────────────────────────────────────

async function getOpenAIProvider() {
  const settings = await getSettings();
  if (!settings.openai_api_key) {
    throw new Error("OpenAI API key não configurada. Configure em /admin antes de usar IA.");
  }
  return createOpenAI({ apiKey: settings.openai_api_key });
}

async function getOpenRouterProvider() {
  const settings = await getSettings();
  const key = settings.openrouter_api_key;
  if (!key) return null;
  return createOpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      // Recomendados pela OpenRouter para rankings + identificação no dashboard.
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://bussola.app",
      "X-Title": "Bussola",
    },
  });
}

function toRouterModelName(name: string): string {
  return name.includes("/") ? name : `openai/${name}`;
}

// ─── Chat model (raw) ─────────────────────────────────────────────

/**
 * Devolve o LanguageModel pronto pra usar com `generateObject` / `streamText`.
 * Preferência: OpenRouter (se key presente). Sem fallback automático aqui —
 * use `genObject()` se quiser retry transparente em OpenAI.
 */
export async function getChatModel(): Promise<LanguageModel> {
  const settings = await getSettings();
  const router = await getOpenRouterProvider();
  if (router) return router(toRouterModelName(settings.chat_model));
  const openai = await getOpenAIProvider();
  return openai(settings.chat_model);
}

// ─── Structured output com fallback automático ────────────────────

interface GenObjectOpts<T extends z.ZodTypeAny> {
  schema: T;
  system: string;
  prompt: string;
}

/**
 * Wrapper sobre `generateObject` com fallback OpenRouter → OpenAI.
 * Loga (sem chave, sem stack) quando o router falha.
 */
export async function genObject<T extends z.ZodTypeAny>(
  opts: GenObjectOpts<T>
): Promise<z.infer<T>> {
  const settings = await getSettings();
  const router = await getOpenRouterProvider();

  if (router) {
    try {
      const model = router(toRouterModelName(settings.chat_model));
      const res = await generateObject({
        model,
        schema: opts.schema,
        system: opts.system,
        prompt: opts.prompt,
      });
      return res.object as z.infer<T>;
    } catch (err) {
      logProviderFailure("openrouter", err);
      // segue para fallback
    }
  }

  const openai = await getOpenAIProvider();
  const model = openai(settings.chat_model);
  const res = await generateObject({
    model,
    schema: opts.schema,
    system: opts.system,
    prompt: opts.prompt,
  });
  return res.object as z.infer<T>;
}

function logProviderFailure(label: string, err: unknown) {
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.warn(`[ai] ${label} falhou, tentando fallback. ${msg}`);
}

// ─── OpenAI direto (Whisper, embeddings, TTS) ─────────────────────

export async function getOpenAIRaw() {
  const settings = await getSettings();
  if (!settings.openai_api_key) {
    throw new Error("OpenAI API key não configurada.");
  }
  return new OpenAI({ apiKey: settings.openai_api_key });
}

export async function embed(input: string | string[]): Promise<number[][]> {
  const settings = await getSettings();
  const oai = await getOpenAIRaw();
  const inputs = Array.isArray(input) ? input : [input];
  const res = await oai.embeddings.create({
    model: settings.embedding_model,
    input: inputs,
  });
  return res.data.map((d) => d.embedding);
}
