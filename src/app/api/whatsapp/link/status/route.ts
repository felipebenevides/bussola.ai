import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp/link/status
 * Polling endpoint do WhatsappModal — retorna se o user logado já está
 * pareado (presença em user_whatsapp). Inclui phone formatado e linkedAt.
 *
 * Polling do modal: a cada 3s enquanto o OTP estiver pendente, até paired=true.
 */
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ paired: false, authenticated: false });
  }

  try {
    const supabase = supabaseAdmin();
    const { data } = await supabase
      .from("user_whatsapp")
      .select("phone, linked_at")
      .eq("user_id", userId)
      .maybeSingle();

    return NextResponse.json({
      paired: !!data,
      authenticated: true,
      phone: data?.phone ?? null,
      linkedAt: data?.linked_at ?? null,
    });
  } catch {
    return NextResponse.json({ paired: false, authenticated: true });
  }
}
