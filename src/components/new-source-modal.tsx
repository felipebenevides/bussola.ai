"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  FileText,
  Loader2,
  Upload,
  Wrench,
  X,
  Video,
} from "lucide-react";

type View = "menu" | "pdf" | "youtube";

interface NewSourceModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Disparado quando o usuário escolhe "Curso CEFIS" — caller decide
   * o que fazer (no /tutor abre agente in-chat; no /plano navega pra
   * /tutor?source=cefis).
   */
  onCefis: () => void;
}

export function NewSourceModal({ open, onClose, onCefis }: NewSourceModalProps) {
  const [view, setView] = useState<View>("menu");

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView("menu");
    }
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-source-title"
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
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-violet-500 to-rose-500" />

        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            {view !== "menu" && (
              <button
                type="button"
                onClick={() => setView("menu")}
                className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2
                id="new-source-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {view === "menu" && "Nova fonte de estudo"}
                {view === "pdf" && "Subir PDF"}
                {view === "youtube" && "Importar do YouTube"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {view === "menu"
                  ? "Escolha de onde vem o conteúdo que a Bússola vai estudar com você."
                  : "Simulação — vai funcionar de verdade em breve."}
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
        </header>

        {/* Banner permanente "em construção" pras opções mock */}
        {view !== "menu" && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="leading-snug">
              <strong>Esta etapa está em construção.</strong> O fluxo aqui é apenas uma
              simulação visual do que vai chegar — nada é processado de verdade. Por
              enquanto, só <strong>cursos CEFIS</strong> são indexados.
            </p>
          </div>
        )}

        {view === "menu" && <MenuView onPick={setView} onCefis={onCefis} />}
        {view === "pdf" && <PdfMockView onClose={onClose} />}
        {view === "youtube" && <YoutubeMockView onClose={onClose} />}
      </div>
    </div>
  );
}

// ─── Menu ────────────────────────────────────────────────────────

function MenuView({
  onPick,
  onCefis,
}: {
  onPick: (v: View) => void;
  onCefis: () => void;
}) {
  return (
    <div className="space-y-2.5 px-5 pb-5 pt-4">
      <SourceCard
        icon={<BookOpen className="h-5 w-5" />}
        accent="from-emerald-400 to-emerald-600"
        title="Curso CEFIS"
        text="Indexa um curso do catálogo CEFIS — aulas, transcrições e timestamps. O agente cuida do resto."
        tag="Disponível agora"
        tagAccent="emerald"
        onClick={onCefis}
      />
      <SourceCard
        icon={<FileText className="h-5 w-5" />}
        accent="from-violet-500 to-fuchsia-600"
        title="PDF"
        text="Suba um PDF (apostila, livro, artigo). A Bússola vai extrair o conteúdo, gerar resumos e citar trechos."
        tag="Em construção"
        tagAccent="amber"
        onClick={() => onPick("pdf")}
      />
      <SourceCard
        icon={<Video className="h-5 w-5" />}
        accent="from-rose-500 to-red-600"
        title="YouTube"
        text="Cole o link de um vídeo ou playlist. Transcrevemos e tratamos como se fosse aula do catálogo."
        tag="Em construção"
        tagAccent="amber"
        onClick={() => onPick("youtube")}
      />
    </div>
  );
}

