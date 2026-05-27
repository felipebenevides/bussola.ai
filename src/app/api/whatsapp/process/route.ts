import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySignature, HMAC_HEADER, getInternalSecret } from "@/lib/hmac";
import { supabaseAdmin } from "@/lib/supabase";
import { askTutor, formatTutorForWhatsApp } from "@/lib/tutor-agent";
import { normalizePhone } from "@/lib/phone";
import { waSendText } from "@/lib/wa-client";
import { getOpenAIRaw } from "@/lib/ai";
import { getSettings } from "@/lib/settings";
import { toFile } from "openai/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PayloadSchema = z.object({
  event: z.enum(["messages.upsert", "connection.update", "other"]),
  phone: z.string().optional(),
  text: z.string().nullable().optional(),
  messageType: z.string().nullable().optional(),
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
const GREETING_REGEX =
  /^\s*(oi+|ola+|ol[aá]+|hello+|hi+|hey+|menu|ajuda|help|start|começar|comecar|in[íi]cio|\/start|\/menu)\s*[!.?]*\s*$/i;

const APP_URL = "https://bussola-ai.vercel.app";

const TEXT_MESSAGE_TYPES = new Set(["conversation", "extendedTextMessage"]);
const MEDIA_KIND_MAP: Record<string, "audio" | "image" | "video" | "document"> = {
  audioMessage: "audio",
  imageMessage: "image",
  videoMessage: "video",
  documentMessage: "document",
  stickerMessage: "image",
  pttMessage: "audio",
};

function welcomeMessage(name: string | null): string {
  const hi = name ? `*Oi, ${name}!*` : "*Oi!*";
  return [
    `🧭 ${hi} Sou a *Bússola*, sua tutora baseada no catálogo CEFIS.`,
    "",
    "Como posso te ajudar agora?",
    "",
    "1️⃣  *Listar cursos* indexados",
    "2️⃣  *Acessar o app* na web (plano + tutor visual + deep-link no vídeo)",
    "3️⃣  *Estudar pelo WhatsApp* — me manda sua dúvida que eu respondo com a aula no segundo certo",
    "",
    "Digita *1*, *2* ou *3* — ou já manda sua pergunta direto.",
  ].join("\n");
}

const APP_LINK_MESSAGE = [
  `🌐 Abre a Bússola em ${APP_URL}`,
  "",
  "Lá você entra com CEFIS, vê o plano de estudos, conversa com o tutor e clica no vídeo direto no segundo certo da aula.",
  "",
  "Quando quiser estudar pelo zap de novo, é só me chamar aqui.",
].join("\n");

const STUDY_HINT_MESSAGE = [
  "🎓 Bora! Manda sua dúvida em texto e eu busco no catálogo CEFIS.",
  "",
  "Exemplos:",
  "•  _Como abrir uma negociação difícil?_",
  "•  _O que é BATNA?_",
  "•  _Diferença entre posição e interesse_",
  "",
  "Vou te responder com o trecho exato da aula (mm:ss) para você abrir no app.",
].join("\n");

const MEDIA_NOTICE_MESSAGE = [
  "🚧 *Em construção*",
  "",
  "Áudio, imagem, vídeo e documento ainda estão sendo implementados — em breve você vai poder mandar qualquer mídia que eu entendo.",
  "",
  "Por enquanto, manda sua dúvida em *texto* que eu respondo com a aula CEFIS no segundo certo.",
].join("\n");

const UNKNOWN_MESSAGE = "Não consegui entender essa mensagem. Envie *menu* para ver as opções ou já mande sua dúvida em texto.";

