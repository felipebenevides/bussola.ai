import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSampleCatalog, composeCourseEmbeddingText } from "@/lib/sample-ingest";
import { parseAndChunk } from "@/lib/vtt";
import { embed } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  courseId: z.number().int().positive(),
});

/**
 * POST /api/courses/ingest
 * Ingere UM curso do sample local pelo ID. Sem senha (UI publica de demo).
 * O escopo é seguro porque só aceita IDs presentes em trascriptions_sample/.
 */
export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo inválido. Esperado { courseId: number }." }, { status: 400 });
  }
  const { courseId } = parsed.data;

  const sample = await readSampleCatalog();
  const course = sample.find((c) => c.id === courseId);
  if (!course) {
    return NextResponse.json(
      {
        error: `Curso ${courseId} não está no sample local. IDs disponíveis: ${sample
          .map((c) => c.id)
          .join(", ")}`,
      },
      { status: 404 }
    );
  }

  const supabase = supabaseAdmin();
  const result = {
    courseId: course.id,
    title: course.title,
    lessonsProcessed: 0,
    chunksInserted: 0,
    courseEmbedding: false,
    errors: [] as string[],
    startedAt: new Date().toISOString(),
    finishedAt: "",
    durationMs: 0,
  };
  const t0 = Date.now();

  // 1. Curso
  const { error: courseErr } = await supabase.from("cefis_courses").upsert(
    {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle ?? null,
      summary: course.summary ?? null,
      banner: course.banner ?? null,
      duration_seconds: course.durationSeconds ?? null,
      keywords: course.keywords ?? null,
      goals: course.goals ?? null,
      teacher_name: course.teacherName ?? null,
      category_ids: course.categories ?? null,
      average_rating: course.averageRating ?? null,
      rating_quantity: course.ratingQuantity ?? null,
      lesson_count: course.lessonCount ?? null,
      cefis_url: `https://cefis.com.br/portal/cursos/${course.id}`,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (courseErr) {
    return NextResponse.json(
      { error: `Falha ao gravar curso: ${courseErr.message}` },
      { status: 500 }
    );
  }

  let courseHasVtt = false;

  // 2. Aulas + embeddings
  for (const lesson of course.lessons) {
    result.lessonsProcessed++;

    const { error: lessonErr } = await supabase.from("cefis_lessons").upsert(
      {
        id: lesson.id,
        course_id: course.id,
        title: lesson.title,
        position: lesson.position,
        duration_seconds: lesson.duration,
        has_transcription: !!lesson.vttContent,
        stream_sources: lesson.stream_sources ?? null,
        preview_url: lesson.preview_url ?? null,
        cefis_url: `https://cefis.com.br/portal/cursos/${course.id}?lesson=${lesson.id}`,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (lessonErr) {
      result.errors.push(`aula ${lesson.id}: ${lessonErr.message}`);
      continue;
    }

    if (!lesson.vttContent) continue;
    courseHasVtt = true;

    const { chunks } = parseAndChunk(lesson.vttContent);
    if (chunks.length === 0) continue;

    let embeddings: number[][];
    try {
      embeddings = await embed(chunks.map((c) => c.text));
    } catch (err) {
      result.errors.push(
        `embed aula ${lesson.id}: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }

    await supabase.from("cefis_lesson_embeddings").delete().eq("lesson_id", lesson.id);

    const rows = chunks.map((c, i) => ({
      lesson_id: lesson.id,
      chunk_index: i,
      chunk_text: c.text,
      start_seconds: c.startSeconds,
      end_seconds: c.endSeconds,
      embedding: embeddings[i],
    }));

    const { error: insErr } = await supabase.from("cefis_lesson_embeddings").insert(rows);
    if (insErr) {
      result.errors.push(`insert chunks aula ${lesson.id}: ${insErr.message}`);
    } else {
      result.chunksInserted += rows.length;
    }
  }

  // 3. Embedding "metadado" do curso quando não há VTT (RAG light)
  if (!courseHasVtt) {
    const text = composeCourseEmbeddingText(course);
    try {
      const vec = await embed(text);
      const { error: cmErr } = await supabase.from("cefis_course_embeddings").upsert(
        {
          course_id: course.id,
          composed_text: text,
          embedding: vec[0],
        },
        { onConflict: "course_id" }
      );
      if (cmErr) {
        result.errors.push(`course_embedding: ${cmErr.message}`);
      } else {
        result.courseEmbedding = true;
      }
    } catch (err) {
      result.errors.push(
        `embed curso meta: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  result.finishedAt = new Date().toISOString();
  result.durationMs = Date.now() - t0;
  return NextResponse.json(result);
}
