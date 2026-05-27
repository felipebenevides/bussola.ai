"use client";

import { Globe, MessageCircle } from "lucide-react";

/**
 * Toggle visual que mostra "Você está no APP" e oferece switch para WhatsApp.
 * Clicando no lado WhatsApp, abre wa.me com mensagem pré-formatada.
 *
 * Reverso (WhatsApp → App): o próprio bot envia link da app nas respostas; este
 * componente cobre só o sentido APP → WhatsApp.
 */
export function ChannelToggle({
  botPhone,
  whatsappText,
  size = "default",
  label = "Continuar no",
}: {
  botPhone: string | null;
  /** Texto que será pré-preenchido no WhatsApp ao clicar */
  whatsappText: string;
  size?: "default" | "compact";
  label?: string;
}) {
  const compact = size === "compact";

  if (!botPhone) {
    return null;
  }

  const cleanPhone = botPhone.replace(/\D/g, "");
  const href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800 ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      role="group"
      aria-label="Trocar de canal"
    >
      {label && !compact && (
        <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
      )}

      {/* Lado APP — estado atual (não clicável) */}
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100 ${
          compact ? "h-6" : "h-7"
        }`}
        title="Você está aqui"
      >
        <Globe className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} text-emerald-500`} />
        App
      </span>

      <span className="text-zinc-400" aria-hidden>
        →
      </span>

      {/* Lado WhatsApp — clicável */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 ${
          compact ? "h-6" : "h-7"
        }`}
        title="Abrir conversa no WhatsApp"
      >
        <MessageCircle className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
        WhatsApp
      </a>
    </div>
  );
}
