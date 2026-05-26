import { getCefisClient } from "@/lib/cefis-server";
import { TutorShell } from "./tutor-shell";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  let isLoggedIn = false;
  let firstName: string | null = null;
  try {
    const client = await getCefisClient();
    if (client) {
      isLoggedIn = true;
      try {
        const me = await client.me();
        firstName = me.first_name ?? null;
      } catch {
        // sem nome, segue
      }
    }
  } catch {
    // ignora — UI funciona sem login
  }

  return <TutorShell isLoggedIn={isLoggedIn} firstName={firstName} />;
}
