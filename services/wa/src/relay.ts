import { env } from "./env";
import { signBody, HMAC_HEADER } from "./hmac";
import { log } from "./log";

export interface RelayPayload {
  event: "messages.upsert" | "connection.update" | "other";
  phone?: string;
  text?: string | null;
  audio?: {
    base64: string;
    mimetype: string | null;
    seconds?: number;
  } | null;
  pushName?: string | null;
  evolutionMessageId?: string | null;
  raw: unknown;
}

/**
 * Dispatch fire-and-forget para o Next.js com HMAC.
 * Retries exponenciais: 0s → 2s → 6s. Se todos falharem, logamos e seguimos —
 * a mensagem raw já foi persistida em whatsapp_messages no ack do webhook.
 */
export async function relayToNextjs(payload: RelayPayload): Promise<void> {
  const { NEXTJS_PROCESS_URL, INTERNAL_HMAC_SECRET } = env();
  const body = JSON.stringify(payload);
  const sig = signBody(body, INTERNAL_HMAC_SECRET);

  const delays = [0, 2000, 6000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]! > 0) await sleep(delays[i]!);
    try {
      const res = await fetch(NEXTJS_PROCESS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [HMAC_HEADER]: sig,
        },
        body,
        signal: AbortSignal.timeout(45_000),
      });
      if (res.ok) {
        log.info("relay.ok", { attempt: i + 1, status: res.status, event: payload.event });
        return;
      }
      log.warn("relay.non2xx", { attempt: i + 1, status: res.status });
      // 4xx (exceto 429) não tem porquê retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return;
    } catch (err) {
      log.warn("relay.error", { attempt: i + 1, err: stringErr(err) });
    }
  }
  log.error("relay.gaveUp", { event: payload.event });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stringErr(err: unknown) {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}
