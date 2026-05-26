import { getCefisClient } from "@/lib/cefis-server";
import { getSettings } from "@/lib/settings";
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

  let botPhone: string | null = null;
  try {
    const settings = await getSettings();
    botPhone = settings.evolution_bot_phone ?? null;
  } catch {
    // sem settings, sem telefone — modal mostra aviso
  }

  return (
    <TutorShell
      isLoggedIn={isLoggedIn}
      firstName={firstName}
      fullName={fullName}
      avatar={avatar}
      botPhone={botPhone}
    />
  );
}
