import { NextRequest, NextResponse } from "next/server";
import { validateWebhook, sendText, downloadMediaBase64 } from "@/lib/evolution";
import { supabaseAdmin } from "@/lib/supabase";
import { askTutor, formatTutorForWhatsApp } from "@/lib/tutor-agent";
import { getOpenAIRaw } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/phone";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// --- Tipos mínimos do payload v2 ----------------------------------
interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      audioMessage?: { mimetype?: string; seconds?: number; url?: string };
      imageMessage?: { caption?: string };
    };
    messageType?: string;
    pushName?: string;
    messageTimestamp?: number;
  };
}

const OTP_REGEX = /^[A-F0-9]{6}$/;

export async function POST(req: NextRequest) {
  // 1. Validação de origem
  const v = await validateWebhook({ headers: req.headers, url: req.url });
  if (!v.ok) {
    // Não vazar a razão exata para evitar fingerprinting
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: EvolutionWebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (body.event !== "messages.upsert") {
    return NextResponse.json({ ignored: true });
  }
  if (body.data?.key?.fromMe) {
    return NextResponse.json({ ignored: "fromMe" });
  }

  const remoteJid = body.data?.key?.remoteJid;
  const phone = remoteJid ? normalizePhone(remoteJid) : null;
  if (!phone) {
    return NextResponse.json({ ignored: "no phone" });
  }

  // 2. Extrai texto OU prepara áudio
  const msg = body.data?.message ?? {};
  let textInput: string | null =
    msg.conversation ?? msg.extendedTextMessage?.text ?? msg.imageMessage?.caption ?? null;
  let wasAudio = false;

  if (!textInput && msg.audioMessage && body.data?.key?.id && body.data?.key?.remoteJid) {
    wasAudio = true;
    try {
      const base64 = await downloadMediaBase64({
        id: body.data.key.id,
        remoteJid: body.data.key.remoteJid,
        fromMe: !!body.data.key.fromMe,
      });
      if (base64) {
        const transcript = await transcribeAudioBase64(base64, msg.audioMessage.mimetype);
        textInput = transcript;
      }
    } catch (err) {
      logSafe("audio transcription failed", err);
    }
  }

  if (!textInput) {
    // Tipo de mensagem que não tratamos (sticker, imagem sem caption etc.)
    await safeLog({ phone, direction: "in", kind: detectKind(body), content: null });
    await sendTextSafe(phone, "Por enquanto eu só leio texto e áudio. Pode mandar de novo?");
    return NextResponse.json({ handled: "unknown-kind" });
  }

  textInput = textInput.trim();

  // 3. Log da mensagem in
  const userMatch = await findUserByPhone(phone);
  await safeLog({
    user_id: userMatch?.user_id ?? null,
    phone,
    direction: "in",
    kind: wasAudio ? "audio" : "text",
    content: textInput,
    evolution_message_id: body.data?.key?.id ?? null,
  });

  // 4a. Tentativa de pareamento se for um código OTP
  if (OTP_REGEX.test(textInput.toUpperCase())) {
    const linked = await tryLinkCode(textInput.toUpperCase(), phone);
    if (linked.ok) {
      await sendTextAndLog(
        phone,
        linked.userId,
        `🧭 Conectado! Agora você pode me mandar dúvidas e áudios sobre seus estudos. Tente: "Como começar uma negociação difícil?"`
      );
      return NextResponse.json({ handled: "linked" });
    }
    if (linked.reason === "expired") {
      await sendTextAndLog(
        phone,
        null,
        "Esse código já expirou. Gere um novo em bussola.app/conectar-whatsapp."
      );
      return NextResponse.json({ handled: "expired-code" });
    }
    // Se reason "not-found", trata como mensagem normal abaixo (talvez o user achou que era código mas era texto)
  }

  // 4b. Usuário não pareado → instrução
  if (!userMatch) {
    await sendTextAndLog(
      phone,
      null,
      "Oi! 👋 Sou a Bússola. Para conversar comigo, conecte sua conta em bussola.app/conectar-whatsapp e me envie o código que aparecer lá."
    );
    return NextResponse.json({ handled: "not-paired" });
  }

  // 4c. Usuário pareado → Tutor Agent
  try {
    const answer = await askTutor({
      query: textInput,
      userId: userMatch.user_id,
      channel: "whatsapp",
    });

    const replyText = formatTutorForWhatsApp(answer);
    await sendTextAndLog(phone, userMatch.user_id, replyText, answer.citations);
  } catch (err) {
    logSafe("tutor failed", err);
    await sendTextAndLog(
      phone,
      userMatch.user_id,
      "Tive um problema para consultar a IA agora. Tenta de novo em alguns segundos?"
    );
  }

  // Atualiza last_seen
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

// ─── Helpers ──────────────────────────────────────────────

function detectKind(body: EvolutionWebhookPayload): "text" | "audio" | "image" | "video" | "document" | "unknown" {
  const msg = body.data?.message ?? {};
  if (msg.conversation || msg.extendedTextMessage) return "text";
  if (msg.audioMessage) return "audio";
  if (msg.imageMessage) return "image";
  return "unknown";
}

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

  // Marca código como usado + faz upsert do vínculo (1 user ↔ 1 phone)
  await supabase
    .from("whatsapp_link_codes")
    .update({ used_at: new Date().toISOString(), used_by_phone: phone })
    .eq("code", code);

  // Remove vínculos antigos do mesmo phone (em caso de re-pareamento)
  await supabase.from("user_whatsapp").delete().eq("phone", phone);
  await supabase.from("user_whatsapp").delete().eq("user_id", data.user_id);

  const { error } = await supabase
    .from("user_whatsapp")
    .insert({ phone, user_id: data.user_id, linked_at: new Date().toISOString() });
  if (error) return { ok: false, reason: "not-found" };

  return { ok: true, userId: data.user_id };
}

async function sendTextAndLog(
  phone: string,
  userId: string | null,
  text: string,
  citations?: unknown
) {
  let evolutionId: string | null = null;
  try {
    evolutionId = await sendText(phone, text);
  } catch (err) {
    logSafe("sendText failed", err);
  }
  await safeLog({
    user_id: userId,
    phone,
    direction: "out",
    kind: "text",
    content: text,
    evolution_message_id: evolutionId,
    citations: citations as object | undefined,
  });
}

async function sendTextSafe(phone: string, text: string) {
  try {
    await sendText(phone, text);
  } catch (err) {
    logSafe("sendText failed", err);
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
    // log opcional, não interrompe o fluxo
  }
}

async function transcribeAudioBase64(base64: string, mimetype?: string): Promise<string> {
  const settings = await getSettings();
  const oai = await getOpenAIRaw();
  const buffer = Buffer.from(base64, "base64");

  // Detecta extensão pelo mimetype (Whisper usa essa info)
  let ext = "ogg";
  if (mimetype?.includes("mp4")) ext = "m4a";
  else if (mimetype?.includes("mpeg")) ext = "mp3";
  else if (mimetype?.includes("wav")) ext = "wav";

  const file = await toFile(buffer, `audio.${ext}`, {
    type: mimetype || "audio/ogg",
  });
  const res = await oai.audio.transcriptions.create({
    file,
    model: settings.whisper_model,
    language: "pt",
  });
  return res.text.trim();
}

/**
 * Log seguro — nunca imprime conteúdo de PII ou chaves.
 */
function logSafe(label: string, err: unknown) {
  if (err instanceof Error) {
    console.error(`[whatsapp/webhook] ${label}: ${err.name} — ${err.message}`);
  } else {
    console.error(`[whatsapp/webhook] ${label}: error`);
  }
}
