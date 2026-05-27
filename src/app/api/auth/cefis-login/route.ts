import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { CefisClient } from "@/lib/cefis";
import { supabaseAdmin } from "@/lib/supabase";
import { CEFIS_COOKIE, CEFIS_USER_COOKIE } from "@/lib/cefis-server";
import { ensureSessionId, recordEvent } from "@/lib/analytics-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().min(1).max(100),
  pass: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email e senha são obrigatórios." }, { status: 400 });
  }

  const { email, pass } = parsed.data;
  const client = new CefisClient();

  let loginData;
  try {
    loginData = await client.login(email, pass);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is401 = /\b401\b/.test(msg);
    return NextResponse.json(
      { error: is401 ? "Credenciais inválidas." : `Falha no login: ${msg}` },
      { status: is401 ? 401 : 502 }
    );
  }

  // Upsert do usuário local (espelha conta CEFIS)
  try {
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("users").upsert(
      {
        cefis_user_id: loginData.user.id,
        cefis_api_key: loginData.key,
        email: loginData.user.email,
        name: loginData.user.name,
        first_name: loginData.user.first_name,
        avatar: loginData.user.avatar,
        occupation: loginData.user.occupation ?? null,
        city: loginData.user.city ?? null,
        state: loginData.user.state ?? null,
        activities: loginData.user.activities ?? null,
        is_premium: loginData.user.is_premium ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cefis_user_id" }
    );
    if (error) console.error("[cefis-login] upsert users:", error.message);
  } catch (err) {
    // Falha ao salvar no banco não impede o login — apenas log
    console.error("[cefis-login] supabase indisponível:", err);
  }

  const jar = await cookies();
  const oneYear = 60 * 60 * 24 * 365;
  jar.set(CEFIS_COOKIE, loginData.key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: oneYear,
    path: "/",
  });
  jar.set(CEFIS_USER_COOKIE, String(loginData.user.id), {
    httpOnly: false, // legível no client para mostrar avatar/nome
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: oneYear,
    path: "/",
  });

  // Analytics: identify event vinculando sessão anônima ao login CEFIS
  try {
    const sessionId = await ensureSessionId();
    await recordEvent({
      sessionId,
      email: loginData.user.email?.toLowerCase() ?? null,
      eventType: "identify",
      userAgent: req.headers.get("user-agent"),
      metadata: { source: "login", cefis_user_id: loginData.user.id },
    });
  } catch {
    // não-crítico
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: loginData.user.id,
      name: loginData.user.name,
      first_name: loginData.user.first_name,
      email: loginData.user.email,
      avatar: loginData.user.avatar,
      occupation: loginData.user.occupation,
      city: loginData.user.city,
    },
  });
}
