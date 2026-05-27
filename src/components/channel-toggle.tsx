"use client";

import { useState } from "react";
import { CheckCircle2, Globe, Loader2, MessageCircle, Send } from "lucide-react";

type SendState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

/**
 * Toggle visual que mostra "Você está no APP" e oferece switch para WhatsApp.
 *
 * Modo preferido (userPhone presente): POST /api/whatsapp/invite com mensagem
 * customizada → bot Evolution manda direto pro WhatsApp do aluno. Não abre
 * janela externa, não depende do aluno ter o app instalado, não corre risco
 * de o número escolhido pelo WhatsApp ser diferente do cadastrado.
 *
 * Fallback (sem userPhone, ex: anônimo): abre wa.me/{botPhone}?text=... no
 * WhatsApp Web/app instalado.
 */
export function ChannelToggle({
  botPhone,
  userPhone,
  whatsappText,
  size = "default",
  label = "Continuar no",
}: {
  /** Telefone do bot da Bússola — usado no fallback wa.me */
  botPhone: string | null;
  /** Telefone do aluno (E.164 sem +). Quando presente, envia via Evolution */
  userPhone?: string | null;
  /** Texto da mensagem (será o body do invite ou query do wa.me) */
  whatsappText: string;
  size?: "default" | "compact";
  label?: string;
}) {
  const compact = size === "compact";
  const [state, setState] = useState<SendState>({ status: "idle" });

  if (!botPhone && !userPhone) return null;

  const canSendViaApi = !!userPhone;
  const cleanBot = botPhone ? botPhone.replace(/\D/g, "") : "";
  const fallbackHref = `https://wa.me/${cleanBot}?text=${encodeURIComponent(whatsappText)}`;

  async function handleSendViaApi() {
    if (!userPhone) return;
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/whatsapp/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userPhone, text: whatsappText }),
      });
      if (res.status === 429) {
        setState({
          status: "error",
          message: "Já mandei mensagens demais para esse número agora — tente em ~15 min.",
        });
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ status: "error", message: j.error ?? `Erro ${res.status}.` });
        return;
      }
      setState({ status: "sent" });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Falha de rede.",
      });
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
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

        {/* Lado APP — estado atual */}
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
        {canSendViaApi ? (
          <button
            type="button"
            onClick={handleSendViaApi}
            disabled={state.status === "sending" || state.status === "sent"}
            className={`inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70 ${
              compact ? "h-6" : "h-7"
            }`}
            title="Receber esse conteúdo no seu WhatsApp (a Bússola te envia)"
          >
            {state.status === "sending" ? (
              <Loader2 className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"} animate-spin`} />
            ) : state.status === "sent" ? (
              <CheckCircle2 className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
            ) : (
              <Send className={`${compact ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
            )}
            {state.status === "sent" ? "Enviado!" : "WhatsApp"}
          </button>
        ) : (
          <a
            href={fallbackHref}
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
        )}
      </div>

      {state.status === "sent" && (
        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          ✓ Veja a mensagem no seu WhatsApp em alguns segundos
        </span>
      )}
      {state.status === "error" && (
        <span className="text-[10px] font-medium text-red-700 dark:text-red-400">
          {state.message}
        </span>
      )}
    </div>
  );
}
