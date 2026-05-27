"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { formatPhoneBR } from "@/lib/phone";

interface WhatsappModalProps {
  open: boolean;
  onClose: () => void;
  /** Status do usuário, vindo do server */
  isLoggedIn: boolean;
  /** Telefone do user salvo no onboarding (E.164 sem +, ou null) — usado pra invite direto após pareamento */
  userPhone: string | null;
  /** Nome curto do usuário (vindo do CEFIS) — usado na saudação do convite */
  firstName?: string | null;
}

type LinkStatus =
  | { phase: "loading" }
  | { phase: "paired"; phone: string }
  | { phase: "otp"; code: string; botPhone: string; expiresAt: string }
  | { phase: "linked-now"; phone: string }
  | { phase: "error"; message: string };

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
  const [link, setLink] = useState<LinkStatus>({ phase: "loading" });
  const [invite, setInvite] = useState<InviteState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Helpers ──────────────────────────────────────────────────
  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const generateOtp = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/link", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setLink({ phase: "error", message: json.error ?? `Erro ${res.status}` });
        return;
      }
      setLink({
        phase: "otp",
        code: json.code,
        botPhone: json.botPhone,
        expiresAt: json.expiresAt,
      });
    } catch (err) {
      setLink({
        phase: "error",
        message: err instanceof Error ? err.message : "Falha de rede.",
      });
    }
  }, []);

  // Bootstrap: verifica status de pareamento → se já vinculado, mostra
  // estado "paired"; caso contrário, gera OTP e começa polling.
  useEffect(() => {
    if (!open || !isLoggedIn) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLink({ phase: "loading" });

    (async () => {
      try {
        const res = await fetch("/api/whatsapp/link/status");
        const json = (await res.json()) as { paired: boolean; phone: string | null };
        if (cancelled) return;
        if (json.paired && json.phone) {
          setLink({ phase: "paired", phone: json.phone });
          return;
        }
        // Não pareado — gera OTP
        await generateOtp();
      } catch {
        if (!cancelled) {
          setLink({ phase: "error", message: "Não consegui consultar o status." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isLoggedIn, generateOtp]);

  // Polling enquanto OTP estiver visível — detecta pareamento e troca pra "linked-now"
  useEffect(() => {
    if (!open) {
      clearPoll();
      return;
    }
    if (link.phase !== "otp") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/whatsapp/link/status");
        const json = (await res.json()) as { paired: boolean; phone: string | null };
        if (json.paired && json.phone) {
          setLink({ phase: "linked-now", phone: json.phone });
          clearPoll();
        }
      } catch {
        /* silencioso — tenta de novo no próximo tick */
      }
    }, 3000);
    return clearPoll;
  }, [open, link.phase, clearPoll]);

  // ESC fecha + cleanup
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

  // Reseta estado ao fechar — sync legítimo entre prop externo `open` e
  // state interno do modal.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      setLink({ phase: "loading" });
      setInvite({ status: "idle" });
      setCopied(false);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sem permissão de clipboard — ignora */
    }
  }

  async function handleInvite(phoneToUse: string) {
    setInvite({ status: "sending" });
    try {
      const res = await fetch("/api/whatsapp/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToUse, name: firstName ?? null }),
      });
      if (res.status === 429) {
        setInvite({
          status: "error",
          message: "Já mandei convites demais — tenta de novo em ~15 min.",
        });
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setInvite({
          status: "error",
          message: data.error ?? `Não consegui enviar (status ${res.status}).`,
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

  if (!open) return null;

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

        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="wa-modal-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Conectar com a Bússola no WhatsApp
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
        </header>

        <div className="space-y-4 px-5 pb-5 pt-4">
          {/* Anônimo → login */}
          {!isLoggedIn && (
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Entre com sua conta CEFIS pra ativar o WhatsApp.
                </div>
                <p className="mt-1 leading-snug opacity-90">
                  Por segurança, o pareamento por código só funciona após login. Depois você
                  vincula seu zap em 30 segundos.
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

          {/* Logado: estados do link */}
          {isLoggedIn && link.phase === "loading" && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando vínculo…
            </div>
          )}

          {isLoggedIn && link.phase === "otp" && (
            <OtpView
              code={link.code}
              botPhone={link.botPhone}
              expiresAt={link.expiresAt}
              copied={copied}
              onCopy={() => copyCode(link.code)}
              onRefresh={generateOtp}
            />
          )}

          {isLoggedIn && link.phase === "linked-now" && (
            <LinkedNowView phone={link.phone} />
          )}

          {isLoggedIn && link.phase === "paired" && (
            <PairedView
              phone={link.phone}
              userPhone={userPhone}
              firstName={firstName}
              invite={invite}
              onInvite={() => handleInvite(link.phone)}
              onRegenerate={generateOtp}
            />
          )}

          {isLoggedIn && link.phase === "error" && (
            <div className="space-y-3">
              <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {link.message}
              </p>
              <button
                type="button"
                onClick={generateOtp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
              >
                <RefreshCw className="h-4 w-4" />
                Tentar de novo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OTP view ────────────────────────────────────────────────────

function OtpView({
  code,
  botPhone,
  expiresAt,
  copied,
  onCopy,
  onRefresh,
}: {
  code: string;
  botPhone: string;
  expiresAt: string;
  copied: boolean;
  onCopy: () => void;
  onRefresh: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );
  useEffect(() => {
    const tick = () => {
      const left = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, left));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const expired = secondsLeft <= 0;
  const mm = Math.floor(secondsLeft / 60);
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          Seu código de pareamento
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-3xl font-bold tracking-[0.3em] text-zinc-900 dark:text-zinc-50">
            {code}
          </span>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {expired ? (
            <span className="text-red-600 dark:text-red-400">
              Expirou — gere outro código abaixo.
            </span>
          ) : (
            <>
              Válido por <span className="font-mono font-semibold">{mm}:{ss}</span>
            </>
          )}
        </div>
      </div>

      <ol className="space-y-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
            1
          </span>
          <span>
            Abra o WhatsApp do seu celular e envie o código acima para o número da Bússola:
          </span>
        </li>
        <li className="ml-7">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono text-sm font-bold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            {formatPhoneBR(botPhone)}
          </div>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
            2
          </span>
          <span>
            Pronto. A Bússola responde aqui no app assim que detectar — você pode fechar esse
            modal depois.
          </span>
        </li>
      </ol>

      <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Aguardando vínculo…
      </div>

      {expired && (
        <button
          type="button"
          onClick={onRefresh}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500"
        >
          <RefreshCw className="h-4 w-4" />
          Gerar novo código
        </button>
      )}
    </>
  );
}

function LinkedNowView({ phone }: { phone: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <div>
          <div className="font-semibold">Vinculado!</div>
          <div className="text-xs opacity-80">
            <span className="font-mono">{formatPhoneBR(phone)}</span> agora conversa direto
            com a Bússola.
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-snug text-zinc-500">
        A partir daqui, qualquer dúvida que você mandar no zap volta com o link da aula no
        segundo certo. Pode fechar.
      </p>
    </div>
  );
}

function PairedView({
  phone,
  userPhone,
  firstName,
  invite,
  onInvite,
  onRegenerate,
}: {
  phone: string;
  userPhone: string | null;
  firstName?: string | null;
  invite: InviteState;
  onInvite: () => void;
  onRegenerate: () => void;
}) {
  void userPhone;
  void firstName;
  return (
    <>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Já vinculado
        </div>
        <div className="mt-1 font-mono text-base font-bold text-zinc-900 dark:text-zinc-50">
          {formatPhoneBR(phone)}
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          Esse número está conectado à sua conta CEFIS. Pra trocar, gere um novo código.
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
          onClick={onInvite}
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

      <button
        type="button"
        onClick={onRegenerate}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Trocar de WhatsApp (gerar novo código)
      </button>
    </>
  );
}
