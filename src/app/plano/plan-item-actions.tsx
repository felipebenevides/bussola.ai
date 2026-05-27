"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
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
  lessonId,
  startSeconds,
  botPhone,
  userPhone,
}: {
  planItemId: string;
  planId: string;
  itemTitle: string;
  fallbackHref: string;
  deepLink: string | null;
  /** Quando presente, habilita o player embedado (carrega stream_sources). */
  lessonId?: number | null;
  startSeconds?: number | null;
  botPhone?: string | null;
  userPhone?: string | null;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [viewerOpen, setViewerOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);

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

        {deepLink && lessonId ? (
          <button
            type="button"
            onClick={() => setPlayerOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
          >
            <Play className="h-3 w-3" /> Vídeo CEFIS
          </button>
        ) : deepLink ? (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
          >
            <Play className="h-3 w-3" /> Vídeo CEFIS
          </a>
        ) : null}

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
          userPhone={userPhone ?? null}
          onClose={() => setViewerOpen(false)}
          onRegenerate={generate}
        />
      )}

      {isGenerating && !viewerOpen && <GeneratingOverlay itemTitle={itemTitle} />}

      {playerOpen && lessonId && (
        <LessonPlayerModal
          lessonId={lessonId}
          startSeconds={startSeconds ?? 0}
          itemTitle={itemTitle}
          fallbackDeepLink={deepLink}
          onClose={() => setPlayerOpen(false)}
        />
      )}
    </>
  );
}

function StudyViewer({
  study,
  itemTitle,
  planId,
  planItemId,
  botPhone,
  userPhone,
  onClose,
  onRegenerate,
}: {
  study: SavedStudy;
  itemTitle: string;
  planId: string;
  planItemId: string;
  botPhone: string | null;
  userPhone: string | null;
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
            userPhone={userPhone}
            label="Continuar"
            whatsappText={
              `📚 *Continuação do estudo*\n\n` +
              `Item do seu plano: "${itemTitle}"\n\n` +
              `Resumo dos pontos principais:\n${trimMarkdownForWhatsapp(study.body)}\n\n` +
              `Manda *menu* pra ver opções ou pergunta direto.`
            }
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

/**
 * Reduz o markdown extenso do estudo (h2, listas, ...) num resumo curto
 * pra caber numa mensagem de WhatsApp sem virar wall of text. Mantém
 * heading "## Conceitos-chave" e os 3 primeiros bullets de cada seção.
 */
function trimMarkdownForWhatsapp(body: string, maxChars = 1200): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let chars = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // mantém H2 (## Algo) e primeiros itens; pula H1 e prose extensa
    if (line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      if (chars > 0) out.push("");
      out.push(line.replace(/^##\s+/, "▶ ").replace(/\*\*/g, "*"));
    } else if (line.startsWith("### ")) {
      out.push("• " + line.replace(/^###\s+/, "").replace(/\*\*/g, "*"));
    } else if (line.startsWith("- ") || /^\d+\./.test(line)) {
      out.push(line.replace(/\*\*/g, "*"));
    } else if (chars < 600) {
      // parágrafo curto, só os primeiros pra não estourar
      out.push(line.replace(/\*\*/g, "*"));
    }
    chars = out.join("\n").length;
    if (chars > maxChars) break;
  }
  let result = out.join("\n");
  if (result.length > maxChars) result = result.slice(0, maxChars - 3) + "…";
  return result;
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

// ────────────────────────────────────────────────────────────────────
// LessonPlayerModal — abre o vídeo CEFIS embedado na própria página
// Estratégia: tenta iframe da página real CEFIS. Se a CEFIS bloquear
// (X-Frame-Options / frame-ancestors), o usuário usa o botão "Abrir no
// CEFIS" no rodapé. Se as stream_sources estiverem disponíveis, mostra
// também tab "Player nativo" com <video> apontando direto pro HLS — útil
// quando o iframe não carrega.
// ────────────────────────────────────────────────────────────────────

interface PlayerStreamSource {
  quality: string | null;
  type: string | null;
  height: number | null;
  url: string;
}

interface PlayerStreamData {
  lessonId: number;
  courseId: number;
  title: string | null;
  durationSeconds: number | null;
  deepLink: string;
  startSeconds: number;
  streams: PlayerStreamSource[];
}

type PlayerLoad =
  | { kind: "loading" }
  | { kind: "ready"; data: PlayerStreamData }
  | { kind: "error"; message: string };

function LessonPlayerModal({
  lessonId,
  startSeconds,
  itemTitle,
  fallbackDeepLink,
  onClose,
}: {
  lessonId: number;
  startSeconds: number;
  itemTitle: string;
  fallbackDeepLink: string | null;
  onClose: () => void;
}) {
  const [load, setLoad] = useState<PlayerLoad>({ kind: "loading" });
  const [mode, setMode] = useState<"iframe" | "native">("iframe");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    fetch(`/api/lessons/${lessonId}/stream?t=${startSeconds}`)
      .then(async (r) => {
        const json = (await r.json().catch(() => ({}))) as Partial<PlayerStreamData> & {
          error?: string;
        };
        if (cancelled) return;
        if (!r.ok || typeof json.deepLink !== "string") {
          setLoad({ kind: "error", message: json.error ?? `Erro ${r.status}` });
          return;
        }
        setLoad({ kind: "ready", data: json as PlayerStreamData });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoad({
          kind: "error",
          message: err instanceof Error ? err.message : "Falha de rede",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, startSeconds]);

  const data = load.kind === "ready" ? load.data : null;
  const cefisUrl = data?.deepLink ?? fallbackDeepLink ?? null;
  const nativeStream = data?.streams[0] ?? null;
  const hasNative = !!nativeStream;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/85 backdrop-blur-sm"
      />

      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Vídeo CEFIS · embed
            </p>
            <h2 className="mt-0.5 truncate text-base font-bold text-zinc-900 dark:text-zinc-50">
              {itemTitle}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasNative && (
              <div
                className="hidden items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px] font-semibold dark:border-zinc-700 dark:bg-zinc-800 sm:flex"
                role="tablist"
              >
                <button
                  type="button"
                  onClick={() => setMode("iframe")}
                  className={`rounded-md px-2 py-1 transition-colors ${
                    mode === "iframe"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  Player CEFIS
                </button>
                <button
                  type="button"
                  onClick={() => setMode("native")}
                  className={`rounded-md px-2 py-1 transition-colors ${
                    mode === "native"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  Player nativo
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 bg-black">
          <div className="relative aspect-video w-full">
            {load.kind === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {load.kind === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white/80">
                <p className="text-sm font-semibold">
                  Não consegui carregar os dados da aula.
                </p>
                <p className="text-xs text-white/60">{load.message}</p>
                {cefisUrl && (
                  <a
                    href={cefisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-500"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir no CEFIS
                  </a>
                )}
              </div>
            )}

            {load.kind === "ready" && mode === "iframe" && cefisUrl && (
              <iframe
                key={cefisUrl}
                src={cefisUrl}
                title={itemTitle}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}

            {load.kind === "ready" && mode === "native" && nativeStream && (
              <video
                key={nativeStream.url}
                controls
                autoPlay
                className="absolute inset-0 h-full w-full bg-black"
                src={nativeStream.url}
              >
                Seu navegador não suporta vídeo embedado.
              </video>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-500 dark:text-zinc-400">
            Se o player não carregar (CEFIS bloqueia embed em alguns navegadores),
            abra direto no portal.
          </p>
          {cefisUrl && (
            <a
              href={cefisUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir no CEFIS
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}
