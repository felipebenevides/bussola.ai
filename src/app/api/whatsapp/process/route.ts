import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySignature, HMAC_HEADER, getInternalSecret } from "@/lib/hmac";
import { supabaseAdmin } from "@/lib/supabase";
import { askTutor, formatTutorForWhatsApp } from "@/lib/tutor-agent";
import { getOpenAIRaw } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/phone";
import { waSendText } from "@/lib/wa-client";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PayloadSchema = z.object({
  event: z.enum(["messages.upsert", "connection.update", "other"]),
  phone: z.string().optional(),
  text: z.string().nullable().optional(),
  audio: z
    .object({
      base64: z.string(),
      mimetype: z.string().nullable().optional(),
      seconds: z.number().optional(),
    })
    .nullable()
    .optional(),
  pushName: z.string().nullable().optional(),
  evolutionMessageId: z.string().nullable().optional(),
  raw: z.unknown().optional(),
});

const OTP_REGEX = /^[A-F0-9]{6}$/;

export async function POST(req: NextRequest) {
  // 1. Validação HMAC do serviço Bun
  let secret: string;
  try {
    secret = getInternalSecret();
  } catch (err) {
    console.error("[whatsapp/process] secret missing:", err);
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get(HMAC_HEADER);
  if (!verifySignature(raw, sig, secret)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof PayloadSchema>;
  try {
    parsed = PayloadSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (parsed.event !== "messages.upsert") {
    return NextResponse.json({ ignored: parsed.event });
  }

  const phone = parsed.phone ? normalizePhone(parsed.phone) : null;
  if (!phone) {
    return NextResponse.json({ ignored: "no phone" });
  }

  // 2. Texto direto ou transcrição de áudio
  let textInput: string | null = parsed.text ?? null;
  let wasAudio = false;
  if (!textInput && parsed.audio) {
    wasAudio = true;
    try {
      textInput = await transcribeAudioBase64(
        parsed.audio.base64,
        parsed.audio.mimetype ?? undefined
      );
    } catch (err) {
      logSafe("audio transcription failed", err);
    }
  }

  if (!textInput) {
    await safeLog({ phone, direction: "in", kind: "unknown", content: null });
    await sendSafe(phone, "Por enquanto eu só leio texto e áudio. Pode mandar de novo?");
    return NextResponse.json({ handled: "unknown-kind" });
  }

  textInput = textInput.trim();

  // 3. Log da mensagem in (a Bun já loga raw — aqui anotamos com user_id resolvido)
  const userMatch = await findUserByPhone(phone);
  await safeLog({
    user_id: userMatch?.user_id ?? null,
    phone,
    direction: "in",
    kind: wasAudio ? "audio" : "text",
    content: textInput,
    evolution_message_id: parsed.evolutionMessageId ?? null,
  });

  // 4a. OTP de pareamento
  if (OTP_REGEX.test(textInput.toUpperCase())) {
    const linked = await tryLinkCode(textInput.toUpperCase(), phone);
    if (linked.ok) {
      await sendAndLog(
        phone,
        linked.userId,
        `🧭 Conectado! Agora você pode me mandar dúvidas e áudios sobre seus estudos. Tente: "Como começar uma negociação difícil?"`
      );
      return NextResponse.json({ handled: "linked" });
    }
    if (linked.reason === "expired") {
      await sendAndLog(
        phone,
        null,
        "Esse código já expirou. Gere um novo em bussola.app/conectar-whatsapp."
      );
      return NextResponse.json({ handled: "expired-code" });
    }
  }

  // 4b. Não pareado → instrução
  if (!userMatch) {
    await sendAndLog(
      phone,
      null,
      "Oi! 👋 Sou a Bússola. Para conversar comigo, conecte sua conta em bussola.app/conectar-whatsapp e me envie o código que aparecer lá."
    );
    return NextResponse.json({ handled: "not-paired" });
  }

  // 4c. Tutor agent
  try {
    const answer = await askTutor({
      query: textInput,
      userId: userMatch.user_id,
      channel: "whatsapp",
    });
    const replyText = formatTutorForWhatsApp(answer);
    await sendAndLog(phone, userMatch.user_id, replyText, answer.citations);
  } catch (err) {
    logSafe("tutor failed", err);
    await sendAndLog(
      phone,
      userMatch.user_id,
      "Tive um problema para consultar a IA agora. Tenta de novo em alguns segundos?"
    );
  }

  try {
    await supabaseAdmin()
      .from("user_whatsapp")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("phone", phone);
  } catch {
    /* não-crítico */
  }

  return NextResponse.json({ handled: "tutor" });
}

// ─── Helpers ──────────────────────────────────────────────────────

async function findUserByPhone(phone: string): Promise<{ user_id: string } | null> {
  try {
    const { data } = await supabaseAdmin()
      .from("user_whatsapp")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function tryLinkCode(
  code: string,
  phone: string
): Promise<{ ok: true; userId: string } | { ok: false; reason: "not-found" | "expired" }> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("whatsapp_link_codes")
    .select("user_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();
  if (!data || data.used_at) return { ok: false, reason: "not-found" };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  await supabase
    .from("whatsapp_link_codes")
    .update({ used_at: new Date().toISOString(), used_by_phone: phone })
    .eq("code", code);
  await supabase.from("user_whatsapp").delete().eq("phone", phone);
  await supabase.from("user_whatsapp").delete().eq("user_id", data.user_id);
  const { error } = await supabase
    .from("user_whatsapp")
    .insert({ phone, user_id: data.user_id, linked_at: new Date().toISOString() });
  if (error) return { ok: false, reason: "not-found" };
  return { ok: true, userId: data.user_id };
}

async function sendAndLog(
  phone: string,
  userId: string | null,
  text: string,
  citations?: unknown
) {
  let messageId: string | null = null;
  try {
    messageId = await waSendText(phone, text);
  } catch (err) {
    logSafe("waSendText failed", err);
  }
  await safeLog({
    user_id: userId,
    phone,
    direction: "out",
    kind: "text",
    content: text,
    evolution_message_id: messageId,
    citations: citations as object | undefined,
  });
}

async function sendSafe(phone: string, text: string) {
  try {
    await waSendText(phone, text);
  } catch (err) {
    logSafe("waSendText failed", err);
  }
}

async function safeLog(payload: {
  user_id?: string | null;
  phone: string;
  direction: "in" | "out";
  kind: "text" | "audio" | "image" | "video" | "document" | "unknown";
  content: string | null;
  evolution_message_id?: string | null;
  media_url?: string | null;
  citations?: object | undefined;
}) {
  try {
    await supabaseAdmin().from("whatsapp_messages").insert({
      user_id: payload.user_id ?? null,
      phone: payload.phone,
      direction: payload.direction,
      kind: payload.kind,
      content: payload.content,
      evolution_message_id: payload.evolution_message_id ?? null,
      media_url: payload.media_url ?? null,
      citations: payload.citations ?? null,
    });
  } catch {
    /* não-crítico */
  }
}

async function transcribeAudioBase64(base64: string, mimetype?: string): Promise<string> {
  const settings = await getSettings();
  const oai = await getOpenAIRaw();
  const buffer = Buffer.from(base64, "base64");
  let ext = "ogg";
  if (mimetype?.includes("mp4")) ext = "m4a";
  else if (mimetype?.includes("mpeg")) ext = "mp3";
  else if (mimetype?.includes("wav")) ext = "wav";
  const file = await toFile(buffer, `audio.${ext}`, { type: mimetype || "audio/ogg" });
  const res = await oai.audio.transcriptions.create({
    file,
    model: settings.whisper_model,
    language: "pt",
  });
  return res.text.trim();
}

function logSafe(label: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`[whatsapp/process] ${label}: ${err.name} — ${err.message}`);
  } else {
    console.error(`[whatsapp/process] ${label}: error`);
  }
}
