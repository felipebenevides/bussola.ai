/**
 * Gera SQL com embeddings (Google gemini-embedding-001, 1536 dims)
 * pra carregar via supabase MCP sem precisar de SUPABASE_SERVICE_KEY local.
 *
 * Lê: trascriptions_sample/output/{courseId}/{details.json, lessons/{lessonId}/...}
 * Escreve: data/embeddings.sql (uma INSERT por linha pra ser fatiado em batches)
 *
 * Rodar:
 *   node --experimental-strip-types scripts/build-embeddings-sql.ts
 *
 * Env:
 *   GOOGLE_API_KEY (obrigatório)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { parseAndChunk } from "../src/lib/vtt.ts";

const ROOT = path.join(process.cwd(), "trascriptions_sample", "output");
const OUT_PATH = path.join(process.cwd(), "data", "embeddings.sql");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY ausente");
  process.exit(1);
}

const MODEL = "gemini-embedding-001";
const DIM = 1536;
const BATCH = 100;

interface CourseMeta {
  id: number;
  title: string;
  subtitle?: string;
  summary?: string;
  goals?: string[];
  keywords?: string;
  teacher?: { name?: string };
}

interface LessonMeta {
  id: number;
  title: string;
}

async function googleBatchEmbed(texts: string[]): Promise<number[][]> {
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
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GOOGLE_API_KEY!,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Google ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as { embeddings?: Array<{ values?: number[] }> };
  if (!json.embeddings || json.embeddings.length !== texts.length) {
    throw new Error(`embeddings: esperado ${texts.length}, veio ${json.embeddings?.length}`);
  }
  return json.embeddings.map((e, i) => {
    if (!e.values) throw new Error(`sem values no índice ${i}`);
    return e.values;
  });
}

function vecToLiteral(v: number[]): string {
  // pgvector aceita literal string '[v1,v2,...]' — 4 casas é suficiente p/ similaridade
  // de cosseno; corta tamanho do SQL pela metade vs 6 casas.
  return "'[" + v.map((x) => x.toFixed(4)).join(",") + "]'::vector";
}

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

interface Row {
  kind: "lesson" | "course";
  text: string;
  lessonId?: number;
  chunkIndex?: number;
  startSeconds?: number;
  endSeconds?: number;
  courseId?: number;
  composedText?: string;
}

async function main() {
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });

  const rows: Row[] = [];
  const courseDirs = await fs.readdir(ROOT, { withFileTypes: true });

  for (const entry of courseDirs) {
    if (!entry.isDirectory()) continue;
    const courseId = parseInt(entry.name, 10);
    if (Number.isNaN(courseId)) continue;

    const courseDir = path.join(ROOT, entry.name);
    const detailsPath = path.join(courseDir, "details.json");
    let courseDetails: { data: CourseMeta };
    try {
      courseDetails = JSON.parse(await fs.readFile(detailsPath, "utf-8"));
    } catch {
      continue;
    }
    const c = courseDetails.data;

    const lessonsDir = path.join(courseDir, "lessons");
    let lessonDirs: string[] = [];
    try {
      lessonDirs = await fs.readdir(lessonsDir);
    } catch {
      // sem aulas
    }

    let courseHasVtt = false;

    for (const lessonName of lessonDirs) {
      const lessonDir = path.join(lessonsDir, lessonName);
      const lessonDetailsPath = path.join(lessonDir, "details.json");
      const vttPath = path.join(lessonDir, "subtitle_pt.vtt");

      let lesson: LessonMeta;
      try {
        lesson = JSON.parse(await fs.readFile(lessonDetailsPath, "utf-8"));
      } catch {
        continue;
      }

      let vtt: string | null = null;
      try {
        vtt = await fs.readFile(vttPath, "utf-8");
      } catch {
        // sem VTT
      }
      if (!vtt) continue;

      courseHasVtt = true;
      const { chunks } = parseAndChunk(vtt);
      chunks.forEach((ch, idx) => {
        rows.push({
          kind: "lesson",
          text: ch.text,
          lessonId: lesson.id,
          chunkIndex: idx,
          startSeconds: ch.startSeconds,
          endSeconds: ch.endSeconds,
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
      rows.push({
        kind: "course",
        text: composed,
        courseId,
        composedText: composed,
      });
    }
  }

  console.error(`[build] ${rows.length} embeddings a gerar (lesson chunks + course meta)`);
  const lessonRows = rows.filter((r) => r.kind === "lesson").length;
  const courseRows = rows.filter((r) => r.kind === "course").length;
  console.error(`[build] lesson chunks=${lessonRows}, course meta=${courseRows}`);

  // Embed em batches
  const embeddings: number[][] = [];
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    console.error(`[build] embedding batch ${i}-${i + slice.length - 1}`);
    const vecs = await googleBatchEmbed(slice.map((r) => r.text));
    embeddings.push(...vecs);
  }

  // Monta SQL — um arquivo por INSERT pra facilitar carregamento via MCP
  const outDir = path.join(process.cwd(), "data", "embeddings_per_row");
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const vec = vecToLiteral(embeddings[idx]);
    let stmt: string;
    if (r.kind === "lesson") {
      stmt = `INSERT INTO bussola.cefis_lesson_embeddings (lesson_id, chunk_index, chunk_text, start_seconds, end_seconds, embedding) VALUES (${r.lessonId}, ${r.chunkIndex}, '${sqlEscape(r.text)}', ${r.startSeconds}, ${r.endSeconds}, ${vec});`;
    } else {
      stmt = `INSERT INTO bussola.cefis_course_embeddings (course_id, composed_text, embedding) VALUES (${r.courseId}, '${sqlEscape(r.composedText!)}', ${vec}) ON CONFLICT (course_id) DO UPDATE SET composed_text = EXCLUDED.composed_text, embedding = EXCLUDED.embedding;`;
    }
    const fname = path.join(outDir, `row_${String(idx).padStart(3, "0")}.sql`);
    await fs.writeFile(fname, stmt, "utf-8");
  }

  console.error(`[build] ${rows.length} arquivos SQL escritos em ${outDir}`);
}

main().catch((err) => {
  console.error("[build] erro:", err);
  process.exit(2);
});
