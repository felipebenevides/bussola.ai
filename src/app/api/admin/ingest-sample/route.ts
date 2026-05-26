import { NextRequest, NextResponse } from "next/server";
import { dryRunIngest, readSampleCatalog, composeCourseEmbeddingText } from "@/lib/sample-ingest";
import { parseAndChunk } from "@/lib/vtt";
import { embed } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min

function checkPassword(req: NextRequest): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurado" }, { status: 500 });
  }
  if (req.headers.get("x-admin-password") !== expected) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = checkPassword(req);
  if (denied) return denied;
  // GET = dry-run, sem chamar OpenAI nem Supabase
  const stats = await dryRunIngest();
  return NextResponse.json(stats);
}

export async function POST(req: NextRequest) {
  const denied = checkPassword(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const doEmbed = body.embed !== false;
  const doInsert = body.insert !== false;
  const onlyCourse: number | null = body.onlyCourse ?? null;

  const courses = await readSampleCatalog();
  const supabase = doInsert ? supabaseAdmin() : null;

  const result = {
    coursesProcessed: 0,
    lessonsProcessed: 0,
    chunksInserted: 0,
    courseMetadataEmbeddings: 0,
    errors: [] as string[],
    startedAt: new Date().toISOString(),
    finishedAt: "",
    durationMs: 0,
  };
  const t0 = Date.now();

  for (const course of courses) {
    if (onlyCourse && course.id !== onlyCourse) continue;
    result.coursesProcessed++;

    // 1. Upsert do curso
    if (supabase) {
      const { error } = await supabase.from("cefis_courses").upsert(
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
          cefis_url: `https://cefis.com.br/curso/${course.id}`,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      if (error) {
        result.errors.push(`curso ${course.id}: ${error.message}`);
        continue;
      }
    }

    let courseHasVtt = false;

    // 2. Aulas
    for (const lesson of course.lessons) {
      result.lessonsProcessed++;

      if (supabase) {
        const { error } = await supabase.from("cefis_lessons").upsert(
          {
            id: lesson.id,
            course_id: course.id,
            title: lesson.title,
            position: lesson.position,
            duration_seconds: lesson.duration,
            has_transcription: !!lesson.vttContent,
            stream_sources: lesson.stream_sources ?? null,
            preview_url: lesson.preview_url ?? null,
            cefis_url: `https://cefis.com.br/curso/${course.id}/aula/${lesson.id}`,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
        if (error) {
          result.errors.push(`aula ${lesson.id}: ${error.message}`);
          continue;
        }
      }

      if (!lesson.vttContent) continue;
      courseHasVtt = true;

      const { chunks } = parseAndChunk(lesson.vttContent);
      if (chunks.length === 0) continue;

      if (!doEmbed) {
        result.chunksInserted += chunks.length; // contagem teórica
        continue;
      }

      // Embedding batch (todos os chunks da aula)
      let embeddings: number[][];
      try {
        embeddings = await embed(chunks.map((c) => c.text));
      } catch (err) {
        result.errors.push(
          `embed aula ${lesson.id}: ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }

      if (!doInsert || !supabase) {
        result.chunksInserted += chunks.length;
        continue;
      }

      // Limpa embeddings antigos da aula (idempotência)
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

    // 3. Embedding "metadado" do curso (sempre que NÃO tem VTT — RAG light)
    if (!courseHasVtt) {
      const text = composeCourseEmbeddingText(course);

      if (!doEmbed) {
        result.courseMetadataEmbeddings++;
        continue;
      }

      let vec: number[][];
      try {
        vec = await embed(text);
      } catch (err) {
        result.errors.push(
          `embed curso meta ${course.id}: ${err instanceof Error ? err.message : String(err)}`
        );
        continue;
      }

      if (!doInsert || !supabase) {
        result.courseMetadataEmbeddings++;
        continue;
      }

      const { error: cmErr } = await supabase.from("cefis_course_embeddings").upsert(
        {
          course_id: course.id,
          composed_text: text,
          embedding: vec[0],
        },
        { onConflict: "course_id" }
      );
      if (cmErr) {
        result.errors.push(`insert course_emb ${course.id}: ${cmErr.message}`);
      } else {
        result.courseMetadataEmbeddings++;
      }
    }
  }

  result.finishedAt = new Date().toISOString();
  result.durationMs = Date.now() - t0;
  return NextResponse.json(result);
}
