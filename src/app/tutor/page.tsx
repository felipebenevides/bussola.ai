"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CitationCard } from "@/components/citation-card";

interface Citation {
  courseId: number;
  lessonId: number;
  courseTitle: string;
  lessonTitle: string;
  startSeconds: number;
  endSeconds: number;
  similarity: number;
  deepLink: string;
}

interface SuggestedCourse {
  courseId: number;
  title: string;
  url: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  suggestedCourses?: SuggestedCourse[];
  groundedInCefis?: boolean;
}

const SUGGESTIONS = [
  "Como abrir uma negociação difícil com um cliente?",
  "O que é BATNA e como aplicar em honorários?",
  "Diferença entre posição e interesse em negociação",
  "Como negociar prazo com cliente sem perder valor?",
];

export default function TutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `Erro ${res.status}`);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.text,
          citations: json.citations ?? [],
          suggestedCourses: json.suggestedCourses ?? [],
          groundedInCefis: json.groundedInCefis,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => prev.slice(0, -1)); // remove a pergunta órfã
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-4 sm:p-6">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden>🧭</span>
          <span>Bússola · Tutor</span>
        </Link>
        <nav className="flex gap-2 text-sm">
          <Link href="/plano" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Meu plano
          </Link>
        </nav>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.length === 0 && !loading && (
          <Card className="border-dashed">
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Pergunte qualquer coisa sobre <strong>negociação</strong>. Vou responder usando o
                catálogo CEFIS e, quando der, abrir o vídeo da aula no segundo exato.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((m, i) => (
          <MessageBlock key={i} message={m} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
            Pensando…
          </div>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div ref={scrollRef} />
      </section>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 mt-4 flex gap-2 border-t border-zinc-200 bg-zinc-50 pt-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sua pergunta sobre negociação…"
          disabled={loading}
          className="flex h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <Button type="submit" disabled={loading || input.trim().length === 0} size="lg">
          Perguntar
        </Button>
      </form>
    </main>
  );
}

function MessageBlock({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-zinc-200 bg-white p-4 text-sm leading-relaxed shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {message.groundedInCefis === false && (
          <p className="mt-2 text-xs italic text-zinc-500">
            (Resposta sem base nas transcrições — conhecimento geral)
          </p>
        )}
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Embasado em {message.citations.length} aula
            {message.citations.length > 1 ? "s" : ""} da CEFIS
          </p>
          {message.citations.map((c, i) => (
            <CitationCard
              key={`${c.lessonId}-${i}`}
              courseTitle={c.courseTitle}
              lessonTitle={c.lessonTitle}
              startSeconds={c.startSeconds}
              similarity={c.similarity}
              deepLink={c.deepLink}
            />
          ))}
        </div>
      )}

      {message.suggestedCourses && message.suggestedCourses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Cursos relacionados
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {message.suggestedCourses.map((s) => (
              <a
                key={s.courseId}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                📚 {s.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
