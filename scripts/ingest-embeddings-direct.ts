/**
 * Ingestão direta via supabase-js + ANON key (RLS temporariamente desligado
 * pelo Claude via MCP — não esquecer de reativar com:
 *   ALTER TABLE bussola.cefis_lesson_embeddings ENABLE ROW LEVEL SECURITY;
 *   ALTER TABLE bussola.cefis_course_embeddings ENABLE ROW LEVEL SECURITY;
 *
 * Roda end-to-end: lê VTTs, chunka, embedda via Google, e faz upsert no Supabase
 * em batches. Não precisa de SUPABASE_SERVICE_KEY.
 *
 * Rodar:
 *   node --experimental-strip-types scripts/ingest-embeddings-direct.ts
 *
 * Env:
 *   GOOGLE_API_KEY (obrigatório)
 *   NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (lidos de .env.local
 *   se setados como env vars; caso contrário, lê e parseia o arquivo)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseAndChunk } from "../src/lib/vtt.ts";

const ROOT = path.join(process.cwd(), "trascriptions_sample", "output");

async function loadEnv() {
  // Já em process.env?
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.GOOGLE_API_KEY
  ) {
    return;
  }
  const envText = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf-8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const MODEL = "gemini-embedding-001";
const DIM = 1536;
const BATCH = 100;

async function googleBatchEmbed(apiKey: string, texts: string[]): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`;
  const body = {
    requests: texts.map((text) => ({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: DIM,
    })),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { embeddings?: Array<{ values?: number[] }> };
  if (!json.embeddings || json.embeddings.length !== texts.length) {
    throw new Error(`Esperado ${texts.length}, veio ${json.embeddings?.length}`);
  }
  return json.embeddings.map((e, i) => {
    if (!e.values) throw new Error(`sem values idx ${i}`);
    return e.values;
  });
}

interface LessonRow {
  lesson_id: number;
  chunk_index: number;
  chunk_text: string;
  start_seconds: number;
  end_seconds: number;
  embedding: number[];
}

interface CourseRow {
  course_id: number;
  composed_text: string;
  embedding: number[];
}

async function main() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const googleKey = process.env.GOOGLE_API_KEY!;
  if (!url || !anon || !googleKey) {
    throw new Error("env vars faltando: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GOOGLE_API_KEY");
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bussola" },
  });

  const lessonRowsPending: Array<Omit<LessonRow, "embedding"> & { __text: string }> = [];
  const courseRowsPending: Array<Omit<CourseRow, "embedding">> = [];

  const courseDirs = await fs.readdir(ROOT, { withFileTypes: true });
  for (const entry of courseDirs) {
    if (!entry.isDirectory()) continue;
    const courseId = parseInt(entry.name, 10);
    if (Number.isNaN(courseId)) continue;

    const courseDir = path.join(ROOT, entry.name);
    let courseDetails: any;
    try {
      courseDetails = JSON.parse(await fs.readFile(path.join(courseDir, "details.json"), "utf-8"));
    } catch {
      continue;
    }
    const c = courseDetails.data;
    if (!c) continue;

    const lessonsDir = path.join(courseDir, "lessons");
    let lessonNames: string[] = [];
    try {
      lessonNames = await fs.readdir(lessonsDir);
    } catch {
      // sem aulas
    }

    let courseHasVtt = false;

    for (const lessonName of lessonNames) {
      const lessonDir = path.join(lessonsDir, lessonName);
      let lesson: any;
      try {
        lesson = JSON.parse(await fs.readFile(path.join(lessonDir, "details.json"), "utf-8"));
      } catch {
        continue;
      }
      let vtt: string | null = null;
      try {
        vtt = await fs.readFile(path.join(lessonDir, "subtitle_pt.vtt"), "utf-8");
      } catch {
        // sem VTT
      }
      if (!vtt) continue;
      courseHasVtt = true;

      const { chunks } = parseAndChunk(vtt);
      chunks.forEach((ch, idx) => {
        lessonRowsPending.push({
          lesson_id: lesson.id,
          chunk_index: idx,
          chunk_text: ch.text,
          start_seconds: ch.startSeconds,
          end_seconds: ch.endSeconds,
          __text: ch.text,
        });
      });
    }

    if (!courseHasVtt) {
      const parts: string[] = [c.title];
      if (c.subtitle) parts.push(c.subtitle);
      if (c.summary) parts.push(c.summary);
      if (c.goals?.length) parts.push("Objetivos: " + c.goals.join("; "));
      if (c.keywords) parts.push("Palavras-chave: " + c.keywords);
      if (c.teacher?.name) parts.push("Professor: " + c.teacher.name);
      const composed = parts.join(" — ");
      courseRowsPending.push({ course_id: courseId, composed_text: composed });
    }
  }

  console.log(`[ingest] lesson chunks=${lessonRowsPending.length}, course meta=${courseRowsPending.length}`);

  // Limpa antes de inserir (idempotência)
  console.log("[ingest] limpando tabelas...");
  await supabase.from("cefis_lesson_embeddings").delete().neq("lesson_id", -1);
  await supabase.from("cefis_course_embeddings").delete().neq("course_id", -1);

  // Embed em batches
  const allTexts = [
    ...lessonRowsPending.map((r) => r.__text),
    ...courseRowsPending.map((r) => r.composed_text),
  ];
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < allTexts.length; i += BATCH) {
    const slice = allTexts.slice(i, i + BATCH);
    console.log(`[ingest] embedding ${i}-${i + slice.length - 1}/${allTexts.length}`);
    allEmbeddings.push(...(await googleBatchEmbed(googleKey, slice)));
  }

  // Monta payloads finais
  const lessonRows: LessonRow[] = lessonRowsPending.map((r, i) => ({
    lesson_id: r.lesson_id,
    chunk_index: r.chunk_index,
    chunk_text: r.chunk_text,
    start_seconds: r.start_seconds,
    end_seconds: r.end_seconds,
    embedding: allEmbeddings[i],
  }));

  const courseRows: CourseRow[] = courseRowsPending.map((r, i) => ({
    course_id: r.course_id,
    composed_text: r.composed_text,
    embedding: allEmbeddings[lessonRowsPending.length + i],
  }));

  // Insere em batches
  const INSERT_BATCH = 20;
  for (let i = 0; i < lessonRows.length; i += INSERT_BATCH) {
    const slice = lessonRows.slice(i, i + INSERT_BATCH);
    console.log(`[ingest] insert lesson ${i}-${i + slice.length - 1}/${lessonRows.length}`);
    const { error } = await supabase.from("cefis_lesson_embeddings").insert(slice);
    if (error) throw new Error(`lesson insert: ${error.message}`);
  }

  for (let i = 0; i < courseRows.length; i += INSERT_BATCH) {
    const slice = courseRows.slice(i, i + INSERT_BATCH);
    console.log(`[ingest] insert course ${i}-${i + slice.length - 1}/${courseRows.length}`);
    const { error } = await supabase.from("cefis_course_embeddings").insert(slice);
    if (error) throw new Error(`course insert: ${error.message}`);
  }

  console.log("[ingest] OK — todos os embeddings inseridos");
}

main().catch((err) => {
  console.error("[ingest] ERRO:", err);
  process.exit(1);
});
