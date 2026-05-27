import { getCefisClient, getCurrentUserId } from "@/lib/cefis-server";
import { supabaseAdmin } from "@/lib/supabase";
import { TutorShell } from "./tutor-shell";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  let isLoggedIn = false;
  let firstName: string | null = null;
  let fullName: string | null = null;
  let avatar: string | null = null;
  try {
    const client = await getCefisClient();
    if (client) {
      isLoggedIn = true;
      try {
        const me = await client.me();
        firstName = me.first_name ?? null;
        fullName = me.name ?? null;
        avatar = me.avatar ?? null;
      } catch {
        // sem dados, segue
      }
    }
  } catch {
    // ignora — UI funciona sem login
  }

  let userPhone: string | null = null;
  if (isLoggedIn) {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const { data } = await supabaseAdmin()
          .from("user_profile")
          .select("phone")
          .eq("user_id", userId)
          .maybeSingle();
        userPhone = (data?.phone as string | null) ?? null;
      }
    } catch {
      // sem profile, sem phone — modal mostra "complete o onboarding"
    }
  }

  return (
    <TutorShell
      isLoggedIn={isLoggedIn}
      firstName={firstName}
      fullName={fullName}
      avatar={avatar}
      userPhone={userPhone}
    />
  );
}
