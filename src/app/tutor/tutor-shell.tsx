"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCheck,
  Hash,
  Library,
  Loader2,
  Menu,
  MessageSquarePlus,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type {
  AvailableCourse,
  CoursesResponse,
  IndexedCourse,
} from "@/app/api/courses/route";

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
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  suggestedCourses?: SuggestedCourse[];
  groundedInCefis?: boolean;
  time: string;
}

interface OnboardingState {
  active: boolean;
  messages: Array<{ role: "user" | "assistant"; content: string; time: string }>;
  candidateCourseId: number | null;
  ingesting: boolean;
  ingestLog: string[];
}

const SUGGESTIONS = [
  "Como abrir uma negociação difícil?",
  "O que é BATNA?",
  "Diferença entre posição e interesse",
  "Como negociar honorários sem perder valor?",
];

function nowTime() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

export function TutorShell({
  isLoggedIn,
  firstName,
}: {
  isLoggedIn: boolean;
  firstName: string | null;
}) {
  const [courses, setCourses] = useState<CoursesResponse>({ indexed: [], available: [] });
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // selectedCourseId: null = todos os cursos, número = curso específico
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [onboarding, setOnboarding] = useState<OnboardingState>({
    active: false,
    messages: [],
    candidateCourseId: null,
    ingesting: false,
    ingestLog: [],
  });

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Carrega cursos
  async function refreshCourses() {
    try {
      setCoursesError(null);
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data = (await res.json()) as CoursesResponse;
      setCourses(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setCoursesError(msg);
    } finally {
      setCoursesLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCourses();
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, onboarding.messages, onboarding.ingestLog]);

  const selectedCourse = useMemo<IndexedCourse | null>(() => {
    if (selectedCourseId == null) return null;
    return courses.indexed.find((c) => c.id === selectedCourseId) ?? null;
  }, [selectedCourseId, courses.indexed]);

  const filteredIndexed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses.indexed;
    return courses.indexed.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q) ||
        (c.teacher ?? "").toLowerCase().includes(q)
    );
  }, [courses.indexed, search]);

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses.available;
    return courses.available.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle ?? "").toLowerCase().includes(q)
    );
  }, [courses.available, search]);

  // ─── Envio de pergunta ──────────────────────────────────────────
  async function send(message: string) {
    const text = message.trim();
    if (!text || loading) return;
    setError(null);
    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      time: nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          courseId: selectedCourseId,
          courseTitle: selectedCourse?.title ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: json.text,
          citations: json.citations ?? [],
          suggestedCourses: json.suggestedCourses ?? [],
          groundedInCefis: json.groundedInCefis,
          time: nowTime(),
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function selectCourse(id: number | null) {
    setSelectedCourseId(id);
    setMobileSidebarOpen(false);
    setOnboarding((s) => ({ ...s, active: false }));
    // mantém histórico de mensagens para continuidade visual
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // ─── Onboarding de indexação ────────────────────────────────────
  function openOnboarding() {
    setMobileSidebarOpen(false);
    setOnboarding({
      active: true,
      candidateCourseId: null,
      ingesting: false,
      ingestLog: [],
      messages: [
        {
          role: "assistant",
          content:
            (firstName ? `Beleza ${firstName}! ` : "Beleza! ") +
            "Pra indexar um curso CEFIS eu preciso só do **ID do curso** — manda o número (ex: `1132`) ou o link `https://cefis.com.br/curso/1132`. Depois eu cuido do resto: aulas, transcrições e embeddings.",
          time: nowTime(),
        },
      ],
    });
  }

  function appendOnboarding(role: "user" | "assistant", content: string) {
    setOnboarding((s) => ({
      ...s,
      messages: [...s.messages, { role, content, time: nowTime() }],
    }));
  }

  function appendIngestLog(line: string) {
    setOnboarding((s) => ({ ...s, ingestLog: [...s.ingestLog, line] }));
  }

  function parseCourseId(text: string): number | null {
    const direct = text.trim().match(/^\d{1,8}$/);
    if (direct) return parseInt(direct[0], 10);
    const url = text.match(/cefis\.com\.br\/curso\/(\d+)/i);
    if (url) return parseInt(url[1], 10);
    const tail = text.match(/(\d{2,8})(?!\d)/);
    if (tail) return parseInt(tail[1], 10);
    return null;
  }

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || onboarding.ingesting) return;
    setInput("");
    appendOnboarding("user", text);

    const id = parseCourseId(text);
    if (!id) {
      appendOnboarding(
        "assistant",
        "Não achei um ID válido aí. Manda só o número do curso (ex: `1132`) ou o link completo."
      );
      return;
    }

    const alreadyIndexed = courses.indexed.find((c) => c.id === id);
    if (alreadyIndexed) {
      appendOnboarding(
        "assistant",
        `O curso **${alreadyIndexed.title}** (#${id}) já está indexado. Quer abrir ele direto?`
      );
      setOnboarding((s) => ({ ...s, candidateCourseId: id }));
      return;
    }

    const sampleMatch = courses.available.find((c) => c.id === id);
    if (!sampleMatch) {
      const sample = courses.available.map((c) => c.id).join(", ");
      appendOnboarding(
        "assistant",
        `Esse curso não está no sample local pra essa demo. Cursos disponíveis: ${
          sample || "(nenhum — todos já indexados)"
        }`
      );
      return;
    }

    appendOnboarding(
      "assistant",
      `Achei: **${sampleMatch.title}** — ${sampleMatch.lessonCount} aula${
        sampleMatch.lessonCount > 1 ? "s" : ""
      }${
        sampleMatch.lessonsWithVtt > 0
          ? `, sendo ${sampleMatch.lessonsWithVtt} com transcrição timestampada`
          : ""
      }. Começando a indexar agora…`
    );

    await runIngest(id);
  }

  async function runIngest(courseId: number) {
    setOnboarding((s) => ({ ...s, ingesting: true, ingestLog: [] }));
    appendIngestLog(`▶ Iniciando ingest do curso #${courseId}…`);

    try {
      const res = await fetch("/api/courses/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);

      appendIngestLog(`✓ ${json.lessonsProcessed} aulas processadas`);
      if (json.chunksInserted > 0) {
        appendIngestLog(`✓ ${json.chunksInserted} chunks de transcrição indexados`);
      }
      if (json.courseEmbedding) {
        appendIngestLog("✓ Embedding de metadados do curso gravado");
      }
      if (json.errors?.length) {
        appendIngestLog(`⚠ ${json.errors.length} aviso(s): ${json.errors[0]}`);
      }
      appendIngestLog(`✓ Concluído em ${(json.durationMs / 1000).toFixed(1)}s`);

      await refreshCourses();
      appendOnboarding(
        "assistant",
        `Pronto! O curso **${json.title}** já está disponível no painel. Bora conversar sobre ele?`
      );
      setOnboarding((s) => ({ ...s, ingesting: false, candidateCourseId: courseId }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      appendIngestLog(`✗ Falha: ${msg}`);
      appendOnboarding(
        "assistant",
        `Algo deu errado: ${msg}. Verifica se a OpenAI/Google API key está configurada em /admin.`
      );
      setOnboarding((s) => ({ ...s, ingesting: false }));
    }
  }

  function openIngestedCourse() {
    if (!onboarding.candidateCourseId) return;
    setSelectedCourseId(onboarding.candidateCourseId);
    setOnboarding({
      active: false,
      messages: [],
      candidateCourseId: null,
      ingesting: false,
      ingestLog: [],
    });
  }

  function closeOnboarding() {
    setOnboarding({
      active: false,
      messages: [],
      candidateCourseId: null,
      ingesting: false,
      ingestLog: [],
    });
  }

  // ─── Render ─────────────────────────────────────────────────────
  const conversationTitle = onboarding.active
    ? "Indexar novo curso"
    : selectedCourse
      ? selectedCourse.title
      : "Todos os cursos indexados";

  const conversationSubtitle = onboarding.active
    ? "Agente de onboarding · Bússola"
    : selectedCourse
      ? `${selectedCourse.lessonCount} aulas · ${selectedCourse.chunkCount} trechos timestampados`
      : `${courses.indexed.length} cursos · ${courses.indexed.reduce(
          (acc, c) => acc + c.chunkCount,
          0
        )} trechos timestampados`;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#0b141a] text-[#e9edef]">
      {/* ─── Sidebar ─── */}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex w-[340px] max-w-[85vw] flex-col border-r border-[#222d34] bg-[#111b21] transition-transform sm:relative sm:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <SidebarHeader firstName={firstName} isLoggedIn={isLoggedIn} onClose={() => setMobileSidebarOpen(false)} />

        <div className="border-b border-[#222d34] bg-[#111b21] px-3 py-3">
          <button
            type="button"
            onClick={openOnboarding}
            className="group flex w-full items-center gap-3 rounded-lg bg-gradient-to-br from-[#00a884] to-[#06846a] px-3 py-2.5 text-left shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <Plus className="h-5 w-5 text-white" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">
                Indexar novo curso
              </span>
              <span className="block text-[11px] text-emerald-50/80">
                Agente de onboarding · CEFIS
              </span>
            </span>
            <Sparkles className="h-4 w-4 text-white/70 transition-transform group-hover:rotate-12" />
          </button>
        </div>

        <div className="border-b border-[#222d34] px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[#202c33] px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-[#8696a0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar curso ou matéria"
              className="flex-1 bg-transparent text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-4">
          {/* Todos os cursos */}
          <CourseRow
            active={selectedCourseId === null && !onboarding.active}
            avatar={<Library className="h-5 w-5 text-white/90" />}
            avatarBg="bg-gradient-to-br from-emerald-500 to-emerald-700"
            title="Todos os cursos"
            subtitle={
              coursesLoading
                ? "Carregando…"
                : `${courses.indexed.length} indexados · busca global`
            }
            badge={null}
            onClick={() => selectCourse(null)}
          />

          {coursesError && (
            <div className="px-4 py-3 text-xs text-red-300">
              Erro ao listar cursos: {coursesError}
            </div>
          )}

          {filteredIndexed.length > 0 && (
            <SectionLabel>Indexados ({filteredIndexed.length})</SectionLabel>
          )}
          {filteredIndexed.map((c) => (
            <CourseRow
              key={c.id}
              active={selectedCourseId === c.id && !onboarding.active}
              avatar={<BookOpen className="h-5 w-5 text-emerald-50" />}
              avatarBg="bg-gradient-to-br from-[#2a6f55] to-[#1d4d3c]"
              title={c.title}
              subtitle={
                c.chunkCount > 0
                  ? `${c.lessonCount} aulas · ${c.chunkCount} trechos`
                  : `${c.lessonCount} aulas · só metadados`
              }
              badge={
                c.chunkCount > 0 ? (
                  <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {c.chunkCount}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#8696a0]">meta</span>
                )
              }
              onClick={() => selectCourse(c.id)}
            />
          ))}

          {filteredAvailable.length > 0 && (
            <SectionLabel>Disponíveis no sample ({filteredAvailable.length})</SectionLabel>
          )}
          {filteredAvailable.map((c) => (
            <AvailableCourseRow key={c.id} course={c} onIngest={() => openOnboarding()} />
          ))}

          {!coursesLoading &&
            filteredIndexed.length === 0 &&
            filteredAvailable.length === 0 &&
            search.length > 0 && (
              <div className="px-5 py-6 text-xs text-[#8696a0]">
                Nada encontrado pra &quot;{search}&quot;.
              </div>
            )}
        </nav>

        <SidebarFooter isLoggedIn={isLoggedIn} />
      </aside>

      {/* Overlay mobile */}
      {mobileSidebarOpen && (
        <button
          aria-label="Fechar sidebar"
          onClick={() => setMobileSidebarOpen(false)}
          className="absolute inset-0 z-20 bg-black/60 sm:hidden"
        />
      )}

      {/* ─── Chat Pane ─── */}
      <main className="relative flex flex-1 flex-col">
        <ChatHeader
          title={conversationTitle}
          subtitle={conversationSubtitle}
          isOnboarding={onboarding.active}
          onMenu={() => setMobileSidebarOpen(true)}
          onCloseOnboarding={closeOnboarding}
          accent={onboarding.active ? "violet" : selectedCourse ? "emerald" : "blue"}
        />

        <div
          className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-8"
          style={{
            backgroundColor: "#0b141a",
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {!onboarding.active && messages.length === 0 && !loading && (
              <EmptyState
                firstName={firstName}
                isLoggedIn={isLoggedIn}
                selectedCourse={selectedCourse}
                onSuggestion={(s) => send(s)}
              />
            )}

            {!onboarding.active &&
              messages.map((m) => <MessageBubble key={m.id} message={m} />)}

            {onboarding.active && (
              <OnboardingThread
                messages={onboarding.messages}
                log={onboarding.ingestLog}
                ingesting={onboarding.ingesting}
                candidateCourseId={onboarding.candidateCourseId}
                onOpenCourse={openIngestedCourse}
              />
            )}

            {loading && !onboarding.active && (
              <div className="flex items-center gap-2 px-2 text-xs text-[#8696a0]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Bússola está digitando…
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-900/60 bg-red-950/60 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </div>

        <Composer
          ref={inputRef}
          input={input}
          onChange={setInput}
          onSubmit={onboarding.active ? handleOnboardingSubmit : handleSubmit}
          disabled={loading || onboarding.ingesting}
          placeholder={
            onboarding.active
              ? onboarding.ingesting
                ? "Indexando — aguarda…"
                : "Manda o ID do curso (ex: 1132)"
              : selectedCourse
                ? `Pergunte algo sobre "${selectedCourse.title}"…`
                : "Pergunte qualquer coisa sobre o catálogo…"
          }
        />
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Subcomponentes
// ────────────────────────────────────────────────────────────────────

function SidebarHeader({
  firstName,
  isLoggedIn,
  onClose,
}: {
  firstName: string | null;
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#222d34] bg-[#202c33] px-4 py-3">
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-lg shadow-md">
            🧭
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#202c33] bg-emerald-500" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-[#e9edef]">Bússola</div>
          <div className="text-[11px] leading-tight text-[#8696a0]">
            {isLoggedIn
              ? firstName
                ? `online · ${firstName}`
                : "online · CEFIS"
              : "online · modo visitante"}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full p-1.5 text-[#aebac1] transition-colors hover:bg-white/5 sm:hidden"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}

function SidebarFooter({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="space-y-2 border-t border-[#222d34] bg-[#111b21] px-3 py-3 text-xs">
      <Link
        href="/conectar-whatsapp"
        className="flex items-center gap-3 rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 transition-colors hover:bg-emerald-950/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-base">
          💬
        </span>
        <span className="flex-1">
          <span className="block font-medium text-emerald-200">Conectar WhatsApp</span>
          <span className="block text-[10px] text-[#8696a0]">Tutor no zap via Evolution API</span>
        </span>
      </Link>

      {!isLoggedIn && (
        <Link
          href="/login"
          className="block rounded-lg border border-[#2a3942] bg-[#202c33] px-3 py-2 text-center text-[#aebac1] transition-colors hover:bg-[#2a3942]"
        >
          Entrar com CEFIS
        </Link>
      )}
      {isLoggedIn && (
        <Link
          href="/plano"
          className="block rounded-lg border border-[#2a3942] bg-[#202c33] px-3 py-2 text-center text-[#aebac1] transition-colors hover:bg-[#2a3942]"
        >
          Meu plano de estudos
        </Link>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-[#8696a0]">
      {children}
    </div>
  );
}

function CourseRow({
  active,
  avatar,
  avatarBg,
  title,
  subtitle,
  badge,
  onClick,
}: {
  active: boolean;
  avatar: React.ReactNode;
  avatarBg: string;
  title: string;
  subtitle: string;
  badge: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        active ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-inner ${avatarBg}`}
      >
        {avatar}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-[#e9edef]">{title}</span>
          {badge}
        </span>
        <span className="block truncate text-xs text-[#8696a0]">{subtitle}</span>
      </span>
    </button>
  );
}

function AvailableCourseRow({
  course,
  onIngest,
}: {
  course: AvailableCourse;
  onIngest: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 opacity-80 transition-opacity hover:opacity-100">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-[#3b4a52] bg-[#1a242a]">
        <Hash className="h-4 w-4 text-[#8696a0]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#aebac1]">
          {course.title}
        </span>
        <span className="block truncate text-xs text-[#8696a0]">
          #{course.id} · {course.lessonCount} aulas · não indexado
        </span>
      </span>
      <button
        type="button"
        onClick={onIngest}
        className="shrink-0 rounded-full bg-[#202c33] p-1.5 text-emerald-400 transition-colors hover:bg-emerald-950/40"
        aria-label={`Indexar ${course.title}`}
        title="Indexar este curso"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChatHeader({
  title,
  subtitle,
  isOnboarding,
  onMenu,
  onCloseOnboarding,
  accent,
}: {
  title: string;
  subtitle: string;
  isOnboarding: boolean;
  onMenu: () => void;
  onCloseOnboarding: () => void;
  accent: "emerald" | "blue" | "violet";
}) {
  const accentRing =
    accent === "violet"
      ? "from-violet-400 to-fuchsia-600"
      : accent === "blue"
        ? "from-sky-400 to-indigo-600"
        : "from-emerald-400 to-emerald-700";

  return (
    <header className="flex items-center gap-3 border-b border-[#222d34] bg-[#202c33] px-3 py-2.5 sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        className="rounded-full p-1.5 text-[#aebac1] transition-colors hover:bg-white/5 sm:hidden"
        aria-label="Abrir lista de cursos"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${accentRing} text-base shadow-md`}
      >
        {isOnboarding ? <MessageSquarePlus className="h-5 w-5 text-white" /> : "🧭"}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[#e9edef]">{title}</div>
        <div className="truncate text-[11px] text-[#8696a0]">{subtitle}</div>
      </div>

      {isOnboarding ? (
        <button
          type="button"
          onClick={onCloseOnboarding}
          className="rounded-full p-1.5 text-[#aebac1] transition-colors hover:bg-white/5"
          aria-label="Fechar onboarding"
          title="Voltar pra conversa"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <Link
          href="/conectar-whatsapp"
          className="hidden items-center gap-2 rounded-full bg-emerald-600/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-600/25 sm:inline-flex"
        >
          <span>💬</span>
          <span>Receber no WhatsApp</span>
        </Link>
      )}
    </header>
  );
}

function EmptyState({
  firstName,
  isLoggedIn,
  selectedCourse,
  onSuggestion,
}: {
  firstName: string | null;
  isLoggedIn: boolean;
  selectedCourse: IndexedCourse | null;
  onSuggestion: (s: string) => void;
}) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 text-center">
      <div className="space-y-3">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-emerald-700/20 text-3xl shadow-inner">
          🧭
        </div>
        <h2 className="text-xl font-semibold text-[#e9edef]">
          {firstName ? `E aí, ${firstName}!` : "E aí!"}{" "}
          <span className="text-[#8696a0]">Sobre o que vamos conversar?</span>
        </h2>
        <p className="text-sm text-[#aebac1]">
          {selectedCourse ? (
            <>
              Foco em <strong className="text-emerald-300">{selectedCourse.title}</strong>.
              Pergunte qualquer coisa do conteúdo — vou abrir os trechos no segundo exato.
            </>
          ) : (
            <>
              Busco em todos os cursos indexados. Pergunte sobre <strong>negociação</strong>,
              ou escolha um curso na lateral pra escopar a conversa.
            </>
          )}
        </p>
      </div>

      <div className="grid gap-2 text-left sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion(s)}
            className="group rounded-xl border border-[#222d34] bg-[#111b21]/80 px-4 py-3 text-sm text-[#e9edef] transition-all hover:-translate-y-0.5 hover:border-emerald-700/60 hover:bg-[#111b21]"
          >
            <span className="block text-[10px] uppercase tracking-wider text-[#8696a0] transition-colors group-hover:text-emerald-400">
              Sugestão
            </span>
            <span>{s}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-left text-xs text-[#aebac1]">
        <div className="mb-1 flex items-center gap-2 text-emerald-300">
          <span>💬</span>
          <strong>Atalho WhatsApp</strong>
        </div>
        <p>
          {isLoggedIn
            ? "Vai em "
            : "Faça login na CEFIS e depois vá em "}
          <Link href="/conectar-whatsapp" className="font-semibold text-emerald-300 underline-offset-4 hover:underline">
            Conectar WhatsApp
          </Link>{" "}
          pra mandar essas mesmas perguntas pelo zap — o roteamento passa pelo Evolution API e
          a resposta volta com o link da aula no segundo certo.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="relative max-w-[85%] rounded-2xl rounded-br-md bg-[#005c4b] px-3 py-2 text-sm leading-relaxed text-[#e9edef] shadow-sm">
          <div className="whitespace-pre-wrap">{message.content}</div>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#a3c2bd]">
            <span>{message.time}</span>
            <CheckCheck className="h-3 w-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex">
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#202c33] px-3.5 py-2.5 text-sm leading-relaxed text-[#e9edef] shadow-sm">
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-strong:text-emerald-200">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          {message.groundedInCefis === false && (
            <p className="mt-1.5 text-[11px] italic text-[#8696a0]">
              (Resposta sem base nas transcrições — conhecimento geral)
            </p>
          )}
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
            <span>{message.time}</span>
            <Check className="h-3 w-3" />
          </div>
        </div>
      </div>

      {message.citations && message.citations.length > 0 && (
        <div className="ml-2 space-y-1.5 sm:ml-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            📺 {message.citations.length} aula
            {message.citations.length > 1 ? "s" : ""} CEFIS embasando
          </p>
          <div className="space-y-1.5">
            {message.citations.map((c, i) => (
              <CitationCardDark key={`${c.lessonId}-${i}`} citation={c} />
            ))}
          </div>
        </div>
      )}

      {message.suggestedCourses && message.suggestedCourses.length > 0 && (
        <div className="ml-2 space-y-1.5 sm:ml-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8696a0]">
            Cursos relacionados
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {message.suggestedCourses.map((s) => (
              <a
                key={s.courseId}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-[#2a3942] bg-[#1a242a] px-3 py-2 text-xs text-[#aebac1] transition-colors hover:bg-[#202c33]"
              >
                <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CitationCardDark({ citation }: { citation: Citation }) {
  return (
    <a
      href={citation.deepLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-emerald-900/60 bg-gradient-to-br from-emerald-950/60 to-[#0f1e1a] px-3 py-2.5 transition-all hover:border-emerald-600/80 hover:from-emerald-900/60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm transition-colors group-hover:bg-emerald-500">
        ▶
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-[#e9edef]">
          {citation.lessonTitle}
        </span>
        <span className="block truncate text-[10px] text-[#8696a0]">
          {citation.courseTitle} · relevância {Math.round(citation.similarity * 100)}%
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-[#202c33] px-2 py-1 font-mono text-[10px] font-semibold text-emerald-300">
        {formatDuration(citation.startSeconds)}
      </span>
    </a>
  );
}

function OnboardingThread({
  messages,
  log,
  ingesting,
  candidateCourseId,
  onOpenCourse,
}: {
  messages: OnboardingState["messages"];
  log: string[];
  ingesting: boolean;
  candidateCourseId: number | null;
  onOpenCourse: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((m, i) => {
        if (m.role === "user") {
          return (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#005c4b] px-3 py-2 text-sm text-[#e9edef] shadow-sm">
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className="mt-1 text-right text-[10px] text-[#a3c2bd]">{m.time}</div>
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="flex">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-[#202c33] px-3.5 py-2.5 text-sm leading-relaxed text-[#e9edef] shadow-sm">
              <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-strong:text-violet-200">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              <div className="mt-1 text-right text-[10px] text-[#8696a0]">{m.time}</div>
            </div>
          </div>
        );
      })}

      {log.length > 0 && (
        <div className="ml-2 max-w-[92%] rounded-xl border border-violet-900/50 bg-[#1a1428]/80 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-violet-200 shadow-sm sm:ml-4">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {ingesting && (
            <div className="mt-1 flex items-center gap-2 text-violet-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>processando…</span>
            </div>
          )}
        </div>
      )}

      {candidateCourseId && !ingesting && (
        <div className="ml-2 sm:ml-4">
          <button
            type="button"
            onClick={onOpenCourse}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-500"
          >
            <ArrowLeft className="h-4 w-4 rotate-180" />
            Abrir curso na conversa
          </button>
        </div>
      )}
    </div>
  );
}

interface ComposerProps {
  input: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  placeholder: string;
}

const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { input, onChange, onSubmit, disabled, placeholder },
  ref
) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-end gap-2 border-t border-[#222d34] bg-[#202c33] px-3 py-3 sm:px-6"
    >
      <div className="flex flex-1 items-end gap-2 rounded-2xl bg-[#2a3942] px-3 py-1.5">
        <textarea
          ref={ref}
          rows={1}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm leading-snug text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || input.trim().length === 0}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-[#2a3942] disabled:text-[#8696a0]"
        aria-label="Enviar"
      >
        <Send className="h-4 w-4 translate-x-[1px]" />
      </button>
    </form>
  );
});
