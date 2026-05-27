import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MINUTES = 10;

/**
 * POST /api/whatsapp/link
 * Gera um OTP de 6 chars (A-F0-9) pro usuário CEFIS logado parear o WhatsApp.
 * O webhook (services/wa → /api/whatsapp/process) detecta o código quando
 * o usuário envia pelo zap, vincula `user_whatsapp.phone ↔ user_id` e marca
 * o código como `used_at`.
 *
 * Requisito: estar autenticado via CEFIS (cookie `bussola_cefis_user_id`).
 * Sem login → 401.
 */
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "Faça login com CEFIS antes de gerar o código de pareamento." },
      { status: 401 }
    );
  }

  const settings = await getSettings();
  if (!settings.evolution_bot_phone) {
    return NextResponse.json(
      { error: "O número do bot não está configurado. Avise o admin." },
      { status: 503 }
    );
  }

  const code = randomBytes(3).toString("hex").toUpperCase(); // 6 chars [A-F0-9]
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

  const supabase = supabaseAdmin();

  // Invalida códigos anteriores do mesmo user que ainda não foram usados
  await supabase
    .from("whatsapp_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("used_at", null);

  const { error } = await supabase
    .from("whatsapp_link_codes")
    .insert({ code, user_id: userId, expires_at: expiresAt });

  if (error) {
    return NextResponse.json({ error: "Falha ao gerar código." }, { status: 500 });
  }

  return NextResponse.json({
    code,
    botPhone: settings.evolution_bot_phone,
    expiresAt,
    ttlMinutes: CODE_TTL_MINUTES,
  });
}
