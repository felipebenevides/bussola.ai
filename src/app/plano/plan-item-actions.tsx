"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { ChannelToggle } from "@/components/channel-toggle";

interface SavedStudy {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

type Status =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "saved"; study: SavedStudy }
  | { kind: "generating" }
  | { kind: "error"; message: string };

export function PlanItemActions({
  planItemId,
  planId,
  itemTitle,
  fallbackHref,
  deepLink,
  botPhone,
}: {
  planItemId: string;
  planId: string;
  itemTitle: string;
  fallbackHref: string;
  deepLink: string | null;
  botPhone?: string | null;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/plan-item-study?planItemId=${encodeURIComponent(planItemId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.study) {
          setStatus({ kind: "saved", study: j.study });
        } else {
          setStatus({ kind: "empty" });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: "empty" });
      });
    return () => {
      cancelled = true;
    };
  }, [planItemId]);

  async function generate() {
    setStatus({ kind: "generating" });
    try {
      const res = await fetch("/api/plan-item-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planItemId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: j.error ?? `Erro ${res.status}`,
        });
        return;
      }
      setStatus({ kind: "saved", study: j.study });
      setViewerOpen(true);
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha de rede",
      });
    }
  }

  const isSaved = status.kind === "saved";
  const isGenerating = status.kind === "generating";
  const isLoading = status.kind === "loading";

  return (
    <>
      <div className="flex flex-wrap gap-2 text-xs">
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <Loader2 className="h-3 w-3 animate-spin" /> verificando…
          </span>
        ) : isSaved ? (
          <>
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 font-semibold text-white shadow-sm hover:bg-violet-500"
            >
              <BookOpen className="h-3.5 w-3.5" /> Revisar conteúdo
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1 font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
              title="Substitui o conteúdo anterior"
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
              Gerar novamente
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> gerando…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Estudar agora
              </>
            )}
          </button>
        )}

        {deepLink && (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
          >
            ▶ Vídeo CEFIS
          </a>
        )}

        <Link
          href={fallbackHref}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Tirar dúvida
        </Link>
      </div>

      {status.kind === "error" && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{status.message}</p>
      )}

      {viewerOpen && status.kind === "saved" && (
        <StudyViewer
          study={status.study}
          itemTitle={itemTitle}
          planId={planId}
          planItemId={planItemId}
          botPhone={botPhone ?? null}
          onClose={() => setViewerOpen(false)}
          onRegenerate={generate}
        />
      )}

      {isGenerating && !viewerOpen && <GeneratingOverlay itemTitle={itemTitle} />}
    </>
  );
}

function StudyViewer({
  study,
  itemTitle,
  planId,
  planItemId,
  botPhone,
  onClose,
  onRegenerate,
}: {
  study: SavedStudy;
  itemTitle: string;
  planId: string;
  planItemId: string;
  botPhone: string | null;
  onClose: () => void;
  onRegenerate: () => void;
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

  const createdAt = new Date(study.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-fuchsia-500 to-emerald-500" />

        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Material de estudo · gerado em {createdAt}
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {study.title}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Item do plano: {itemTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <article className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-100 prose-headings:text-zinc-900 dark:prose-headings:text-zinc-50 prose-h1:text-2xl prose-h2:mt-6 prose-h2:text-lg prose-h2:font-bold prose-h2:text-emerald-700 dark:prose-h2:text-emerald-300 prose-h3:mt-4 prose-h3:text-sm prose-h3:font-semibold prose-strong:text-zinc-900 dark:prose-strong:text-zinc-50 prose-li:text-zinc-700 dark:prose-li:text-zinc-200">
            <ReactMarkdown>{study.body}</ReactMarkdown>
          </article>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <ChannelToggle
            botPhone={botPhone}
            label="Continuar"
            whatsappText={`Quero continuar o estudo sobre "${itemTitle}". Me explica os pontos principais e me mostra a aula CEFIS.`}
          />
          <div className="flex gap-2">
            <Link
              href={`/tutor?planId=${encodeURIComponent(planId)}&planItemId=${encodeURIComponent(planItemId)}`}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              Aprofundar no tutor
            </Link>
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(onRegenerate, 100);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-3 w-3" /> Gerar novamente
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function GeneratingOverlay({ itemTitle }: { itemTitle: string }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-w-md rounded-2xl border border-emerald-300 bg-white p-6 text-center shadow-2xl dark:border-emerald-900/60 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-md">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
          Gerando seu material de estudo
        </h3>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          A Bússola está estruturando conceitos, exemplos práticos e exercícios para o item{" "}
          <span className="font-semibold">&ldquo;{itemTitle}&rdquo;</span>. Leva entre 15 e 30 segundos.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> RAG nos chunks da aula
          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Adaptação ao seu estilo
        </div>
      </div>
    </div>
  );
}
