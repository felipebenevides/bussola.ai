import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/cefis-server";
import { getActivePlanForUser, type PlanItemView } from "@/lib/plan";
import { Card, CardContent } from "@/components/ui/card";
import { GeneratePlanButton } from "./generate-button";

export const dynamic = "force-dynamic";

const DAYS = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const SOURCE_BADGES: Record<string, { label: string; emoji: string; classes: string }> = {
  cefis_lesson: {
    label: "Aula CEFIS",
    emoji: "📺",
    classes:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  cefis_track: {
    label: "Trilha CEFIS",
    emoji: "🎯",
    classes: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  generated_summary: {
    label: "Resumo IA",
    emoji: "📝",
    classes: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  generated_pdf: {
    label: "PDF IA",
    emoji: "📝",
    classes: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  generated_podcast: {
    label: "Podcast IA",
    emoji: "🎙️",
    classes: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  generated_quiz: {
    label: "Quiz",
    emoji: "❓",
    classes: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
};

export default async function PlanoPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const plan = await getActivePlanForUser(userId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden>🧭</span>
          <span>Bússola · Plano</span>
        </Link>
        <nav className="flex gap-3 text-sm">
          <Link href="/tutor" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Tirar dúvida
          </Link>
        </nav>
      </header>

      {!plan ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="text-5xl" aria-hidden>
            🗺️
          </div>
          <h1 className="text-2xl font-bold">Você ainda não tem um plano</h1>
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Vamos gerar uma semana sob medida com base no seu perfil. A curadora vai escolher aulas
            reais da CEFIS e abrir cada uma no segundo certo da explicação.
          </p>
          <GeneratePlanButton label="Gerar meu primeiro plano" />
          <p className="text-xs text-zinc-500">
            Sem perfil ainda? <Link href="/onboarding" className="underline">Fazer onboarding</Link>
          </p>
        </section>
      ) : (
        <section className="flex flex-1 flex-col gap-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Semana 1
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">{plan.title}</h1>
              {plan.rationale && (
                <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.rationale}
                </p>
              )}
            </div>
            <GeneratePlanButton label="Refazer plano" variant="outline" />
          </div>

          <WeekView items={plan.items} />
        </section>
      )}
    </main>
  );
}

function WeekView({ items }: { items: PlanItemView[] }) {
  const byDay = new Map<number, PlanItemView[]>();
  for (const it of items) {
    const arr = byDay.get(it.day_of_week) ?? [];
    arr.push(it);
    byDay.set(it.day_of_week, arr);
  }
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);
  if (days.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Plano gerado, mas sem items — algo deu errado. Tente refazer.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((d) => (
        <Card key={d}>
          <CardContent className="space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {DAYS[d] ?? `Dia ${d}`}
            </p>
            <ul className="space-y-3">
              {(byDay.get(d) ?? []).map((it) => (
                <PlanItemRow key={it.id} item={it} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlanItemRow({ item }: { item: PlanItemView }) {
  const badge = SOURCE_BADGES[item.source] ?? {
    label: item.source,
    emoji: "•",
    classes: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  };

  return (
    <li className="space-y-2 border-l-2 border-zinc-200 pl-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${badge.classes}`}
        >
          <span aria-hidden>{badge.emoji}</span>
          {badge.label}
        </span>
        <span className="text-zinc-500">{item.duration_minutes} min</span>
      </div>
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      {item.lesson_title && (
        <p className="text-xs text-zinc-500">
          {item.course_title ? `${item.course_title} · ` : ""}
          {item.lesson_title}
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        {item.deep_link && (
          <a
            href={item.deep_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
          >
            ▶ Abrir na CEFIS
          </a>
        )}
        <Link
          href={`/tutor`}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Tirar dúvida
        </Link>
      </div>
    </li>
  );
}
