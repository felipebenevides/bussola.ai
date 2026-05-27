import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/stats
 * Backoffice-only — exige header `x-admin-password` (mesmo do /admin).
 * Retorna métricas agregadas: sessões totais, anônimas, identificadas,
 * páginas mais visitadas, últimos identificados.
 */
function checkPassword(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "admin password not set" }, { status: 500 });
  }
  if (req.headers.get("x-admin-password") !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = checkPassword(req);
  if (denied) return denied;

  const supabase = supabaseAdmin();

  // Total de eventos e sessões — pega ids únicos
  const { data: rows } = await supabase
    .from("analytics_events")
    .select("session_id, user_id, email, phone, path, event_type, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const all = rows ?? [];

  const sessions = new Map<
    string,
    {
      session_id: string;
      user_id: string | null;
      email: string | null;
      phone: string | null;
      pageViews: number;
      paths: Set<string>;
      firstSeen: string;
      lastSeen: string;
      identified: boolean;
    }
  >();

  const pathCounts = new Map<string, number>();

  for (const r of all) {
    if (!r.session_id) continue;
    let s = sessions.get(r.session_id);
    if (!s) {
      s = {
        session_id: r.session_id,
        user_id: r.user_id ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        pageViews: 0,
        paths: new Set<string>(),
        firstSeen: r.created_at ?? "",
        lastSeen: r.created_at ?? "",
        identified: false,
      };
      sessions.set(r.session_id, s);
    }
    // user_id/email/phone "vencem" o que já estiver
    if (r.user_id && !s.user_id) s.user_id = r.user_id;
    if (r.email && !s.email) s.email = r.email;
    if (r.phone && !s.phone) s.phone = r.phone;
    if (s.user_id || s.email || s.phone) s.identified = true;

    if (r.event_type === "page_view" && r.path) {
      s.pageViews++;
      s.paths.add(r.path);
      pathCounts.set(r.path, (pathCounts.get(r.path) ?? 0) + 1);
    }
    if (r.created_at) {
      if (!s.firstSeen || r.created_at < s.firstSeen) s.firstSeen = r.created_at;
      if (!s.lastSeen || r.created_at > s.lastSeen) s.lastSeen = r.created_at;
    }
  }

  const sessionList = Array.from(sessions.values());
  const totalSessions = sessionList.length;
  const anonymousSessions = sessionList.filter((s) => !s.identified).length;
  const identifiedSessions = sessionList.filter((s) => s.identified).length;
  const distinctEmails = new Set(sessionList.map((s) => s.email).filter(Boolean)).size;
  const distinctPhones = new Set(sessionList.map((s) => s.phone).filter(Boolean)).size;

  const topPaths = Array.from(pathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const recentIdentified = sessionList
    .filter((s) => s.identified)
    .sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""))
    .slice(0, 25)
    .map((s) => ({
      session_id: s.session_id,
      user_id: s.user_id,
      email: s.email,
      phone: s.phone,
      pageViews: s.pageViews,
      paths: Array.from(s.paths),
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
    }));

  return NextResponse.json({
    totals: {
      sessions: totalSessions,
      anonymous: anonymousSessions,
      identified: identifiedSessions,
      distinctEmails,
      distinctPhones,
      events: all.length,
    },
    topPaths,
    recentIdentified,
  });
}