function SourceCard({
  icon,
  accent,
  title,
  text,
  tag,
  tagAccent,
  onClick,
}: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  text: string;
  tag: string;
  tagAccent: "emerald" | "amber";
  onClick: () => void;
}) {
  const tagClasses =
    tagAccent === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <span
            className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${tagClasses}`}
          >
            {tag}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">{text}</p>
      </div>
    </button>
  );
}

// ─── PDF mock ────────────────────────────────────────────────────

function PdfMockView({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<"idle" | "processing" | "done">("idle");
  const [filename, setFilename] = useState<string | null>(null);

  function pickFile() {
    // Mock — simula seleção
    setFilename("apostila-negociacao-modulo-3.pdf");
  }

  function startProcessing() {
    setStage("processing");
    setTimeout(() => setStage("done"), 2200);
  }

  return (
    <div className="space-y-3 px-5 pb-5 pt-3">
      {stage === "idle" && (
        <>
          <button
            type="button"
            onClick={pickFile}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/40 px-4 py-8 transition-colors hover:border-violet-400 hover:bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/20 dark:hover:border-violet-700 dark:hover:bg-violet-950/40"
          >
            <Upload className="h-7 w-7 text-violet-500 dark:text-violet-400" />
            <div className="text-center">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {filename ? "Trocar arquivo" : "Arraste o PDF ou clique pra escolher"}
              </div>
              <div className="text-[11px] text-zinc-500">
                {filename ? filename : "Máximo 50 MB (simulação)"}
              </div>
            </div>
          </button>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
              Como devo chamar essa fonte?
            </label>
            <input
              type="text"
              defaultValue="Apostila de Negociação · Módulo 3"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <button
            type="button"
            onClick={startProcessing}
            disabled={!filename}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Processar PDF (simulação)
          </button>
        </>
      )}

      {stage === "processing" && (
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/60 dark:bg-violet-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-800 dark:text-violet-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Extraindo e indexando…
          </div>
          <ul className="space-y-1.5 text-xs text-violet-900/80 dark:text-violet-200/80">
            <li>✓ Upload concluído (fake)</li>
            <li>✓ 47 páginas detectadas (fake)</li>
            <li className="animate-pulse">… Gerando embeddings dos parágrafos (fake)</li>
            <li className="opacity-50">… Criando deep-links por trecho (em breve)</li>
          </ul>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            <Check className="h-4 w-4" />
            Pronto — visualmente.
          </div>
          <p className="text-xs leading-snug text-emerald-900/80 dark:text-emerald-200/80">
            Esse foi um passeio simulado pelo fluxo. Quando o backend de PDFs estiver de
            pé, esse mesmo botão vai indexar o arquivo de verdade, e ele aparece como
            fonte na sidebar igual aos cursos CEFIS.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── YouTube mock ─────────────────────────────────────────────────

function YoutubeMockView({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<"idle" | "processing" | "done">("idle");
  const isPlaylist = /[?&]list=/.test(url);
  const isVideo = /(?:youtu\.be\/|v=)[\w-]{6,}/.test(url);
  const valid = isPlaylist || isVideo;

  function start() {
    if (!valid) return;
    setStage("processing");
    setTimeout(() => setStage("done"), 2400);
  }

  return (
    <div className="space-y-3 px-5 pb-5 pt-3">
      {stage === "idle" && (
        <>
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
              Link do YouTube (vídeo ou playlist)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… ou /playlist?list=…"
              className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            />
            <p className="mt-1.5 text-[10px] text-zinc-500">
              {valid
                ? isPlaylist
                  ? "Playlist detectada — vamos transcrever cada vídeo."
                  : "Vídeo detectado — vamos transcrever e fatiar em trechos."
                : "Cole um link válido pra continuar."}
            </p>
          </div>

          <button
            type="button"
            onClick={start}
            disabled={!valid}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Video className="h-4 w-4" />
            Indexar do YouTube (simulação)
          </button>
        </>
      )}

      {stage === "processing" && (
        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcrevendo…
          </div>
          <ul className="space-y-1.5 text-xs text-rose-900/80 dark:text-rose-200/80">
            <li>✓ Link validado (fake)</li>
            <li>✓ Áudio baixado · 32min (fake)</li>
            <li className="animate-pulse">… Transcrição com Whisper (fake)</li>
            <li className="opacity-50">… Indexando trechos com timestamp (em breve)</li>
          </ul>
        </div>
      )}

      {stage === "done" && (
        <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            <Check className="h-4 w-4" />
            Pronto — visualmente.
          </div>
          <p className="text-xs leading-snug text-emerald-900/80 dark:text-emerald-200/80">
            Simulação completa. Quando o backend de YouTube estiver de pé, esse fluxo vai
            transcrever de verdade e abrir cada citação no segundo certo — igual aos
            cursos CEFIS.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
