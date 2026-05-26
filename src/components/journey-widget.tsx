"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Flame, Sparkles, Trophy, X } from "lucide-react";

interface JourneyLevel {
  slug: string;
  name: string;
  phase: string;
  emoji: string;
  minXp: number;
  nextXp: number | null;
}

interface JourneyLadderItem extends JourneyLevel {
  unlocked: boolean;
  current: boolean;
}

interface JourneyResponse {
  authenticated: boolean;
  xp: number;
  level: JourneyLevel;
  progress: number;
  questionsTotal: number;
  citationsTotal: number;
  streak: number;
  lastActivityAt: string | null;
  recentDays: string[];
  ladder: JourneyLadderItem[];
}

const ACCENT_BY_LEVEL: Record<string, { from: string; to: string; ring: string; text: string }> = {
  aprendiz:     { from: "from-emerald-400",  to: "to-emerald-600",  ring: "ring-emerald-400/40",  text: "text-emerald-300" },
  aventureiro:  { from: "from-sky-400",      to: "to-blue-600",     ring: "ring-sky-400/40",      text: "text-sky-300" },
  estrategista: { from: "from-violet-400",   to: "to-purple-600",   ring: "ring-violet-400/40",   text: "text-violet-300" },
  mestre:       { from: "from-amber-400",    to: "to-orange-600",   ring: "ring-amber-400/40",    text: "text-amber-300" },
  lenda:        { from: "from-fuchsia-400",  to: "to-rose-600",     ring: "ring-fuchsia-400/40",  text: "text-fuchsia-300" },
};

function accent(slug: string) {
  return ACCENT_BY_LEVEL[slug] ?? ACCENT_BY_LEVEL.aprendiz!;
}

