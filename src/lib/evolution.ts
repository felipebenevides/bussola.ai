import "server-only";
import { getSettings } from "./settings";
import { normalizePhone } from "./phone";

/**
 * Cliente da Evolution API v2 (https://doc.evolution-api.com/).
 *
 * Segurança:
 * - URL, apikey e instance lidos de app_settings via getSettings(), nunca de env nem hardcoded.
 * - Toda chamada de saída é server-only (este arquivo importa 'server-only').
 * - Webhook entrada é validado por evolution_webhook_secret passado como query string.
 *   Evolution v2 também envia o `apikey` header — comparamos os dois para defesa em camadas.
 */

export interface EvolutionConfig {
  url: string;
  apiKey: string;
  instance: string;
  botPhone: string | null;
  webhookSecret: string | null;
}

export async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  const s = await getSettings();
  if (!s.evolution_api_url || !s.evolution_api_key || !s.evolution_instance) {
    return null;
  }
  return {
    url: s.evolution_api_url.replace(/\/$/, ""),
    apiKey: s.evolution_api_key,
    instance: s.evolution_instance,
    botPhone: s.evolution_bot_phone ?? null,
    webhookSecret: s.evolution_webhook_secret ?? null,
  };
}

async function callEvolution<T>(
  cfg: EvolutionConfig,
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${cfg.url}${path}`, {
    method,
    headers: {
      apikey: cfg.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Não logar text completo — pode conter token; logar só status
    throw new Error(`Evolution ${method} ${path} ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface EvolutionSendResponse {
  key?: { id?: string };
  messageId?: string;
  status?: string;
}

/**
 * Envia uma mensagem de texto para um número.
 * `number`: E.164 sem '+' (ex: "5511999999999").
 */
export async function sendText(number: string, text: string): Promise<string | null> {
  const cfg = await getEvolutionConfig();
  if (!cfg) throw new Error("Evolution não configurada (defina em /admin).");

  const n = normalizePhone(number);
  if (!n) throw new Error("Número inválido");

  const res = await callEvolution<EvolutionSendResponse>(
    cfg,
    "POST",
    `/message/sendText/${cfg.instance}`,
    { number: n, text }
  );
  return res.key?.id ?? res.messageId ?? null;
}

/**
 * Envia um áudio para um número. Aceita URL pública OU base64.
 */
export async function sendAudio(number: string, audio: string): Promise<string | null> {
  const cfg = await getEvolutionConfig();
  if (!cfg) throw new Error("Evolution não configurada (defina em /admin).");

  const n = normalizePhone(number);
  if (!n) throw new Error("Número inválido");

  const res = await callEvolution<EvolutionSendResponse>(
    cfg,
    "POST",
    `/message/sendWhatsAppAudio/${cfg.instance}`,
    { number: n, audio }
  );
  return res.key?.id ?? res.messageId ?? null;
}

/**
 * Baixa o conteúdo de um media de mensagem (áudio/imagem) via /chat/getBase64FromMediaMessage.
 * Retorna base64.
 */
export async function downloadMediaBase64(messageKey: {
  id: string;
  remoteJid: string;
  fromMe: boolean;
}): Promise<string | null> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return null;

  try {
    const res = await callEvolution<{ base64?: string; mimetype?: string }>(
      cfg,
      "POST",
      `/chat/getBase64FromMediaMessage/${cfg.instance}`,
      { message: { key: messageKey } }
    );
    return res.base64 ?? null;
  } catch {
    return null;
  }
}

/**
 * Valida o webhook recebido.
 *
 * - Se `webhookSecret` estiver configurado em /admin, exige `?secret=` igual.
 *   (Recomendado: configure URL na Evolution como /api/whatsapp/webhook?secret=...)
 * - Se `apikey` header vier, deve bater com a apikey da instância.
 *
 * Retorna true só se TODAS as proteções configuradas passarem.
 */
export async function validateWebhook(req: {
  headers: Headers;
  url: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const cfg = await getEvolutionConfig();
  if (!cfg) return { ok: false, reason: "Evolution não configurada" };

  // 1. Secret na query string (sempre exigido se configurado)
  if (cfg.webhookSecret) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    if (!secret || !constantTimeEqual(secret, cfg.webhookSecret)) {
      return { ok: false, reason: "secret inválido" };
    }
  }

  // 2. Header apikey (defesa em camadas) — Evolution v2 envia. Se não vier, OK desde que secret tenha vindo.
  const apikey = req.headers.get("apikey");
  if (apikey && !constantTimeEqual(apikey, cfg.apiKey)) {
    return { ok: false, reason: "apikey inválida" };
  }

  // Se NENHUMA das duas proteções foi exigida, recusa por segurança
  if (!cfg.webhookSecret && !apikey) {
    return {
      ok: false,
      reason: "configure evolution_webhook_secret em /admin antes de aceitar webhooks",
    };
  }

  return { ok: true };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
