"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

interface InstallCtaProps {
  variant?: "primary" | "ghost";
  className?: string;
}

/**
 * CTA único que faz a coisa certa por plataforma:
 * - Android/Chrome com suporte: dispara prompt nativo
 * - iOS: abre modal com tutorial visual passo-a-passo
 * - Já instalado: mostra "Instalado ✓" e some
 * - Desktop: oferece o tutorial iOS-like como fallback
 */
export function InstallCta({ variant = "primary", className = "" }: InstallCtaProps) {
  const { platform, canInstall, installed, install } = useInstallPrompt();
  const [showTutorial, setShowTutorial] = useState(false);
  const [busy, setBusy] = useState(false);

  if (installed) {
    return (
      <span
        className={`inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 ${className}`}
      >
        <CheckCircle2 className="h-4 w-4" />
        App instalado
      </span>
    );
  }

  const primaryClass =
    "inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-500";
  const ghostClass =
    "inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-900";
  const btnClass = variant === "primary" ? primaryClass : ghostClass;

  async function handleAndroidInstall() {
    setBusy(true);
    try {
      await install();
    } finally {
      setBusy(false);
    }
  }

  // Android com suporte ao prompt nativo
  if (canInstall) {
    return (
      <button
        type="button"
        onClick={handleAndroidInstall}
        disabled={busy}
        className={`${btnClass} disabled:opacity-60 ${className}`}
      >
        <Download className="h-4 w-4" />
        {busy ? "Abrindo instalação…" : "Instalar app"}
      </button>
    );
  }

  // iOS sempre cai aqui (não tem prompt nativo).
  // Android sem suporte (visitou pela primeira vez sem cumprir heurística do Chrome) também vê o tutorial.
  return (
    <>
      <button
        type="button"
        onClick={() => setShowTutorial(true)}
        className={`${btnClass} ${className}`}
      >
        <Smartphone className="h-4 w-4" />
        {platform === "ios" ? "Instalar no iPhone" : "Como instalar"}
      </button>
      <InstallTutorialModal
        open={showTutorial}
        platform={platform}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Modal de tutorial
// ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  platform: "android" | "ios" | "desktop" | "other";
  onClose: () => void;
}

function InstallTutorialModal({ open, platform, onClose }: ModalProps) {
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

  const isIOS = platform === "ios";
  const title = isIOS ? "Instalar a Bússola no seu iPhone" : "Instalar a Bússola";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl shadow-md">
              🧭
            </span>
            <div>
              <h2
                id="install-modal-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                {title}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isIOS
                  ? "É super rápido — 3 toques e você ganha um ícone fixo na tela inicial."
                  : "Abra esta página no navegador do seu celular (Chrome no Android, Safari no iPhone) e siga as instruções."}
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

        <ol className="space-y-3 px-5 pb-3 pt-4">
          <Step
            number={1}
            icon={<IOSShareGlyph />}
            title={isIOS ? "Toque no botão de compartilhar do Safari" : "Abra o menu do navegador"}
            tip={
              isIOS
                ? "É o quadradinho com a seta para cima — fica embaixo no iPhone."
                : "No Chrome do Android é o menu de três pontos no canto superior direito."
            }
          />
          <Step
            number={2}
            icon={<AddToHomeGlyph />}
            title={
              isIOS
                ? '"Adicionar à Tela de Início"'
                : '"Instalar app" ou "Adicionar à tela inicial"'
            }
            tip={
              isIOS
                ? "Role um pouco a lista de opções até encontrar essa linha."
                : "Toque nessa opção. Pode ter o ícone da Bússola do lado."
            }
          />
          <Step
            number={3}
            icon={<ConfirmGlyph />}
            title={isIOS ? 'Toque em "Adicionar"' : "Confirme a instalação"}
            tip={
              isIOS
                ? 'Fica no canto superior direito. Pronto — o ícone "🧭 Bússola" aparece na sua tela junto com os outros apps.'
                : "O ícone vai aparecer na sua tela inicial igual a um app normal. Pode fechar o navegador depois."
            }
          />
        </ol>

        <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
          {isIOS ? (
            <>
              <strong className="text-zinc-700 dark:text-zinc-200">Importante:</strong> só
              funciona no <strong>Safari</strong> — se você está no Chrome ou Firefox do
              iPhone, abre essa página no Safari primeiro.
            </>
          ) : (
            <>
              Se a opção não aparecer, sua versão do navegador pode ser antiga. Atualize-o ou
              tente em outro navegador.
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  tip,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  tip: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="relative shrink-0">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          {icon}
        </span>
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white shadow-md">
          {number}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
        <p className="mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">{tip}</p>
      </div>
    </li>
  );
}

// ─── Ícones desenhados pra parecer com o iOS Safari ───────────────

function IOSShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6 text-sky-500">
      <path d="M12 3 L12 15" strokeLinecap="round" />
      <path d="M8 7 L12 3 L16 7" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 11 L6 19 A2 2 0 0 0 8 21 L16 21 A2 2 0 0 0 18 19 L18 11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddToHomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6 text-emerald-600">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8 L12 16" strokeLinecap="round" />
      <path d="M8 12 L16 12" strokeLinecap="round" />
    </svg>
  );
}

function ConfirmGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6 text-violet-600">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 L11 15.5 L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
