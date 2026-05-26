import { Hono } from "hono";
import { z } from "zod";
import { sendText, sendAudio, downloadMediaBase64 } from "./evolution";
import { hmacMiddleware, parseBody } from "./middleware";
import { enqueueOutbound, queueSize } from "./queue";
import { log } from "./log";

const TextSchema = z.object({
  phone: z.string().min(8).max(20),
  text: z.string().min(1).max(4000),
});

const AudioSchema = z.object({
  phone: z.string().min(8).max(20),
  audio_base64: z.string().min(1),
  mimetype: z.string().nullable().optional(),
});

const MediaDownloadSchema = z.object({
  id: z.string().min(1),
  remoteJid: z.string().min(1),
  fromMe: z.boolean(),
});

export const sendRouter = new Hono();
sendRouter.use("*", hmacMiddleware);

sendRouter.post("/send/text", async (c) => {
  const parsed = TextSchema.safeParse(parseBody(c));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);

  enqueueOutbound(`text:${parsed.data.phone.slice(-4)}`, () =>
    withRetry(() => sendText(parsed.data.phone, parsed.data.text)).then((id) => id ?? null)
  );
  return c.json({ queued: true, position: queueSize() }, 202);
});

sendRouter.post("/send/audio", async (c) => {
  const parsed = AudioSchema.safeParse(parseBody(c));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);

  enqueueOutbound(`audio:${parsed.data.phone.slice(-4)}`, () =>
    withRetry(() => sendAudio(parsed.data.phone, parsed.data.audio_base64)).then((id) => id ?? null)
  );
  return c.json({ queued: true, position: queueSize() }, 202);
});

sendRouter.post("/media/download", async (c) => {
  const parsed = MediaDownloadSchema.safeParse(parseBody(c));
  if (!parsed.success) return c.json({ error: "invalid body" }, 400);

  const out = await downloadMediaBase64(parsed.data);
  if (!out.base64) return c.json({ error: "no media" }, 404);
  return c.json({ base64: out.base64, mimetype: out.mimetype });
});

async function withRetry<T>(fn: () => Promise<T>): Promise<T | undefined> {
  const delays = [0, 500, 2000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]! > 0) await new Promise((r) => setTimeout(r, delays[i]!));
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /\s5\d{2}\b|fetch failed|aborted|timeout/i.test(msg);
      log.warn("send.attempt.failed", { attempt: i + 1, transient, msg });
      if (!transient) return undefined;
    }
  }
  return undefined;
}
