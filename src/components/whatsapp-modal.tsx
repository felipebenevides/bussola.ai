"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, X } from "lucide-react";
import { formatPhoneBR } from "@/lib/phone";

interface WhatsappModalProps {
  open: boolean;
  onClose: () => void;
  /** Status do usuário, vindo do server */
  isLoggedIn: boolean;
  /** Telefone do user salvo no onboarding (E.164 sem +, ou null) */
  userPhone: string | null;
  /** Nome curto do usuário (vindo do CEFIS) — usado na saudação do convite */
  firstName?: string | null;
}

type InviteState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

export function WhatsappModal({
  open,
  onClose,
  isLoggedIn,
  userPhone,
  firstName,
}: WhatsappModalProps) {
  const [invite, setInvite] = useState<InviteState>({ status: "idle" });

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Trava scroll do body
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reseta estado quando o modal fecha. setInvite aqui é a sincronização
  // legítima entre o prop externo `open` e o estado interno do invite.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvite({ status: "idle" });
    }
  }, [open]);

  if (!open) return null;

  async function handleInvite() {
    if (!userPhone) return;
    setInvite({ status: "sending" });
    try {
      const res = await fetch("/api/whatsapp/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userPhone, name: firstName ?? null }),
      });
      if (res.status === 429) {
        setInvite({
          status: "error",
          message: "Já mandei convites demais pra esse número — tenta de novo em ~15 min.",
        });
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setInvite({
          status: "error",
          message: data.error ?? `Não consegui enviar agora (status ${res.status}).`,
        });
        return;
      }
      setInvite({ status: "sent" });
    } catch (err) {
      setInvite({
        status: "error",
        message: err instanceof Error ? err.message : "Falha de rede.",
      });
    }
  }

  const display = userPhone ? formatPhoneBR(userPhone) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wa-modal-title"
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

        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="wa-modal-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Falar com a Bússola no WhatsApp
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                A tutora responde com o link da aula no segundo certo.
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
          {/* Caso 1: tem telefone salvo → dispara invite */}
          {isLoggedIn && userPhone && (
            <>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Vamos te chamar em
                </div>
                <div className="mt-0.5 font-mono text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {display}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  Esse é o número que você salvou no onboarding. Pra trocar, atualize seu cadastro.
                </div>
              </div>

              {invite.status === "sent" ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Mensagem enviada!</div>
                    <div className="text-xs opacity-80">
                      Abre seu WhatsApp — a Bússola já mandou o oi.
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={invite.status === "sending"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {invite.status === "sending" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      Receber mensagem agora
                    </>
                  )}
                </button>
              )}

              {invite.status === "error" && (
                <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {invite.message}
                </p>
              )}
            </>
          )}

          {/* Caso 2: logado mas sem telefone → manda completar onboarding */}
          {isLoggedIn && !userPhone && (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="font-semibold">Falta seu WhatsApp no cadastro.</div>
                <p className="mt-1 leading-snug opacity-90">
                  Completa o onboarding rapinho — eu salvo seu número e a partir daí é
                  um clique pra trocar ideia pelo zap.
                </p>
              </div>
              <Link
                href="/onboarding"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
              >
                Completar cadastro
              </Link>
            </div>
          )}

          {/* Caso 3: anônimo → manda fazer login */}
          {!isLoggedIn && (
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Entre com sua conta CEFIS pra ativar o WhatsApp.
                </div>
                <p className="mt-1 leading-snug opacity-90">
                  Depois do login você faz um onboarding de 2 minutos onde a gente salva
                  seu número — a Bússola te chama daí.
                </p>
              </div>
              <Link
                href="/login"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
              >
                Entrar com CEFIS
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
