import "server-only";
import { supabaseAdmin } from "./supabase";
import { buildLessonDeepLink } from "./tutor-agent";

export interface PlanItemView {
  id: string;
  week: number;
  day_of_week: number;
  position: number;
  title: string;
  duration_minutes: number;
  source: string;
  source_ref: string | null;
  cefis_course_id: number | null;
  cefis_lesson_id: number | null;
  cefis_track_id: number | null;
  skill_slug: string | null;
  status: string;
  deep_link: string | null;
  course_title: string | null;
  lesson_title: string | null;
}

export interface PlanView {
  id: string;
  user_id: string;
  title: string;
  total_weeks: number;
  rationale: string | null;
  created_at: string;
  active: boolean;
  items: PlanItemView[];
}

/**
 * Carrega um plano + items, enriquecendo com título do curso/aula e deep-link.
 * Se userId for passado, valida ownership.
 */
export async function loadPlan(planId: string, userId?: string | null): Promise<PlanView | null> {
  const supabase = supabaseAdmin();
  const { data: plan, error } = await supabase
    .from("study_plan")
    .select("id, user_id, title, total_weeks, rationale, active, created_at")
    .eq("id", planId)
    .maybeSingle();
  if (error || !plan) return null;
  if (userId && plan.user_id !== userId) return null;

  const { data: items } = await supabase
    .from("plan_items")
    .select(
      "id, week, day_of_week, position, title, duration_minutes, source, source_ref, cefis_course_id, cefis_lesson_id, cefis_track_id, skill_slug, status"
    )
    .eq("plan_id", planId)
    .order("week", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("position", { ascending: true });

  const lessonIds = (items ?? [])
    .map((i) => i.cefis_lesson_id)
    .filter((v): v is number => typeof v === "number");
  const courseIds = (items ?? [])
    .map((i) => i.cefis_course_id)
    .filter((v): v is number => typeof v === "number");

  const lessonMap = new Map<number, { title: string; course_id: number }>();
  if (lessonIds.length > 0) {
    const { data } = await supabase
      .from("cefis_lessons")
      .select("id, title, course_id")
      .in("id", lessonIds);
    for (const l of data ?? []) lessonMap.set(l.id, { title: l.title, course_id: l.course_id });
  }

  const courseMap = new Map<number, string>();
  if (courseIds.length > 0) {
    const { data } = await supabase
      .from("cefis_courses")
      .select("id, title")
      .in("id", courseIds);
    for (const c of data ?? []) courseMap.set(c.id, c.title);
  }

  const itemsView: PlanItemView[] = (items ?? []).map((i) => {
    const lessonInfo = i.cefis_lesson_id ? lessonMap.get(i.cefis_lesson_id) ?? null : null;
    let courseTitle: string | null = null;
    if (i.cefis_course_id) {
      courseTitle = courseMap.get(i.cefis_course_id) ?? null;
    } else if (lessonInfo) {
      courseTitle = courseMap.get(lessonInfo.course_id) ?? null;
    }
    let deepLink: string | null = null;
    if (i.cefis_course_id && i.cefis_lesson_id) {
      const startSecs = Number(i.source_ref ?? 0);
      deepLink = buildLessonDeepLink(
        i.cefis_course_id,
        i.cefis_lesson_id,
        Number.isFinite(startSecs) ? startSecs : 0
      );
    } else if (i.cefis_course_id) {
      deepLink = `https://cefis.com.br/curso/${i.cefis_course_id}`;
    } else if (i.cefis_track_id) {
      deepLink = `https://cefis.com.br/trilha/${i.cefis_track_id}`;
    }
    return {
      id: i.id,
      week: i.week,
      day_of_week: i.day_of_week,
      position: i.position,
      title: i.title,
      duration_minutes: i.duration_minutes,
      source: i.source,
      source_ref: i.source_ref ?? null,
      cefis_course_id: i.cefis_course_id ?? null,
      cefis_lesson_id: i.cefis_lesson_id ?? null,
      cefis_track_id: i.cefis_track_id ?? null,
      skill_slug: i.skill_slug ?? null,
      status: i.status ?? "pending",
      deep_link: deepLink,
      course_title: courseTitle ?? null,
      lesson_title: lessonInfo?.title ?? null,
    };
  });

  return {
    id: plan.id,
    user_id: plan.user_id,
    title: plan.title,
    total_weeks: plan.total_weeks,
    rationale: plan.rationale ?? null,
    active: plan.active ?? true,
    created_at: plan.created_at,
    items: itemsView,
  };
}

/**
 * Retorna o plano ativo mais recente do usuário (ou null).
 */
export async function getActivePlanForUser(userId: string): Promise<PlanView | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("study_plan")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.id) return null;
  return loadPlan(data.id, userId);
}