export function JourneyWidget({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [data, setData] = useState<JourneyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedXp, setAnimatedXp] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/journey")
      .then((r) => r.json())
      .then((j: JourneyResponse) => {
        if (cancelled) return;
        setData(j);
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

  // Anima a barra de XP do 0 até o valor real ao montar
  useEffect(() => {
    if (!data) return;
    const target = Math.round(data.progress * 100);
    let raf: number;
    let start: number | null = null;
    const duration = 900;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedXp(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  if (!isLoggedIn) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950/40 via-emerald-950/20 to-transparent p-3">
        <div className="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-10">🧭</div>
        <div className="relative flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> Jornada do Herói
        </div>
        <p className="relative mt-1 text-[10px] leading-tight text-emerald-100/70">
          Entra com CEFIS pra acompanhar XP, nível e streak diário.
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

  const a = accent(data.level.slug);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${a.from} ${a.to} p-3 text-left shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]`}
      >
        {/* shine sweep */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

        {/* big emoji ghost */}
        <span className="pointer-events-none absolute -right-3 -top-3 text-6xl opacity-20">
          {data.level.emoji}
        </span>

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl backdrop-blur ring-2 ${a.ring}`}>
              {data.level.emoji}
            </span>
            <div className="leading-tight">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                {data.level.name}
              </div>
              <div className="text-[10px] text-white/70">{data.level.phase}</div>
            </div>
          </div>
          {data.streak > 0 && (
            <span
              title={`${data.streak} ${data.streak === 1 ? "dia" : "dias"} seguidos`}
              className="flex items-center gap-0.5 rounded-full bg-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-orange-300/40"
            >
              <Flame className="h-3 w-3 animate-pulse" />
              {data.streak}
            </span>
          )}
        </div>

        <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full bg-gradient-to-r from-white/90 to-white/60 shadow-inner transition-all duration-300"
            style={{ width: `${animatedXp}%` }}
          />
        </div>
        <div className="relative mt-1 flex items-center justify-between text-[10px] text-white/80">
          <span className="font-mono font-bold">{data.xp} XP</span>
          <span className="flex items-center gap-1">
            ver jornada <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </button>

      {open && <JourneyModal data={data} onClose={() => setOpen(false)} />}
    </>
  );
}

function JourneyModal({
  data,
  onClose,
}: {
  data: JourneyResponse;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const a = accent(data.level.slug);
  const recent = new Set(data.recentDays);
  const days = lastNDays(30);
  const nextDelta = data.level.nextXp ? data.level.nextXp - data.xp : 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero header */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${a.from} ${a.to} px-6 pb-6 pt-7 text-white`}>
          <span className="pointer-events-none absolute -right-6 -top-6 text-[180px] leading-none opacity-15">
            {data.level.emoji}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-3 top-3 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative flex items-end gap-3">
            <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-5xl shadow-lg backdrop-blur ring-2 ${a.ring}`}>
              {data.level.emoji}
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                Nível
              </div>
              <div className="text-2xl font-bold leading-tight">{data.level.name}</div>
              <div className="text-xs text-white/80">{data.level.phase}</div>
            </div>
          </div>

          <div className="relative mt-5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-white/90">
              <span className="font-mono">{data.xp} XP</span>
              <span>
                {data.level.nextXp
                  ? `${nextDelta} XP pra subir`
                  : "Você é Lenda — topo da jornada!"}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-white to-white/70 shadow-inner transition-all"
                style={{ width: `${Math.round(data.progress * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <Stat label="Perguntas" value={data.questionsTotal} icon="❓" />
          <Stat label="Citações" value={data.citationsTotal} icon="📍" />
          <Stat
            label="Streak"
            value={`${data.streak}d`}
            icon="🔥"
            highlight={data.streak >= 3}
          />
        </div>

        {/* Ladder */}
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            <Trophy className="h-3.5 w-3.5" /> Jornada do Herói
          </div>
          <div className="space-y-1.5">
            {data.ladder.map((l) => {
              const la = accent(l.slug);
              return (
                <div
                  key={l.slug}
                  className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors ${
                    l.current
                      ? `bg-gradient-to-r ${la.from} ${la.to} text-white shadow-md`
                      : l.unlocked
                        ? "bg-emerald-50 dark:bg-emerald-950/30"
                        : "opacity-50"
                  }`}
                >
                  <span className="text-xl leading-none">{l.emoji}</span>
                  <div className="flex-1 leading-tight">
                    <div className={`text-[12px] font-semibold ${l.current ? "text-white" : "text-zinc-800 dark:text-zinc-100"}`}>
                      {l.name}
                    </div>
                    <div className={`text-[10px] ${l.current ? "text-white/80" : "text-zinc-500"}`}>
                      {l.phase}
                    </div>
                  </div>
                  <div className={`font-mono text-[10px] ${l.current ? "text-white/90" : "text-zinc-500"}`}>
                    {l.minXp} XP
                  </div>
                  {l.unlocked && !l.current && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Streak calendar */}
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> Atividade — últimos 30 dias
            </span>
            <span className="text-[10px] text-zinc-500">
              {data.recentDays.length} {data.recentDays.length === 1 ? "dia" : "dias"} ativos
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {days.map((d) => {
              const active = recent.has(d);
              const isToday = d === todayKey();
              return (
                <div
                  key={d}
                  title={d}
                  className={`aspect-square w-full rounded-sm transition-transform ${
                    active
                      ? "bg-gradient-to-br from-orange-400 to-rose-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  } ${isToday ? "ring-2 ring-emerald-400" : ""}`}
                />
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-1.5 px-5 py-4 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="font-semibold text-zinc-800 dark:text-zinc-100">
            Como ganhar mais XP:
          </div>
          <ul className="space-y-1 text-[11px]">
            <li>• <span className="font-semibold text-emerald-600 dark:text-emerald-400">+10 XP</span> por cada pergunta que você faz (web ou WhatsApp)</li>
            <li>• <span className="font-semibold text-emerald-600 dark:text-emerald-400">+5 XP</span> quando o tutor responde citando uma aula CEFIS</li>
            <li>• 🔥 Pergunta todo dia pra manter o streak — bônus visual e diferenciação</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        highlight
          ? "border-orange-300 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/40"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <div className="text-lg leading-none">{icon}</div>
      <div className={`mt-1 text-base font-bold ${highlight ? "text-orange-700 dark:text-orange-300" : "text-zinc-800 dark:text-zinc-100"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < n; i++) {
    const key = `${cursor.getUTCFullYear()}-${(cursor.getUTCMonth() + 1).toString().padStart(2, "0")}-${cursor.getUTCDate().toString().padStart(2, "0")}`;
    days.unshift(key);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}
