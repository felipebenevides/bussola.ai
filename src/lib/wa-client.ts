import "server-only";
import { signBody, getInternalSecret, HMAC_HEADER } from "./hmac";

function baseUrl(): string {
  const u = process.env.WA_SERVICE_URL;
  if (!u) throw new Error("WA_SERVICE_URL ausente — URL do serviço Bun (Railway).");
  return u.replace(/\/$/, "");
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const raw = JSON.stringify(body);
  const sig = signBody(raw, getInternalSecret());
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [HMAC_HEADER]: sig,
    },
    body: raw,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`wa ${path} ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function waSendText(phone: string, text: string): Promise<string | null> {
  const res = await call<{ messageId: string | null }>("/v1/send/text", { phone, text });
  return res.messageId ?? null;
}

export async function waSendAudio(
  phone: string,
  audioBase64: string,
  mimetype?: string | null
): Promise<string | null> {
  const res = await call<{ messageId: string | null }>("/v1/send/audio", {
    phone,
    audio_base64: audioBase64,
    mimetype: mimetype ?? null,
  });
  return res.messageId ?? null;
}
