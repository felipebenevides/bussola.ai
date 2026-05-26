import Link from "next/link";
import { redirect } from "next/navigation";
import { getCefisClient } from "@/lib/cefis-server";
import { OnboardingChat } from "./onboarding-chat";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const client = await getCefisClient();
  if (!client) {
    redirect("/login");
  }

  let firstName: string | null = null;
  try {
    const me = await client.me();
    firstName = me.first_name ?? null;
  } catch {
    // segue sem o nome — onboarding faz introdução genérica
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden>🧭</span>
          <span>Bússola</span>
        </Link>
        <span className="text-xs text-zinc-500">Onboarding</span>
      </header>
      <OnboardingChat firstName={firstName} />
    </main>
  );
}
