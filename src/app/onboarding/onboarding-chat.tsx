"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface OnboardingChatProps {
  firstName: string | null;
}

export function OnboardingChat({ firstName }: OnboardingChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const kickedOff = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // dispara a primeira pergunta automaticamente ao montar
  useEffect(() => {
    if (kickedOff.current) return;
    kickedOff.current = true;
    void send(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(userText: string | null) {
    setError(null);

    const nextMessages: ChatMessage[] =
      userText === null ? messages : [...messages, { role: "user", content: userText }];
    if (userText !== null) {
      setMessages(nextMessages);
      setInput("");
    }
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);

      setMessages([...nextMessages, { role: "assistant", content: json.message }]);
      if (json.complete) {
        setComplete(true);
        setProfileSaved(!!json.profileSaved);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || loading || complete) return;
    await send(t);
  }

  async function handleGeneratePlan() {
    setGeneratingPlan(true);
    setError(null);
    try {
      const res = await fetch("/api/curator/generate-plan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
      if (json.plan?.id) {
        router.push(`/plano`);
      } else {
        router.push("/plano");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Não consegui gerar o plano: ${msg}`);
      setGeneratingPlan(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {firstName && messages.length === 0 && !loading && (
          <p className="text-sm text-zinc-500">Iniciando conversa com {firstName}…</p>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role}>
            {m.content}
          </MessageBubble>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
            Bússola está digitando…
          </div>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {complete ? (
        <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {profileSaved ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              ✓ Perfil salvo. Pronta para montar seu plano.
            </p>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Perfil capturado mas não consegui persistir no banco. Vamos para o plano mesmo assim.
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
          >
            {generatingPlan ? "Montando seu plano…" : "Gerar meu plano →"}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 mt-4 flex gap-2 border-t border-zinc-200 bg-zinc-50 pt-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sua resposta…"
            disabled={loading}
            autoFocus
            className="flex h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Button type="submit" disabled={loading || input.trim().length === 0} size="lg">
            Enviar
          </Button>
        </form>
      )}
    </section>
  );
}

function MessageBubble({ role, children }: { role: "user" | "assistant"; children: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base dark:bg-emerald-950">
        🧭
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-2 text-sm leading-relaxed shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </div>
  );
}
