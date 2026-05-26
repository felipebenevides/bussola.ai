/**
 * Lê os arquivos SQL pré-gerados em data/embeddings_per_row/, extrai os valores
 * (id, text, vector) com regex e insere via supabase-js (ANON key, RLS desligado
 * temporariamente). Evita chamar a API de embedding de novo.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROW_DIR = path.join(process.cwd(), "data", "embeddings_per_row");

async function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  const text = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
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

function parseVector(literal: string): number[] {
  // literal: '[0.0089,0.022,...]'::vector  → array de floats
  const m = literal.match(/'\[(.+?)\]'::vector/s);
  if (!m) throw new Error("vetor não encontrado");
  return m[1].split(",").map((s) => parseFloat(s.trim()));
}

function parseLessonSql(sql: string): LessonRow {
  // INSERT INTO bussola.cefis_lesson_embeddings (lesson_id, chunk_index, chunk_text, start_seconds, end_seconds, embedding) VALUES (LID, CIDX, 'TEXT', START, END, VEC::vector);
  const m = sql.match(
    /VALUES\s*\((\d+),\s*(\d+),\s*'((?:[^']|'')*)',\s*([\d.]+),\s*([\d.]+),\s*('\[.+?\]'::vector)\)/s
  );
  if (!m) throw new Error("lesson sql: regex falhou");
  return {
    lesson_id: parseInt(m[1], 10),
    chunk_index: parseInt(m[2], 10),
    chunk_text: m[3].replace(/''/g, "'"),
    start_seconds: parseFloat(m[4]),
    end_seconds: parseFloat(m[5]),
    embedding: parseVector(m[6]),
  };
}

function parseCourseSql(sql: string): CourseRow {
  // INSERT INTO bussola.cefis_course_embeddings (course_id, composed_text, embedding) VALUES (CID, 'TEXT', VEC) ON CONFLICT ...;
  const m = sql.match(
    /VALUES\s*\((\d+),\s*'((?:[^']|'')*)',\s*('\[.+?\]'::vector)\)/s
  );
  if (!m) throw new Error("course sql: regex falhou");
  return {
    course_id: parseInt(m[1], 10),
    composed_text: m[2].replace(/''/g, "'"),
    embedding: parseVector(m[3]),
  };
}

async function main() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("env Supabase faltando");

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "bussola" },
  });

  const files = (await fs.readdir(ROW_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const lessonRows: LessonRow[] = [];
  const courseRows: CourseRow[] = [];

  for (const f of files) {
    const sql = await fs.readFile(path.join(ROW_DIR, f), "utf-8");
    if (sql.includes("cefis_lesson_embeddings")) {
      lessonRows.push(parseLessonSql(sql));
    } else if (sql.includes("cefis_course_embeddings")) {
      courseRows.push(parseCourseSql(sql));
    }
  }
  console.log(`[insert] parseado: ${lessonRows.length} lesson chunks, ${courseRows.length} course meta`);

  // Limpa antes
  console.log("[insert] limpando tabelas...");
  const del1 = await supabase.from("cefis_lesson_embeddings").delete().neq("lesson_id", -1);
  if (del1.error) throw new Error(`del lesson: ${del1.error.message}`);
  const del2 = await supabase.from("cefis_course_embeddings").delete().neq("course_id", -1);
  if (del2.error) throw new Error(`del course: ${del2.error.message}`);

  const BATCH = 20;
  for (let i = 0; i < lessonRows.length; i += BATCH) {
    const slice = lessonRows.slice(i, i + BATCH);
    console.log(`[insert] lesson ${i}-${i + slice.length - 1}/${lessonRows.length}`);
    const { error } = await supabase.from("cefis_lesson_embeddings").insert(slice);
    if (error) throw new Error(`lesson insert: ${error.message}`);
  }
  for (let i = 0; i < courseRows.length; i += BATCH) {
    const slice = courseRows.slice(i, i + BATCH);
    console.log(`[insert] course ${i}-${i + slice.length - 1}/${courseRows.length}`);
    const { error } = await supabase.from("cefis_course_embeddings").insert(slice);
    if (error) throw new Error(`course insert: ${error.message}`);
  }

  console.log("[insert] OK — terminado");
}

main().catch((err) => {
  console.error("[insert] ERRO:", err);
  process.exit(1);
});
