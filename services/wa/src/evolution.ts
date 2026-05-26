import { env } from "./env";
import { normalizePhone } from "./phone";

interface EvolutionSendResponse {
  key?: { id?: string };
  messageId?: string;
  status?: string;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = env();
  const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
    method,
    headers: {
      apikey: EVOLUTION_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`evolution ${method} ${path} ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function sendText(number: string, text: string): Promise<string | null> {
  const n = normalizePhone(number);
  if (!n) throw new Error("invalid phone");
  const { EVOLUTION_INSTANCE } = env();
  const res = await call<EvolutionSendResponse>(
    "POST",
    `/message/sendText/${EVOLUTION_INSTANCE}`,
    { number: n, text }
  );
  return res.key?.id ?? res.messageId ?? null;
}

export async function sendAudio(number: string, audioBase64: string): Promise<string | null> {
  const n = normalizePhone(number);
  if (!n) throw new Error("invalid phone");
  const { EVOLUTION_INSTANCE } = env();
  const res = await call<EvolutionSendResponse>(
    "POST",
    `/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE}`,
    { number: n, audio: audioBase64 }
  );
  return res.key?.id ?? res.messageId ?? null;
}

export async function downloadMediaBase64(messageKey: {
  id: string;
  remoteJid: string;
  fromMe: boolean;
}): Promise<{ base64: string | null; mimetype: string | null }> {
  const { EVOLUTION_INSTANCE } = env();
  try {
    const res = await call<{ base64?: string; mimetype?: string }>(
      "POST",
      `/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
      { message: { key: messageKey } }
    );
    return { base64: res.base64 ?? null, mimetype: res.mimetype ?? null };
  } catch {
    return { base64: null, mimetype: null };
  }
}

export interface InstanceCreateResponse {
  instance?: { instanceName?: string; status?: string };
  qrcode?: { base64?: string; code?: string };
}

export async function createInstance(name: string): Promise<InstanceCreateResponse> {
  // Body do create varia entre versões; mantemos o conjunto mínimo aceito pelo v2.
  return call<InstanceCreateResponse>("POST", `/instance/create`, {
    instanceName: name,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  });
}

export async function connectInstance(name: string): Promise<{ qr?: string }> {
  const res = await call<{ base64?: string; code?: string }>("GET", `/instance/connect/${name}`);
  return { qr: res.base64 ?? res.code };
}

export interface GroupCreateResponse {
  /** JID do grupo (formato {numero}-{timestamp}@g.us). */
  id?: string;
  groupJid?: string;
  subject?: string;
  /** Lista de telefones aceitos pelo Evolution (alguns números podem ser
   *  rejeitados se não tiverem WhatsApp). */
  participants?: Array<{ id: string; admin?: string | null }>;
}

export async function createGroup(opts: {
  instanceName: string;
  subject: string;
  description?: string;
  participants: string[]; // E.164 sem '+'
}): Promise<GroupCreateResponse> {
  return call<GroupCreateResponse>("POST", `/group/create/${opts.instanceName}`, {
    subject: opts.subject,
    description: opts.description ?? "Grupo de estudo Bússola — 7 dias de acesso",
    participants: opts.participants,
  });
}

export async function instanceStatus(name: string): Promise<{
  state?: string;
  connected: boolean;
  phone?: string | null;
}> {
  const res = await call<any>("GET", `/instance/connectionState/${name}`);
  const state = res?.instance?.state ?? res?.state;
  return {
    state,
    connected: state === "open" || state === "connected",
    phone: res?.instance?.user?.id ?? res?.user?.id ?? null,
  };
}

export async function pingEvolution(): Promise<boolean> {
  try {
    const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = env();
    const res = await fetch(`${EVOLUTION_API_URL}/`, {
      method: "GET",
      headers: { apikey: EVOLUTION_API_KEY },
      signal: AbortSignal.timeout(2000),
    });
    return res.ok || res.status === 401 || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * Valida webhook usando o secret na query string + (opcional) header apikey.
 * Mesma lógica do Next.js antigo, porém usando env em vez de getSettings().
 */
export function validateWebhook(req: {
  url: string;
  headers: Headers;
}): { ok: boolean; reason?: string } {
  const { EVOLUTION_WEBHOOK_SECRET, EVOLUTION_API_KEY } = env();
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || !constantTimeEq(secret, EVOLUTION_WEBHOOK_SECRET)) {
    return { ok: false, reason: "secret" };
  }
  const apikey = req.headers.get("apikey");
  if (apikey && !constantTimeEq(apikey, EVOLUTION_API_KEY)) {
    return { ok: false, reason: "apikey" };
  }
  return { ok: true };
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
