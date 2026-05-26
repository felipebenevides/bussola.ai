"use client";

import { useEffect, useState } from "react";
import { Flame, Sparkles } from "lucide-react";

interface JourneyResponse {
  authenticated: boolean;
  xp: number;
  level: {
    slug: string;
    name: string;
    phase: string;
    emoji: string;
    minXp: number;
    nextXp: number | null;
  };
  progress: number;
  questionsTotal: number;
  citationsTotal: number;
  streak: number;
  lastActivityAt: string | null;
}

export function JourneyWidget({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [data, setData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/journey")
      .then((r) => r.json())
      .then((j: JourneyResponse) => {
        if (!cancelled) setData(j);
      })
      .catch(() => {
        /* silencioso */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200">
        <div className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Jornada do Herói
        </div>
        <p className="mt-1 text-[10px] text-emerald-100/70">
          Entra com CEFIS pra acompanhar XP, nível e streak de estudo.
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[#222d34] bg-[#111b21] px-3 py-2.5 text-xs text-[#8696a0]">
        <div className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Jornada
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#202c33]">
          <div className="h-full w-1/3 animate-pulse bg-emerald-700/40" />
        </div>
      </div>
    );
  }

  const pct = Math.round(data.progress * 100);
  const nextDelta = data.level.nextXp ? data.level.nextXp - data.xp : 0;

  return (
    <div className="rounded-xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/40 via-emerald-950/20 to-transparent px-3 py-2.5 text-xs text-[#e9edef]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-lg leading-none">{data.level.emoji}</span>
          <div className="leading-tight">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              {data.level.name}
            </div>
            <div className="text-[10px] text-emerald-100/60">{data.level.phase}</div>
          </div>
        </div>
        {data.streak > 0 && (
          <span
            title={`Streak: ${data.streak} ${data.streak === 1 ? "dia" : "dias"} seguidos`}
            className="flex items-center gap-0.5 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-orange-300"
          >
            <Flame className="h-3 w-3" />
            {data.streak}
          </span>
        )}
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/60">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-100/60">
        <span>{data.xp} XP</span>
        <span>
          {data.level.nextXp
            ? `${nextDelta} XP pra ${
                data.level.slug === "aprendiz"
                  ? "Aventureiro"
                  : data.level.slug === "aventureiro"
                    ? "Estrategista"
                    : data.level.slug === "estrategista"
                      ? "Mestre"
                      : "Lenda"
              }`
            : "Lenda — você chegou ao topo!"}
        </span>
      </div>
    </div>
  );
}
