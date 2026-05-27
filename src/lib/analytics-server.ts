import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabase";

export const ANALYTICS_COOKIE = "bussola_session";
const COOKIE_TTL_DAYS = 90;

/**
 * Lê o cookie de sessão anônima — não cria se não existir, deixa o callsite
 * decidir (o tracker precisa criar; queries de leitura não criam).
 */
export async function readSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ANALYTICS_COOKIE)?.value ?? null;
}

/**
 * Garante um session_id no cookie e o retorna. Cria UUID novo se faltar.
 */
export async function ensureSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(ANALYTICS_COOKIE)?.value;
  if (existing) return existing;
  const fresh = randomUUID();
  jar.set(ANALYTICS_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return fresh;
}

export interface AnalyticsEvent {
  sessionId: string;
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  eventType: "page_view" | "identify" | "action";
  path?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await supabaseAdmin().from("analytics_events").insert({
      session_id: event.sessionId,
      user_id: event.userId ?? null,
      email: event.email ?? null,
      phone: event.phone ?? null,
      event_type: event.eventType,
      path: event.path ?? null,
      referrer: event.referrer ?? null,
      user_agent: event.userAgent ?? null,
      metadata: event.metadata ?? null,
    });
  } catch (err) {
    // Best-effort: nunca derruba a request por causa de analytics
    console.warn("[analytics] event insert failed:", err);
  }
}
