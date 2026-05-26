"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

interface WhatsappModalProps {
  open: boolean;
  onClose: () => void;
  botPhone: string | null;
  /** Mensagem padrão (pode usar {phone} como placeholder) */
  greetingTemplate?: string;
}

const DEFAULT_GREETING =
  "Oi! Sou {phone}. Quero conversar com a Bússola sobre os meus cursos CEFIS.";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function formatBotPhoneDisplay(phone: string): string {
  // "5511999999999" → "+55 11 99999-9999"
  const d = digitsOnly(phone);
  if (d.length === 13 && d.startsWith("55")) {
    return `+55 ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  return `+${d}`;
}

function formatUserPhoneDisplay(ddi: string, ddd: string, phone: string): string {
  const p = digitsOnly(phone);
  const middle = p.length >= 9 ? `${p.slice(0, 5)}-${p.slice(5)}` : `${p.slice(0, 4)}-${p.slice(4)}`;
  return `+${ddi} ${ddd} ${middle}`;
}

export function WhatsappModal({
  open,
  onClose,
  botPhone,
  greetingTemplate = DEFAULT_GREETING,
}: WhatsappModalProps) {
  const [ddi, setDdi] = useState("55");
  const [ddd, setDdd] = useState("");
  const [phone, setPhone] = useState("");
  const dddRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // foca o DDD ao abrir
      setTimeout(() => dddRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Trava scroll do body enquanto aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const dddDigits = digitsOnly(ddd);
  const phoneDigits = digitsOnly(phone);
  const ddiDigits = digitsOnly(ddi) || "55";
  const valid =
    dddDigits.length === 2 && phoneDigits.length >= 8 && phoneDigits.length <= 9 && !!botPhone;

  const userDisplay = valid ? formatUserPhoneDisplay(ddiDigits, dddDigits, phoneDigits) : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !botPhone) return;
    const greeting = greetingTemplate.replace("{phone}", userDisplay);
    const url = `https://wa.me/${digitsOnly(botPhone)}?text=${encodeURIComponent(greeting)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

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
        {/* faixa decorativa verde estilo WhatsApp */}
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 pt-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Seu número
            </label>
            <div className="flex items-stretch gap-2">
              <PhoneField
                label="DDI"
                value={ddi}
                onChange={setDdi}
                maxLength={3}
                width="w-16"
                inputMode="numeric"
                prefix="+"
              />
              <PhoneField
                ref={dddRef}
                label="DDD"
                value={ddd}
                onChange={(v) => setDdd(digitsOnly(v).slice(0, 2))}
                maxLength={2}
                width="w-20"
                inputMode="numeric"
                placeholder="11"
              />
              <PhoneField
                label="Número"
                value={phone}
                onChange={(v) => setPhone(digitsOnly(v).slice(0, 9))}
                maxLength={9}
                width="flex-1"
                inputMode="numeric"
                placeholder="99999-9999"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-500">
              Usamos pra te identificar na conversa — fica salvo só na sua sessão de hoje.
            </p>
          </div>

          {!botPhone && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              O canal WhatsApp ainda não foi configurado por este projeto. Avise o admin
              ou siga conversando aqui pela web.
            </div>
          )}

          <button
            type="submit"
            disabled={!valid}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir conversa no WhatsApp
          </button>

          {botPhone && (
            <p className="text-center text-[11px] text-zinc-500">
              Vamos abrir a conversa com{" "}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {formatBotPhoneDisplay(botPhone)}
              </span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

interface PhoneFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  width: string;
  inputMode?: "numeric" | "tel";
  placeholder?: string;
  prefix?: string;
}

const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  { label, value, onChange, maxLength, width, inputMode = "numeric", placeholder, prefix },
  ref
) {
  return (
    <label className={`${width} relative block`}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`h-11 w-full rounded-lg border border-zinc-300 bg-white text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:ring-emerald-900/60 ${prefix ? "pl-6 pr-2" : "px-3"}`}
        />
      </div>
    </label>
  );
});
