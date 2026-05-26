import "server-only";
import { cookies } from "next/headers";
import { CefisClient } from "./cefis";
import { getSettings } from "./settings";

export const CEFIS_COOKIE = "bussola_cefis_key";
export const CEFIS_USER_COOKIE = "bussola_cefis_user_id";

/**
 * Retorna um CefisClient autenticado, ou null se não há credencial.
 *
 * Ordem de prioridade:
 * 1. Cookie HttpOnly do aluno logado (login real via /login)
 * 2. CEFIS_DEMO_API_KEY do backoffice (fallback p/ demo sem login)
 */
export async function getCefisClient(): Promise<CefisClient | null> {
  const jar = await cookies();
  const userKey = jar.get(CEFIS_COOKIE)?.value;
  if (userKey) return new CefisClient(userKey);

  const settings = await getSettings();
  if (settings.cefis_demo_api_key) return new CefisClient(settings.cefis_demo_api_key);

  return null;
}

export async function requireCefisClient(): Promise<CefisClient> {
  const c = await getCefisClient();
  if (!c) {
    throw new Error(
      "Nenhuma credencial CEFIS disponível. Faça login em /login ou configure CEFIS_DEMO_API_KEY em /admin."
    );
  }
  return c;
}

export async function getCurrentCefisUserId(): Promise<number | null> {
  const jar = await cookies();
  const id = jar.get(CEFIS_USER_COOKIE)?.value;
  return id ? parseInt(id, 10) : null;
}

/**
 * Resolve o user local (tabela users) a partir do cookie de login CEFIS.
 * Retorna null se não autenticado ou se o user não foi sincronizado no banco.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const cefisId = await getCurrentCefisUserId();
  if (!cefisId) return null;
  try {
    const { supabaseAdmin } = await import("./supabase");
    const { data } = await supabaseAdmin()
      .from("users")
      .select("id")
      .eq("cefis_user_id", cefisId)
      .maybeSingle();
    return data?.id ?? null;
  } catch {
    return null;
  }
}
