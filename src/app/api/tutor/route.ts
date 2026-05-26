import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askTutor } from "@/lib/tutor-agent";
import { getCurrentUserId } from "@/lib/cefis-server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  courseId: z.number().int().positive().nullable().optional(),
  courseTitle: z.string().max(200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }
  const { message, sessionId, courseId, courseTitle } = parsed.data;

  const userId = await getCurrentUserId();

  let answer;
  try {
    answer = await askTutor({
      query: message,
      userId,
      channel: "web",
      courseId: courseId ?? null,
      courseTitle: courseTitle ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (userId) {
    try {
      const supabase = supabaseAdmin();
      await supabase.from("tutor_messages").insert([
        {
          user_id: userId,
          session_id: sessionId ?? null,
          role: "user",
          content: message,
        },
        {
          user_id: userId,
          session_id: sessionId ?? null,
          role: "assistant",
          content: answer.text,
          citations: answer.citations,
        },
      ]);
    } catch {
      // persistência best-effort
    }
  }

  return NextResponse.json({
    text: answer.text,
    citations: answer.citations,
    suggestedCourses: answer.suggestedCourses,
    groundedInCefis: answer.groundedInCefis,
  });
}
