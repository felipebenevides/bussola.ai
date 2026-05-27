import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/cefis-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEARNING_STYLES = ["visual", "auditory", "kinesthetic", "mixed"] as const;

const PatchSchema = z.object({
  available_minutes_per_day: z.number().int().min(0).max(480).nullable().optional(),
  available_hours_weekend: z.number().int().min(0).max(24).nullable().optional(),
  learning_style: z.enum(LEARNING_STYLES).nullable().optional(),
  deadline: z.string().nullable().optional(), // ISO date (YYYY-MM-DD)
  goal: z.string().max(500).nullable().optional(),
});

interface ProfileResponse {
  authenticated: boolean;
  firstName: string | null;
  profile: {
    goal: string | null;
    professional_experience: string | null;
    available_minutes_per_day: number | null;
    available_hours_weekend: number | null;
    learning_style: string | null;
    deadline: string | null;
  } | null;
  whatsapp: {
    phone: string | null;
    linked_at: string | null;
    last_seen_at: string | null;
  } | null;
}

export async function GET(): Promise<NextResponse<ProfileResponse>> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({
      authenticated: false,
      firstName: null,
      profile: null,
      whatsapp: null,
    });
  }

  const supabase = supabaseAdmin();
  const [userRes, profileRes, waRes] = await Promise.all([
    supabase.from("users").select("first_name").eq("id", userId).maybeSingle(),
    supabase
      .from("user_profile")
      .select(
        "goal, professional_experience, available_minutes_per_day, available_hours_weekend, learning_style, deadline"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_whatsapp")
      .select("phone, linked_at, last_seen_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    authenticated: true,
    firstName: userRes.data?.first_name ?? null,
    profile: profileRes.data
      ? {
          goal: profileRes.data.goal ?? null,
          professional_experience: profileRes.data.professional_experience ?? null,
          available_minutes_per_day: profileRes.data.available_minutes_per_day ?? null,
          available_hours_weekend: profileRes.data.available_hours_weekend ?? null,
          learning_style: profileRes.data.learning_style ?? null,
          deadline: profileRes.data.deadline ?? null,
        }
      : null,
    whatsapp: waRes.data
      ? {
          phone: waRes.data.phone,
          linked_at: waRes.data.linked_at,
          last_seen_at: waRes.data.last_seen_at,
        }
      : null,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "auth required", message: "Faça login na CEFIS para salvar preferências." },
      { status: 401 }
    );
  }

  let patch: z.infer<typeof PatchSchema>;
  try {
    patch = PatchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const dirty: Record<string, unknown> = {};
  for (const k of Object.keys(patch) as Array<keyof typeof patch>) {
    if (patch[k] !== undefined) dirty[k] = patch[k];
  }
  if (Object.keys(dirty).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }
  dirty.updated_at = new Date().toISOString();

  const supabase = supabaseAdmin();
  // Upsert pra cobrir caso o user_profile ainda não exista (sem onboarding feito)
  const { error } = await supabase.from("user_profile").upsert(
    {
      user_id: userId,
      goal: (dirty.goal as string | null | undefined) ?? "Configurar depois",
      ...dirty,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
