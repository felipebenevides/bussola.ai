import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { readSampleCatalog } from "@/lib/sample-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface IndexedCourse {
  id: number;
  title: string;
  subtitle: string | null;
  teacher: string | null;
  lessonCount: number;
  lessonsWithTranscription: number;
  chunkCount: number;
  hasEmbeddings: boolean;
  cefisUrl: string | null;
  lastSyncedAt: string | null;
}

export interface AvailableCourse {
  id: number;
  title: string;
  subtitle: string | null;
  teacher: string | null;
  lessonCount: number;
  lessonsWithVtt: number;
}

export interface CoursesResponse {
  indexed: IndexedCourse[];
  available: AvailableCourse[];
}

/**
 * GET /api/courses
 * Lista cursos indexados (presentes no banco com aulas/embeddings) +
 * cursos disponíveis no sample local que ainda não foram ingeridos.
 */
export async function GET() {
  let indexed: IndexedCourse[] = [];
  let available: AvailableCourse[] = [];

  try {
    const supabase = supabaseAdmin();
    const { data: courses } = await supabase
      .from("cefis_courses")
      .select(
        "id, title, subtitle, teacher_name, lesson_count, cefis_url, last_synced_at"
      )
      .order("title");

    const courseIds = (courses ?? []).map((c) => c.id);

    // Conta aulas + transcrições por curso
    const lessonsByCourse = new Map<number, { total: number; withVtt: number }>();
    if (courseIds.length > 0) {
      const { data: lessons } = await supabase
        .from("cefis_lessons")
        .select("course_id, has_transcription")
        .in("course_id", courseIds);
      for (const l of lessons ?? []) {
        const acc = lessonsByCourse.get(l.course_id) ?? { total: 0, withVtt: 0 };
        acc.total++;
        if (l.has_transcription) acc.withVtt++;
        lessonsByCourse.set(l.course_id, acc);
      }
    }

    // Conta chunks por curso (via aulas)
    const chunksByCourse = new Map<number, number>();
    if (courseIds.length > 0) {
      const { data: chunkRows } = await supabase
        .from("cefis_lesson_embeddings")
        .select("lesson_id, cefis_lessons!inner(course_id)");
      // O join expõe course_id pelo alias do FK
      for (const row of (chunkRows ?? []) as Array<{
        cefis_lessons: { course_id: number } | { course_id: number }[];
      }>) {
        const rel = row.cefis_lessons;
        const courseId = Array.isArray(rel) ? rel[0]?.course_id : rel?.course_id;
        if (!courseId) continue;
        chunksByCourse.set(courseId, (chunksByCourse.get(courseId) ?? 0) + 1);
      }
    }

    indexed = (courses ?? []).map((c) => {
      const counts = lessonsByCourse.get(c.id) ?? { total: 0, withVtt: 0 };
      const chunks = chunksByCourse.get(c.id) ?? 0;
      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        teacher: c.teacher_name,
        lessonCount: counts.total || c.lesson_count || 0,
        lessonsWithTranscription: counts.withVtt,
        chunkCount: chunks,
        hasEmbeddings: chunks > 0,
        cefisUrl: c.cefis_url,
        lastSyncedAt: c.last_synced_at,
      };
    });

    // Ordena por "completude": curso com chunks indexados (RAG full) primeiro,
    // depois por aulas com transcrição, depois nº de aulas total, e por fim
    // título alfabético como desempate determinístico.
    indexed.sort((a, b) => {
      if (b.chunkCount !== a.chunkCount) return b.chunkCount - a.chunkCount;
      if (b.lessonsWithTranscription !== a.lessonsWithTranscription) {
        return b.lessonsWithTranscription - a.lessonsWithTranscription;
      }
      if (b.lessonCount !== a.lessonCount) return b.lessonCount - a.lessonCount;
      return a.title.localeCompare(b.title, "pt-BR");
    });
  } catch (err) {
    console.warn("[courses] supabase indisponível:", err);
  }

  // Cursos do sample local que ainda não foram indexados
  try {
    const indexedIds = new Set(indexed.map((c) => c.id));
    const sample = await readSampleCatalog();
    available = sample
      .filter((c) => !indexedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle ?? null,
        teacher: c.teacherName ?? null,
        lessonCount: c.lessons.length,
        lessonsWithVtt: c.lessons.filter((l) => l.vttContent).length,
      }))
      .sort((a, b) => {
        if (b.lessonsWithVtt !== a.lessonsWithVtt) return b.lessonsWithVtt - a.lessonsWithVtt;
        if (b.lessonCount !== a.lessonCount) return b.lessonCount - a.lessonCount;
        return a.title.localeCompare(b.title, "pt-BR");
      });
  } catch (err) {
    console.warn("[courses] sample indisponível:", err);
  }

  return NextResponse.json({ indexed, available } satisfies CoursesResponse);
}
