import { Hono } from "hono";
import { validateWebhook, downloadMediaBase64 } from "./evolution";
import { normalizePhone } from "./phone";
import { db } from "./supabase";
import { relayToNextjs, type RelayPayload } from "./relay";
import { log } from "./log";

interface EvolutionWebhookBody {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      audioMessage?: { mimetype?: string; seconds?: number };
      imageMessage?: { caption?: string };
    };
    messageType?: string;
    pushName?: string;
    messageTimestamp?: number;
  };
}

export const webhookRouter = new Hono();

webhookRouter.post("/evolution/webhook", async (c) => {
  // 1. Validação de origem
  const v = validateWebhook({ url: c.req.url, headers: c.req.raw.headers });
  if (!v.ok) {
    log.warn("webhook.forbidden", { reason: v.reason });
    return c.json({ error: "forbidden" }, 403);
  }

  let body: EvolutionWebhookBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid body" }, 400);
  }

  const event = body.event ?? "other";

  // 2. ACK rápido — qualquer trabalho pesado é fire-and-forget
  queueMicrotask(() => {
    process(body, event).catch((err) => log.error("webhook.process", { err: errMsg(err) }));
  });

  return c.json({ ok: true });
});

async function process(body: EvolutionWebhookBody, eventRaw: string) {
  if (eventRaw === "messages.upsert") {
    await handleMessageUpsert(body);
  } else if (eventRaw === "connection.update") {
    log.info("evolution.connection", {
      instance: body.instance,
      // status detail intencionalmente truncado nos logs
    });
    // Por enquanto não precisa repassar pro Next.js
  } else {
    log.debug("evolution.event.ignored", { event: eventRaw });
  }
}

async function handleMessageUpsert(body: EvolutionWebhookBody) {
  const k = body.data?.key;
  if (k?.fromMe) return;

  const phone = normalizePhone(k?.remoteJid);
  if (!phone) {
    log.warn("webhook.noPhone");
    return;
  }

  const msg = body.data?.message ?? {};
  const messageType = body.data?.messageType ?? null;
  // Apenas conversation/extendedTextMessage entram como texto utilizável.
  // Caption de imagem/vídeo/doc é ignorada — o Next.js decide "em construção"
  // por messageType. Áudio segue baixando base64 pra transcrição lá no Next.js
  // (com fallback pra "em construção" caso o Whisper falhe por cota/etc).
  const text =
    messageType === "conversation"
      ? msg.conversation ?? null
      : messageType === "extendedTextMessage"
        ? msg.extendedTextMessage?.text ?? null
        : null;

  const isAudio = messageType === "audioMessage" || messageType === "pttMessage";
  let audioPayload: RelayPayload["audio"] = null;
  if (isAudio && k?.id && k?.remoteJid) {
    const audioMeta = msg.audioMessage ?? null;
    const { base64, mimetype } = await downloadMediaBase64({
      id: k.id,
      remoteJid: k.remoteJid,
      fromMe: !!k.fromMe,
    });
    if (base64) {
      audioPayload = {
        base64,
        mimetype: mimetype ?? audioMeta?.mimetype ?? null,
        ...(audioMeta?.seconds !== undefined && { seconds: audioMeta.seconds }),
      };
    }
  }

  // 3. Persistência raw (audit log) — antes do dispatch
  try {
    await db()
      .from("whatsapp_messages")
      .insert({
        user_id: null, // Next.js resolve depois
        phone,
        direction: "in",
        kind: text ? "text" : audioPayload ? "audio" : "unknown",
        content: text,
        evolution_message_id: k?.id ?? null,
      });
  } catch (err) {
    log.warn("webhook.persistRaw.failed", { err: errMsg(err) });
  }

  // 4. Dispatch para Next.js (com retries internos)
  await relayToNextjs({
    event: "messages.upsert",
    phone,
    text: text ?? null,
    messageType,
    audio: audioPayload,
    pushName: body.data?.pushName ?? null,
    evolutionMessageId: k?.id ?? null,
    raw: { messageType, timestamp: body.data?.messageTimestamp },
  });
}

function errMsg(err: unknown) {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}
