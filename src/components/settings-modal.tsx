"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  Headphones,
  Layers,
  Loader2,
  Phone,
  Save,
  Settings as SettingsIcon,
  Target,
  X,
  Zap,
} from "lucide-react";

interface ProfileResponse {
  authenticated: boolean;
  firstName: string | null;
  profile: {
    goal: string | null;
    professional_experience: string | null;
    available_minutes_per_day: number | null;
    available_hours_weekend: number | null;
    learning_style: string | null;
    deadline: string | null;
  } | null;
  whatsapp: {
    phone: string | null;
    linked_at: string | null;
    last_seen_at: string | null;
  } | null;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

const STYLES: Array<{ value: "visual" | "auditory" | "kinesthetic" | "mixed"; label: string; icon: React.ReactNode }> = [
  { value: "visual", label: "Visual", icon: <Eye className="h-3.5 w-3.5" /> },
  { value: "auditory", label: "Auditivo", icon: <Headphones className="h-3.5 w-3.5" /> },
  { value: "kinesthetic", label: "Prático", icon: <Zap className="h-3.5 w-3.5" /> },
  { value: "mixed", label: "Misto", icon: <Layers className="h-3.5 w-3.5" /> },
];

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) {
    return `+55 ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return `+${d}`;
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  const [minutes, setMinutes] = useState(30);
  const [weekend, setWeekend] = useState(2);
  const [style, setStyle] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string>("");
  const [goal, setGoal] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSave({ status: "idle" });
    fetch("/api/profile")
      .then((r) => r.json())
      .then((j: ProfileResponse) => {
        setData(j);
        if (j.profile) {
          setMinutes(j.profile.available_minutes_per_day ?? 30);
          setWeekend(j.profile.available_hours_weekend ?? 2);
          setStyle(j.profile.learning_style ?? null);
          setDeadline(j.profile.deadline ?? "");
          setGoal(j.profile.goal ?? "");
        }
      })
      .catch(() => {
        /* sem perfil — ignora */
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const isAuthed = data?.authenticated === true;

  async function handleSave() {
    if (!isAuthed) return;
    setSave({ status: "saving" });
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available_minutes_per_day: minutes,
          available_hours_weekend: weekend,
          learning_style: style,
          deadline: deadline || null,
          goal: goal.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setSave({
          status: "error",
          message: (j.message as string) ?? (j.error as string) ?? `Erro ${res.status}.`,
        });
        return;
      }
      setSave({ status: "saved" });
      setTimeout(() => setSave({ status: "idle" }), 2500);
    } catch (err) {
      setSave({
        status: "error",
        message: err instanceof Error ? err.message : "Falha de rede.",
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-md">
              <SettingsIcon className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="settings-modal-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Preferências de estudo
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure sua disponibilidade — os lembretes e o plano usam isso.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 pb-5 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !isAuthed ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              As preferências ficam vinculadas à sua conta CEFIS. Faça{" "}
              <a href="/login" className="font-semibold underline-offset-2 hover:underline">
                login
              </a>{" "}
              pra salvar disponibilidade, estilo de aprendizagem e prazo.
            </div>
          ) : (
            <>
              {/* Objetivo */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <Target className="h-3.5 w-3.5" /> Objetivo
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ex: Passar na OAB em 6 meses"
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:ring-emerald-900/60"
                />
              </div>

              {/* Tempo dia-de-semana */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <Clock className="h-3.5 w-3.5" /> Tempo por dia (durante a semana)
                  </label>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {minutes} min
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>0</span>
                  <span>1h30</span>
                  <span>3h</span>
                </div>
              </div>

              {/* Tempo fim de semana */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <Clock className="h-3.5 w-3.5" /> Horas por dia no fim de semana
                  </label>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {weekend}h
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={weekend}
                  onChange={(e) => setWeekend(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>0h</span>
                  <span>6h</span>
                  <span>12h</span>
                </div>
              </div>

              {/* Estilo de aprendizagem */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Como você aprende melhor
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {STYLES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                        style === s.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-emerald-700"
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Prazo / meta (opcional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-emerald-900/60"
                />
              </div>

              {/* WhatsApp pareado */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <Phone className="h-3.5 w-3.5" /> WhatsApp pareado
                </div>
                {data?.whatsapp?.phone ? (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {formatPhone(data.whatsapp.phone)}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      ✓ ativo · lembretes habilitados
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-zinc-500">
                    Nenhum número pareado. Use o footer do sidebar pra receber o convite no
                    WhatsApp.
                  </div>
                )}
              </div>

              {save.status === "error" && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {save.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={save.status === "saving"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {save.status === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : save.status === "saved" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {save.status === "saved" ? "Salvo!" : "Salvar preferências"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