export async function POST(req: NextRequest) {
  // 1. HMAC
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
  if (!phone) return NextResponse.json({ ignored: "no phone" });

  const messageType = parsed.messageType ?? null;
  const isTextMessage = !!messageType && TEXT_MESSAGE_TYPES.has(messageType);
  const isAudioMessage =
    messageType === "audioMessage" || messageType === "pttMessage";
  const mediaKind = messageType ? MEDIA_KIND_MAP[messageType] ?? null : null;

  // 2a. Áudio: tenta transcrever; se cota/erro qualquer, cai pra "em construção"
  let textInput: string | null = null;
  let wasAudio = false;
  if (isAudioMessage && parsed.audio?.base64) {
    wasAudio = true;
    try {
      textInput = await transcribeAudioBase64(
        parsed.audio.base64,
        parsed.audio.mimetype ?? undefined
      );
    } catch (err) {
      logSafe("audio transcription failed", err);
      await safeLog({
        phone,
        direction: "in",
        kind: "audio",
        content: null,
        evolution_message_id: parsed.evolutionMessageId ?? null,
      });
      await sendAndLog(phone, null, MEDIA_NOTICE_MESSAGE);
      return NextResponse.json({ handled: "audio-fallback", kind: "audio" });
    }
  }

  // 2b. Outras mídias (imagem, vídeo, documento, sticker) → "em construção"
  if (!isTextMessage && !wasAudio) {
    await safeLog({
      phone,
      direction: "in",
      kind: mediaKind ?? "unknown",
      content: null,
      evolution_message_id: parsed.evolutionMessageId ?? null,
    });
    await sendAndLog(phone, null, MEDIA_NOTICE_MESSAGE);
    return NextResponse.json({ handled: "media-notice", kind: mediaKind ?? "unknown" });
  }

  // 2c. Texto direto
  if (!wasAudio) {
    textInput = (parsed.text ?? "").trim();
  } else {
    textInput = (textInput ?? "").trim();
  }
  if (!textInput) {
    await safeLog({ phone, direction: "in", kind: wasAudio ? "audio" : "text", content: null });
    await sendAndLog(phone, null, UNKNOWN_MESSAGE);
    return NextResponse.json({ handled: "empty-text" });
  }

  // 3. Lookup do usuário (opcional — não é mais obrigatório pra responder)
  const userMatch = await findUserByPhone(phone);
  const firstName = (parsed.pushName ?? "").split(" ")[0] || null;

  await safeLog({
    user_id: userMatch?.user_id ?? null,
    phone,
    direction: "in",
    kind: wasAudio ? "audio" : "text",
    content: textInput,
    evolution_message_id: parsed.evolutionMessageId ?? null,
  });

  // 4. OTP de pareamento (mantido pra quem já tem código gerado)
  if (OTP_REGEX.test(textInput.toUpperCase())) {
    const linked = await tryLinkCode(textInput.toUpperCase(), phone);
    if (linked.ok) {
      await sendAndLog(
        phone,
        linked.userId,
        "🧭 *Conectado!* Sua conta CEFIS foi pareada com esse WhatsApp. Já pode me mandar perguntas — ou digita *menu*."
      );
      return NextResponse.json({ handled: "linked" });
    }
    if (linked.reason === "expired") {
      await sendAndLog(
        phone,
        null,
        "Esse código já expirou. Envie *menu* para ver as opções ou gere um novo no app."
      );
      return NextResponse.json({ handled: "expired-code" });
    }
  }

  // 5. Comandos do menu
  const trimmed = textInput.toLowerCase();

  if (GREETING_REGEX.test(textInput)) {
    await sendAndLog(phone, userMatch?.user_id ?? null, welcomeMessage(firstName));
    return NextResponse.json({ handled: "menu" });
  }

  if (trimmed === "1" || trimmed.startsWith("1 ") || trimmed === "cursos") {
    const list = await listCoursesMessage();
    await sendAndLog(phone, userMatch?.user_id ?? null, list);
    return NextResponse.json({ handled: "courses-list" });
  }

  if (trimmed === "2" || trimmed === "app" || trimmed === "web") {
    await sendAndLog(phone, userMatch?.user_id ?? null, APP_LINK_MESSAGE);
    return NextResponse.json({ handled: "app-link" });
  }

  if (trimmed === "3" || trimmed === "estudar") {
    await sendAndLog(phone, userMatch?.user_id ?? null, STUDY_HINT_MESSAGE);
    return NextResponse.json({ handled: "study-hint" });
  }

  // 6. Tutor (anônimo OK)
  try {
    const answer = await askTutor({
      query: textInput,
      userId: userMatch?.user_id ?? null,
      channel: "whatsapp",
    });
    const replyText = formatTutorForWhatsApp(answer);
    await sendAndLog(phone, userMatch?.user_id ?? null, replyText, answer.citations);
  } catch (err) {
    logSafe("tutor failed", err);
    await sendAndLog(
      phone,
      userMatch?.user_id ?? null,
      "Tive um problema para consultar a IA agora. Tente de novo em alguns segundos."
    );
  }

  if (userMatch) {
    try {
      await supabaseAdmin()
        .from("user_whatsapp")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("phone", phone);
    } catch {
      /* não-crítico */
    }
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

async function listCoursesMessage(): Promise<string> {
  try {
    const { data } = await supabaseAdmin()
      .from("cefis_courses")
      .select("id, title, lesson_count")
      .order("title")
      .limit(15);
    if (!data || data.length === 0) {
      return "Ainda não tenho cursos indexados. Envie *2* para abrir o app e configurar.";
    }
    const lines = data.map(
      (c, i) => `${i + 1}. *${c.title}* — ${c.lesson_count ?? "?"} aulas (curso #${c.id})`
    );
    return [
      "📚 *Cursos disponíveis no catálogo:*",
      "",
      ...lines,
      "",
      "Envie sua dúvida que eu acho a aula certa. Ou *2* para abrir no app web.",
    ].join("\n");
  } catch (err) {
    logSafe("listCourses failed", err);
    return "Não consegui buscar a lista agora. Tenta de novo em alguns segundos.";
  }
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
