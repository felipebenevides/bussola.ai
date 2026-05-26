"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, Target, Trophy } from "lucide-react";

interface Skill {
  slug: string;
  label: string;
  description: string;
  importance: number;
}

interface Summary {
  critical: string[];
  partial: string[];
  mastered: string[];
  total: number;
}

type State =
  | { status: "loading" }
  | { status: "ready"; goal: string; skills: Skill[]; scores: Record<string, number> }
  | { status: "submitting"; skills: Skill[]; scores: Record<string, number> }
  | { status: "done"; summary: Summary }
  | { status: "error"; message: string };

export function DiagnosticChat() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "start" }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) {
          setState({ status: "error", message: j.message ?? j.error });
          return;
        }
        const skills: Skill[] = j.skills ?? [];
        const initial: Record<string, number> = {};
        for (const s of skills) initial[s.slug] = 50;
        setState({ status: "ready", goal: j.goal, skills, scores: initial });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    if (state.status !== "ready") return;
    setState({ status: "submitting", skills: state.skills, scores: state.scores });
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "submit",
          answers: state.skills.map((s) => ({
            slug: s.slug,
            label: s.label,
            selfScore: state.scores[s.slug] ?? 50,
            importance: s.importance,
          })),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: j.message ?? j.error ?? `Erro ${res.status}` });
        return;
      }
      setState({ status: "done", summary: j.summary });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Falha de rede",
      });
    }
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-20 text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A Bússola está decompondo seu objetivo
        em sub-habilidades…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
        {state.message}
      </div>
    );
  }

  if (state.status === "done") {
    return <ResultPanel summary={state.summary} />;
  }

  return (
    <section className="flex flex-1 flex-col gap-6 py-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Auto-diagnóstico
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold leading-tight">
          <Target className="h-6 w-6 text-emerald-500" />
          {state.status === "ready" ? state.goal : "Avalie suas sub-habilidades"}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
          A Bússola decompôs seu objetivo em {state.skills.length} sub-habilidades.
          Mova o slider de cada uma indicando *o quanto você domina hoje* — de 0 (nunca fiz) a
          100 (faço de olho fechado). Isso alimenta o curador de plano e o tutor.
        </p>
      </div>

      <div className="space-y-4">
        {state.skills.map((s) => (
          <SkillSlider
            key={s.slug}
            skill={s}
            value={state.scores[s.slug] ?? 50}
            onChange={(v) =>
              setState((prev) =>
                prev.status === "ready"
                  ? { ...prev, scores: { ...prev.scores, [s.slug]: v } }
                  : prev
              )
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={state.status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:self-end"
      >
        {state.status === "submitting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Concluir diagnóstico
      </button>
    </section>
  );
}

function SkillSlider({
  skill,
  value,
  onChange,
}: {
  skill: Skill;
  value: number;
  onChange: (v: number) => void;
}) {
  const status =
    value >= 70 ? "domina" : value >= 40 ? "lacuna_parcial" : "lacuna_critica";
  const statusColor =
    status === "domina"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "lacuna_parcial"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  const statusLabel =
    status === "domina"
      ? "Você domina"
      : status === "lacuna_parcial"
        ? "Lacuna parcial"
        : "Lacuna crítica";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {skill.label}
            </h3>
            {skill.importance >= 8 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                crítica
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{skill.description}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold text-zinc-800 dark:text-zinc-100">
            {value}
          </div>
          <div className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
            {statusLabel}
          </div>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-3 w-full accent-emerald-500"
      />
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>0 · nunca fiz</span>
        <span>50 · sei o básico</span>
        <span>100 · domino</span>
      </div>
    </div>
  );
}

function ResultPanel({ summary }: { summary: Summary }) {
  return (
    <section className="flex flex-1 flex-col gap-6 py-6">
      <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 p-5 dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-emerald-950/20">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Diagnóstico concluído
            </div>
            <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
              {summary.total} sub-habilidades avaliadas
            </div>
          </div>
        </div>
      </div>

      <Bucket label="🔥 Lacunas críticas" items={summary.critical} accent="red" />
      <Bucket label="⚠️ Lacunas parciais" items={summary.partial} accent="amber" />
      <Bucket label="✅ Você já domina" items={summary.mastered} accent="emerald" />

      <Link
        href="/plano"
        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
      >
        Gerar plano com base no diagnóstico
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

function Bucket({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent: "red" | "amber" | "emerald";
}) {
  if (items.length === 0) return null;
  const accents = {
    red: "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
    amber:
      "border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30",
    emerald:
      "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
  };
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
        {label}
      </div>
      <ul className="mt-2 space-y-1 text-sm text-zinc-800 dark:text-zinc-100">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
