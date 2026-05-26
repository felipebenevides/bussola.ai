import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 p-6 text-center">
      <div className="space-y-4">
        <div className="text-6xl" aria-hidden>
          🧭
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Bússola</h1>
        <p className="mx-auto max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Sua tutora de IA para dominar <strong>negociação na contabilidade</strong> — usando o
          catálogo CEFIS e abrindo cada citação no <strong>segundo exato</strong> da aula.
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        <Feature
          icon="🎯"
          title="Diagnóstico em 2 min"
          text="4 perguntas no chat, sem formulário, sem fricção."
        />
        <Feature
          icon="🗺️"
          title="Plano de 1 semana"
          text="Aulas reais da CEFIS misturadas com reforço IA, no seu tempo."
        />
        <Feature
          icon="▶"
          title="Cita o segundo exato"
          text="O tutor responde e abre o player CEFIS no minuto certo."
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/login"
          className="inline-flex h-12 items-center justify-center rounded-md bg-zinc-900 px-8 text-base font-semibold text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Entrar com CEFIS
        </Link>
        <Link
          href="/tutor"
          className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 bg-transparent px-8 text-base font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Ver tutor sem login
        </Link>
      </div>

      <p className="max-w-md text-xs text-zinc-500">
        Hackathon CEFIS · 26/05/2026 · Projeto solo.{" "}
        <Link href="/admin" className="underline">
          Admin
        </Link>
      </p>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 text-left dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}
