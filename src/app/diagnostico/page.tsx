import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/cefis-server";
import { DiagnosticChat } from "./diagnostic-chat";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login?next=/diagnostico");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden>🧭</span>
          <span>Bússola · Diagnóstico</span>
        </Link>
        <nav className="flex gap-3 text-sm">
          <Link
            href="/tutor"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Voltar ao tutor
          </Link>
        </nav>
      </header>
      <DiagnosticChat />
    </main>
  );
}
