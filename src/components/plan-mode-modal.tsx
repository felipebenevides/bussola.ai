"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Construction,
  Loader2,
  Pencil,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

interface CourseOption {
  id: number;
  title: string;
  lessonCount: number;
  chunkCount?: number;
}

type Mode = "course" | "custom" | "upload";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function PlanModeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [customName, setCustomName] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    if (!open) return;
    setMode(null);
    setSelectedCourseId(null);
    setCustomName("");
    setCustomGoal("");
    setState({ status: "idle" });
    setCoursesLoading(true);
    fetch("/api/courses")
      .then((r) => r.json())
      .then(
        (j: {
          indexed?: Array<{ id: number; title: string; lessonCount: number; chunkCount: number }>;
        }) => {
          setCourses(
            (j.indexed ?? []).map((c) => ({
              id: c.id,
              title: c.title,
              lessonCount: c.lessonCount,
              chunkCount: c.chunkCount,
            }))
          );
        }
      )
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit =
    (mode === "course" && selectedCourseId !== null) ||
    (mode === "custom" && customName.trim().length >= 2 && customGoal.trim().length >= 3);

  async function handleGenerate() {
    if (!canSubmit) return;
    setState({ status: "submitting" });
    const payload =
      mode === "course"
        ? { mode: "course", courseId: selectedCourseId }
        : { mode: "custom", customName: customName.trim(), customGoal: customGoal.trim() };
    try {
      const res = await fetch("/api/curator/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          status: "error",
          message: (j.error as string) ?? `Erro ${res.status}.`,
        });
        return;
      }
      setState({ status: "success" });
      router.refresh();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Falha de rede.",
      });
    }
  }

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
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {mode === null
                  ? "Como você quer estudar?"
                  : mode === "course"
                    ? "Plano sobre um curso CEFIS"
                    : "Plano avulso"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {mode === null
                  ? "Escolha o ponto de partida do seu plano de uma semana."
                  : mode === "course"
                    ? "A curadora vai focar nas aulas desse curso."
                    : "Você define o nome e o objetivo — a curadora monta o caminho."}
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

        <div className="space-y-4 px-5 pb-5 pt-4">
          {mode === null && (
            <div className="grid gap-3 sm:grid-cols-3">
              <ModeCard
                icon={<BookOpen className="h-5 w-5" />}
                title="Curso CEFIS"
                description="Escolha um curso já indexado e monte o plano em volta dele."
                onClick={() => setMode("course")}
                accent="emerald"
              />
              <ModeCard
                icon={<Pencil className="h-5 w-5" />}
                title="Plano avulso"
                description="Defina nome + objetivo. A curadora puxa o que tiver no catálogo + IA."
                onClick={() => setMode("custom")}
                accent="violet"
              />
              <ModeCard
                icon={<Upload className="h-5 w-5" />}
                title="Curso personalizado"
                description="Suba PDFs/áudios. A Bússola embeda no banco e gera o plano em cima."
                onClick={() => {
                  alert(
                    "🚧 Feature em fase de implementação.\n\nEm breve você poderá subir PDFs, vídeos e áudios próprios. A Bússola vai embedar tudo no Supabase e criar um curso personalizado pro seu plano. Por enquanto, use 'Curso CEFIS' ou 'Plano avulso'."
                  );
                }}
                accent="amber"
                badge="em construção"
                disabled
              />
            </div>
          )}

          {mode === "course" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ← voltar
              </button>
              {coursesLoading ? (
                <div className="flex items-center justify-center py-12 text-sm text-zinc-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando cursos…
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  Nenhum curso indexado ainda. Volte e use "Plano avulso".
                </div>
              ) : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {courses.map((c) => {
                    const selected = c.id === selectedCourseId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCourseId(c.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                            : "border-zinc-200 hover:border-emerald-300 dark:border-zinc-800 dark:hover:border-emerald-700"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            selected
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          <BookOpen className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {c.title}
                          </span>
                          <span className="block text-[10px] text-zinc-500">
                            {c.lessonCount} aulas
                            {c.chunkCount ? ` · ${c.chunkCount} trechos indexados` : " · só metadados"}
                          </span>
                        </span>
                        {selected && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                ← voltar
              </button>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Nome do plano
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Negociação avançada com clientes premium"
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:ring-emerald-900/60"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Objetivo / o que você quer aprender
                </label>
                <textarea
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  rows={3}
                  placeholder="Ex: Quero abrir mais negociações sem virar leilão de preço; preciso dominar ZOPA + ancoragem."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:ring-emerald-900/60"
                />
              </div>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{state.message}</span>
            </div>
          )}
          {state.status === "success" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> Plano criado! Atualizando…
            </div>
          )}

          {mode !== null && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canSubmit || state.status === "submitting"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state.status === "submitting" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar plano
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  description,
  onClick,
  accent,
  badge,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accent: "emerald" | "violet" | "amber";
  badge?: string;
  disabled?: boolean;
}) {
  const accents = {
    emerald:
      "border-emerald-200 hover:border-emerald-500 dark:border-emerald-900/60 dark:hover:border-emerald-500",
    violet:
      "border-violet-200 hover:border-violet-500 dark:border-violet-900/60 dark:hover:border-violet-500",
    amber:
      "border-amber-300 hover:border-amber-500 dark:border-amber-900/60 dark:hover:border-amber-500",
  };
  const iconBg = {
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    violet:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${accents[accent]} ${disabled ? "opacity-90" : ""}`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg[accent]}`}
        >
          {icon}
        </span>
        {badge && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            <Construction className="h-2.5 w-2.5" />
            {badge}
          </span>
        )}
      </span>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </button>
  );
}
