import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildLessonDeepLink } from "@/lib/tutor-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StreamSource {
  quality?: string;
  type?: string;
  height?: number;
  link_secure?: string;
}

/**
 * GET /api/lessons/{lessonId}/stream?t={seconds}
 *
 * Devolve as fontes de vídeo (HLS/MP4) cacheadas em `cefis_lessons.stream_sources`,
 * mais o deep-link real do portal CEFIS construído pelo helper canônico — garante
 * que mesmo se a row tiver `cefis_url` antiga gravada antes do fix, o caller use
 * a URL nova.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId: rawId } = await params;
  const lessonId = Number(rawId);
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return NextResponse.json({ error: "lessonId inválido" }, { status: 400 });
  }

  const tParam = req.nextUrl.searchParams.get("t");
  const startSeconds = tParam ? Math.max(0, Math.floor(Number(tParam))) : 0;

  let row: {
    id: number;
    course_id: number;
    title: string | null;
    stream_sources: StreamSource[] | null;
    preview_url: string | null;
    duration_seconds: number | null;
  } | null = null;
  try {
    const supabase = supabaseAdmin();
    const { data } = await supabase
      .from("cefis_lessons")
      .select("id, course_id, title, stream_sources, preview_url, duration_seconds")
      .eq("id", lessonId)
      .maybeSingle();
    row = data;
  } catch {
    return NextResponse.json({ error: "Falha ao consultar aula" }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Aula não indexada" }, { status: 404 });
  }

  const streams = Array.isArray(row.stream_sources) ? row.stream_sources : [];
  // Ordena: HD primeiro, depois SD. Filtra apenas as que têm link_secure.
  const ranked = streams
    .filter((s) => typeof s.link_secure === "string" && s.link_secure.length > 0)
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  return NextResponse.json({
    lessonId: row.id,
    courseId: row.course_id,
    title: row.title,
    durationSeconds: row.duration_seconds,
    previewUrl: row.preview_url,
    deepLink: buildLessonDeepLink(row.course_id, row.id, Number.isFinite(startSeconds) ? startSeconds : 0),
    startSeconds,
    streams: ranked.map((s) => ({
      quality: s.quality ?? null,
      type: s.type ?? null,
      height: s.height ?? null,
      url: s.link_secure!,
    })),
  });
}
