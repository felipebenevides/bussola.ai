import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/cefis-server";
import {
  getActivePlanForUser,
  listPlansForUser,
  loadPlan,
  type PlanItemView,
  type PlanView,
} from "@/lib/plan";
import { getSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { GeneratePlanButton } from "./generate-button";
import { PlanItemActions } from "./plan-item-actions";

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

export default async function PlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const allPlans = await listPlansForUser(userId);

  let plan: PlanView | null = null;
  if (params.id) {
    plan = await loadPlan(params.id, userId);
  }
  if (!plan) {
    plan = await getActivePlanForUser(userId);
  }

  // Bot phone pro fallback do ChannelToggle (wa.me)
  let botPhone: string | null = null;
  try {
    const settings = await getSettings();
    botPhone = settings.evolution_bot_phone ?? null;
  } catch {
    // sem botPhone — toggle não aparece
  }

  // Phone do aluno (salvo no onboarding) — quando presente, ChannelToggle
  // envia via Evolution em vez de abrir wa.me externo
  let userPhone: string | null = null;
  try {
    const { data } = await supabaseAdmin()
      .from("user_profile")
      .select("phone")
      .eq("user_id", userId)
      .maybeSingle();
    userPhone = (data?.phone as string | null) ?? null;
  } catch {
    // sem profile — toggle cai pro fallback wa.me
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden>🧭</span>
          <span>Bússola · Plano</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {allPlans.length > 1 && plan && (
            <PlanSwitcher current={plan.id} plans={allPlans} />
          )}
          <Link
            href={plan ? `/tutor?planId=${encodeURIComponent(plan.id)}` : "/tutor"}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
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

          <WeekView
            items={plan.items}
            planId={plan.id}
            botPhone={botPhone}
            userPhone={userPhone}
          />
        </section>
      )}
    </main>
  );
}

function PlanSwitcher({
  current,
  plans,
}: {
  current: string;
  plans: Array<{ id: string; title: string; active: boolean; created_at: string }>;
}) {
  const currentPlan = plans.find((p) => p.id === current);
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
        <span className="max-w-[160px] truncate">
          {currentPlan?.title ?? "Selecionar plano"}
        </span>
        <span aria-hidden>▾</span>
      </summary>
      <div className="absolute right-0 z-10 mt-1 w-72 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <ul className="max-h-72 overflow-y-auto py-1">
          {plans.map((p) => {
            const date = new Date(p.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            });
            const isCurrent = p.id === current;
            return (
              <li key={p.id}>
                <a
                  href={`/plano?id=${encodeURIComponent(p.id)}`}
                  className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                    isCurrent
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex-1 truncate">
                    <span className="block font-medium">{p.title}</span>
                    <span className="block text-[10px] text-zinc-500">
                      {date} · {p.active ? "ativo" : "arquivado"}
                    </span>
                  </span>
                  {isCurrent && <span className="text-emerald-600">✓</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

function WeekView({
  items,
  planId,
  botPhone,
  userPhone,
}: {
  items: PlanItemView[];
  planId: string;
  botPhone: string | null;
  userPhone: string | null;
}) {
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
                <PlanItemRow
                  key={it.id}
                  item={it}
                  planId={planId}
                  botPhone={botPhone}
                  userPhone={userPhone}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlanItemRow({
  item,
  planId,
  botPhone,
  userPhone,
}: {
  item: PlanItemView;
  planId: string;
  botPhone: string | null;
  userPhone: string | null;
}) {
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
      <PlanItemActions
        planItemId={item.id}
        planId={planId}
        itemTitle={item.title}
        fallbackHref={`/tutor?planId=${encodeURIComponent(planId)}`}
        deepLink={item.deep_link}
        botPhone={botPhone}
        userPhone={userPhone}
      />
    </li>
  );
}
