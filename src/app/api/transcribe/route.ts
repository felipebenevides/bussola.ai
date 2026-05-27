import { NextRequest, NextResponse } from "next/server";
import { toFile } from "openai";
import { getOpenAIRaw } from "@/lib/ai";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — Whisper aceita até 25MB; cortamos antes pra evitar abuso

/**
 * POST multipart/form-data:
 *   - file: Blob com áudio (audio/webm, audio/ogg, audio/mp4, audio/wav)
 *
 * Retorna: { text: string }
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body precisa ser multipart/form-data." }, { status: 400 });
  }

  const blob = form.get("file");
  if (!(blob instanceof Blob)) {
    return NextResponse.json({ error: "Campo 'file' obrigatório." }, { status: 400 });
  }
  if (blob.size === 0) {
    return NextResponse.json({ error: "Áudio vazio." }, { status: 400 });
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: "Áudio acima de 10MB." }, { status: 413 });
  }

  const mimetype = blob.type || "audio/webm";
  let ext = "webm";
  if (mimetype.includes("ogg")) ext = "ogg";
  else if (mimetype.includes("mp4")) ext = "m4a";
  else if (mimetype.includes("mpeg")) ext = "mp3";
  else if (mimetype.includes("wav")) ext = "wav";

  try {
    const settings = await getSettings();
    const oai = await getOpenAIRaw();
    const buffer = Buffer.from(await blob.arrayBuffer());
    const file = await toFile(buffer, `audio.${ext}`, { type: mimetype });
    const res = await oai.audio.transcriptions.create({
      file,
      model: settings.whisper_model,
      language: "pt",
    });
    const text = res.text.trim();
    if (!text) {
      return NextResponse.json({ error: "Não consegui entender o áudio." }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao transcrever.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
