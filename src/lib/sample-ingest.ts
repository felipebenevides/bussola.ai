import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { parseAndChunk } from "./vtt";

const SAMPLE_DIR = path.join(process.cwd(), "trascriptions_sample", "output");

/**
 * Estrutura crua de um curso lida do sample (details.json).
 */
export interface SampleCourseDetails {
  data: {
    id: number;
    title: string;
    subtitle?: string;
    summary?: string;
    banner?: string;
    goals?: string[];
    keywords?: string;
    duration?: number;
    lessonCount?: number;
    categories?: number[];
    averageRating?: number;
    ratingQuantity?: number;
    teacher?: { id: number; name: string; avatar?: string };
  };
}

export interface SampleLessonDetails {
  id: number;
  title: string;
  position: number;
  duration: number;
  preview_url?: string | null;
  stream_sources: Array<{ quality: string; type: string; link_secure: string; height: number }>;
}

export interface SampleLesson extends SampleLessonDetails {
  courseId: number;
  vttPath: string | null;
  vttContent: string | null;
}

export interface SampleCourse {
  id: number;
  title: string;
  subtitle?: string;
  summary?: string;
  banner?: string;
  goals?: string[];
  keywords?: string;
  durationSeconds?: number;
  lessonCount?: number;
  categories?: number[];
  averageRating?: number;
  ratingQuantity?: number;
  teacherName?: string;
  lessons: SampleLesson[];
}

export async function readSampleCatalog(): Promise<SampleCourse[]> {
  const courseDirs = await fs.readdir(SAMPLE_DIR, { withFileTypes: true });
  const result: SampleCourse[] = [];

  for (const entry of courseDirs) {
    if (!entry.isDirectory()) continue;
    const courseId = parseInt(entry.name, 10);
    if (Number.isNaN(courseId)) continue;

    const courseDir = path.join(SAMPLE_DIR, entry.name);
    const detailsPath = path.join(courseDir, "details.json");

    let detailsJson: SampleCourseDetails;
    try {
      detailsJson = JSON.parse(await fs.readFile(detailsPath, "utf-8"));
    } catch {
      continue;
    }
    const d = detailsJson.data;
    if (!d) continue;

    const lessonsDir = path.join(courseDir, "lessons");
    const lessons: SampleLesson[] = [];

    let lessonDirs: string[] = [];
    try {
      lessonDirs = await fs.readdir(lessonsDir);
    } catch {
      // sem subpasta de lessons
    }

    for (const lessonName of lessonDirs) {
      const lessonDir = path.join(lessonsDir, lessonName);
      const lessonDetailsPath = path.join(lessonDir, "details.json");
      const lessonVttPath = path.join(lessonDir, "subtitle_pt.vtt");

      let lessonDetails: SampleLessonDetails;
      try {
        lessonDetails = JSON.parse(await fs.readFile(lessonDetailsPath, "utf-8"));
      } catch {
        continue;
      }

      let vttContent: string | null = null;
      try {
        vttContent = await fs.readFile(lessonVttPath, "utf-8");
      } catch {
        // sem VTT — apenas metadados
      }

      lessons.push({
        ...lessonDetails,
        courseId,
        vttPath: vttContent ? lessonVttPath : null,
        vttContent,
      });
    }

    lessons.sort((a, b) => a.position - b.position);

    result.push({
      id: d.id,
      title: d.title,
      subtitle: d.subtitle,
      summary: d.summary,
      banner: d.banner,
      goals: d.goals,
      keywords: d.keywords,
      durationSeconds: d.duration,
      lessonCount: d.lessonCount ?? lessons.length,
      categories: d.categories,
      averageRating: d.averageRating,
      ratingQuantity: d.ratingQuantity,
      teacherName: d.teacher?.name,
      lessons,
    });
  }

  result.sort((a, b) => a.id - b.id);
  return result;
}

/**
 * Texto composto para o embedding de "metadados de curso" (RAG light).
 * Usado nos cursos sem VTT.
 */
export function composeCourseEmbeddingText(c: SampleCourse): string {
  const parts: string[] = [c.title];
  if (c.subtitle) parts.push(c.subtitle);
  if (c.summary) parts.push(c.summary);
  if (c.goals?.length) parts.push("Objetivos: " + c.goals.join("; "));
  if (c.keywords) parts.push("Palavras-chave: " + c.keywords);
  if (c.teacherName) parts.push("Professor: " + c.teacherName);
  return parts.join(" — ");
}

// ─── Estatísticas (dry-run) ─────────────────────────────────────

export interface IngestStats {
  totalCourses: number;
  coursesWithVtt: number;
  coursesWithoutVtt: number;
  totalLessons: number;
  lessonsWithVtt: number;
  totalChunks: number;
  totalCues: number;
  totalCharsInChunks: number;
  averageChunkChars: number;
  sample: {
    course: { id: number; title: string };
    lesson: { id: number; title: string; durationSeconds: number };
    firstChunk: { text: string; startSeconds: number; endSeconds: number; cueCount: number };
  } | null;
  courseSummaries: Array<{
    id: number;
    title: string;
    lessons: number;
    vtts: number;
    chunks: number;
  }>;
}

export async function dryRunIngest(): Promise<IngestStats> {
  const courses = await readSampleCatalog();

  let totalLessons = 0;
  let lessonsWithVtt = 0;
  let coursesWithVtt = 0;
  let totalChunks = 0;
  let totalCues = 0;
  let totalCharsInChunks = 0;
  let sample: IngestStats["sample"] = null;
  const courseSummaries: IngestStats["courseSummaries"] = [];

  for (const course of courses) {
    let courseChunks = 0;
    let courseVttCount = 0;

    for (const lesson of course.lessons) {
      totalLessons++;
      if (lesson.vttContent) {
        lessonsWithVtt++;
        courseVttCount++;
        const { cues, chunks } = parseAndChunk(lesson.vttContent);
        totalCues += cues.length;
        totalChunks += chunks.length;
        courseChunks += chunks.length;
        for (const ch of chunks) totalCharsInChunks += ch.text.length;

        if (!sample && chunks.length > 0) {
          sample = {
            course: { id: course.id, title: course.title },
            lesson: { id: lesson.id, title: lesson.title, durationSeconds: lesson.duration },
            firstChunk: {
              text: chunks[0].text.slice(0, 300),
              startSeconds: chunks[0].startSeconds,
              endSeconds: chunks[0].endSeconds,
              cueCount: chunks[0].cueCount,
            },
          };
        }
      }
    }

    if (courseVttCount > 0) coursesWithVtt++;
    courseSummaries.push({
      id: course.id,
      title: course.title,
      lessons: course.lessons.length,
      vtts: courseVttCount,
      chunks: courseChunks,
    });
  }

  return {
    totalCourses: courses.length,
    coursesWithVtt,
    coursesWithoutVtt: courses.length - coursesWithVtt,
    totalLessons,
    lessonsWithVtt,
    totalChunks,
    totalCues,
    totalCharsInChunks,
    averageChunkChars: totalChunks > 0 ? Math.round(totalCharsInChunks / totalChunks) : 0,
    sample,
    courseSummaries,
  };
}
