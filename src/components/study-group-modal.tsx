"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock, Plus, Trash2, Users, X } from "lucide-react";

interface ExistingGroup {
  id: string;
  group_name: string;
  evolution_group_jid: string | null;
  participants: Array<{ phone: string; name: string | null }>;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Participant {
  ddi: string;
  ddd: string;
  number: string;
  name: string;
}

function digits(s: string) {
  return s.replace(/\D/g, "");
}

function emptyParticipant(): Participant {
  return { ddi: "55", ddd: "", number: "", name: "" };
}

function fullPhone(p: Participant): string | null {
  const ddi = digits(p.ddi);
  const ddd = digits(p.ddd);
  const num = digits(p.number);
  if (!ddi || ddd.length !== 2 || num.length < 8 || num.length > 9) return null;
  return `${ddi}${ddd}${num}`;
}

type CreateState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; jid: string; expiresAt: string }
  | { status: "error"; message: string; needsAuth?: boolean };

export function StudyGroupModal({
  open,
  onClose,
  isLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
}) {
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([emptyParticipant()]);
  const [state, setState] = useState<CreateState>({ status: "idle" });
  const [existing, setExisting] = useState<ExistingGroup | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!isLoggedIn) return;
    setLoadingExisting(true);
    fetch("/api/whatsapp/group")
      .then((r) => r.json())
      .then((j) => setExisting(j.group ?? null))
      .catch(() => setExisting(null))
      .finally(() => setLoadingExisting(false));
  }, [open, isLoggedIn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function addParticipant() {
    if (participants.length >= 5) return;
    setParticipants((p) => [...p, emptyParticipant()]);
  }

  function removeParticipant(i: number) {
    setParticipants((p) => p.filter((_, idx) => idx !== i));
  }

  function updateParticipant(i: number, patch: Partial<Participant>) {
    setParticipants((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  const validParticipants = participants.filter((p) => !!fullPhone(p));
  const canSubmit =
    isLoggedIn &&
    name.trim().length >= 2 &&
    validParticipants.length >= 1 &&
    state.status !== "submitting";

  async function handleCreate() {
    if (!canSubmit) return;
    setState({ status: "submitting" });
    try {
      const res = await fetch("/api/whatsapp/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          participants: validParticipants.map((p) => ({
            phone: fullPhone(p),
            name: p.name.trim() || null,
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.status === 401) {
        setState({
          status: "error",
          message: (json.message as string) ?? "Faça login na CEFIS pra criar um grupo.",
          needsAuth: true,
        });
        return;
      }
      if (res.status === 409) {
        setState({
          status: "error",
          message:
            (json.message as string) ??
            "Você já tem um grupo ativo. Aguarde os 7 dias da demo expirar.",
        });
        return;
      }
      if (!res.ok) {
        setState({
          status: "error",
          message: (json.detail as string) ?? (json.error as string) ?? `Erro ${res.status}.`,
        });
        return;
      }
      setState({
        status: "success",
        jid: (json.jid as string) ?? "",
        expiresAt: (json.expiresAt as string) ?? "",
      });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Falha de rede.",
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-modal-title"
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
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-fuchsia-500 to-emerald-500" />

        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="group-modal-title"
                className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                Plano Empresarial
                <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Exclusivo · 7 dias
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Crie um grupo no WhatsApp com até 5 colegas — a tutora responde dentro do
                grupo.
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
          {!isLoggedIn && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Esse recurso é exclusivo de alunos logados na CEFIS. Faça login em{" "}
                <a href="/login" className="font-semibold underline-offset-2 hover:underline">
                  /login
                </a>{" "}
                pra criar seu grupo de estudo.
              </span>
            </div>
          )}

          {state.status === "success" ? (
            <SuccessPanel jid={state.jid} expiresAt={state.expiresAt} onClose={onClose} />
          ) : existing ? (
            <ExistingPanel group={existing} onClose={onClose} />
          ) : loadingExisting && isLoggedIn ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Nome do grupo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Turma da OAB — Negociação"
                  className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:ring-violet-900/60"
                  disabled={!isLoggedIn}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Participantes ({validParticipants.length}/5)
                  </label>
                  {participants.length < 5 && (
                    <button
                      type="button"
                      onClick={addParticipant}
                      disabled={!isLoggedIn}
                      className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-200 disabled:opacity-50 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/60"
                    >
                      <Plus className="h-3 w-3" /> Adicionar
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {participants.map((p, i) => (
                    <ParticipantRow
                      key={i}
                      value={p}
                      onChange={(patch) => updateParticipant(i, patch)}
                      onRemove={participants.length > 1 ? () => removeParticipant(i) : undefined}
                      disabled={!isLoggedIn}
                    />
                  ))}
                </div>
              </div>

              {state.status === "error" && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {state.message}
                  {state.needsAuth && (
                    <>
                      {" "}
                      <a href="/login" className="font-semibold underline">
                        Fazer login
                      </a>
                    </>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-400 disabled:text-zinc-600 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 dark:disabled:text-zinc-500"
              >
                {state.status === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Criar grupo no WhatsApp
              </button>

              <p className="text-center text-[10px] text-zinc-500">
                A Bússola entra no grupo como tutora. Validade da demo: 7 dias.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({
  value,
  onChange,
  onRemove,
  disabled,
}: {
  value: Participant;
  onChange: (patch: Partial<Participant>) => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Nome (opcional)"
        disabled={disabled}
        className="h-10 w-32 shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
      />
      <input
        type="text"
        inputMode="numeric"
        value={value.ddd}
        onChange={(e) => onChange({ ddd: digits(e.target.value).slice(0, 2) })}
        maxLength={2}
        placeholder="11"
        disabled={disabled}
        className="h-10 w-12 shrink-0 rounded-lg border border-zinc-300 bg-white px-2 text-center text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <input
        type="text"
        inputMode="numeric"
        value={value.number}
        onChange={(e) => onChange({ number: digits(e.target.value).slice(0, 9) })}
        maxLength={9}
        placeholder="99999-9999"
        disabled={disabled}
        className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-mono text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remover"
          className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SuccessPanel({
  jid,
  expiresAt,
  onClose,
}: {
  jid: string;
  expiresAt: string;
  onClose: () => void;
}) {
  const expiresFmt = new Date(expiresAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="space-y-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5" />
        <strong>Grupo criado!</strong>
      </div>
      <p>
        Já mandei a mensagem de boas-vindas no grupo. Os participantes recebem o convite no
        WhatsApp.
      </p>
      <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs dark:border-emerald-900/60 dark:bg-zinc-900">
        <div className="text-zinc-500">JID:</div>
        <div className="break-all font-mono text-zinc-800 dark:text-zinc-200">{jid}</div>
      </div>
      <p className="text-xs">⏳ Expira em {expiresFmt}.</p>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Fechar
      </button>
    </div>
  );
}

function ExistingPanel({ group, onClose }: { group: ExistingGroup; onClose: () => void }) {
  const expiresFmt = new Date(group.expires_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
  const remainingMs = new Date(group.expires_at).getTime() - Date.now();
  const days = Math.max(0, Math.floor(remainingMs / (24 * 60 * 60 * 1000)));
  return (
    <div className="space-y-3 rounded-xl border border-violet-300 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <strong>Você já tem um grupo ativo</strong>
      </div>
      <p>
        <span className="font-semibold">"{group.group_name}"</span> · {group.participants.length}{" "}
        participantes · expira em {days} {days === 1 ? "dia" : "dias"} ({expiresFmt}).
      </p>
      <p className="text-xs">
        Só é possível ter 1 grupo ativo por aluno no plano demo. Espere a validade encerrar pra
        criar outro.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
      >
        Fechar
      </button>
    </div>
  );
}
