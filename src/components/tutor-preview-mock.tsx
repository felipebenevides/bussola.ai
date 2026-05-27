"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  BookOpen,
  Check,
  CheckCheck,
  Library,
  Plus,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

/**
 * Mock estático mas interativo do /tutor — qualquer clique, foco ou tecla
 * leva pra rota real /tutor. Espelha as proporções, ícones e tokens --wa-*
 * da página real para passar a sensação exata de "isso é o produto".
 */
export function TutorPreviewMock() {
  const router = useRouter();

  const goToTutor = useCallback(
    (e?: React.MouseEvent | React.FocusEvent | React.KeyboardEvent) => {
      e?.preventDefault();
      router.push("/tutor");
    },
    [router]
  );

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Veja em ação
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Pergunte qualquer coisa.{" "}
            <span className="bg-gradient-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent dark:from-emerald-300 dark:to-teal-400">
              Abre o vídeo no segundo certo.
            </span>
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            É assim que a Bússola responde — com a aula CEFIS apontada no minuto exato em que
            aquilo é explicado. Clique pra entrar.
          </p>
        </div>

        <div
          role="link"
          tabIndex={0}
          onClick={goToTutor}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") goToTutor(e);
          }}
          className="group relative mx-auto max-w-5xl cursor-pointer overflow-hidden rounded-2xl shadow-2xl ring-1 ring-zinc-200 transition-transform hover:-translate-y-1 dark:ring-zinc-800"
          aria-label="Abrir o tutor"
        >
          <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Abrir tutor →
          </div>

          {/* Browser-like chrome */}
          <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              bussola.ai/tutor
            </span>
          </div>

          {/* Interior — usa tokens --wa-* (responde ao theme toggle) */}
          <div
            className="grid h-[480px] grid-cols-[280px_1fr] sm:h-[520px] sm:grid-cols-[300px_1fr]"
            style={{ backgroundColor: "var(--wa-app)" }}
          >
            <MockSidebar />
            <MockChat onInteract={goToTutor} />
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-zinc-500">
          ↑ qualquer clique, foco ou Enter abre o tutor real
        </p>
      </div>
    </section>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────

function MockSidebar() {
  return (
    <aside
      className="flex flex-col border-r"
      style={{
        backgroundColor: "var(--wa-sidebar)",
        borderColor: "var(--wa-border)",
      }}
    >
      {/* Header — igual ao SidebarHeader real */}
      <div
        className="flex items-center justify-between border-b px-3 py-2.5"
        style={{
          backgroundColor: "var(--wa-header)",
          borderColor: "var(--wa-header-border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-base shadow-md">
              🧭
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-500"
              style={{ borderColor: "var(--wa-header)" }}
            />
          </div>
          <div className="leading-tight">
            <div
              className="text-xs font-semibold"
              style={{ color: "var(--wa-text-primary)" }}
            >
              Bússola
            </div>
            <div className="text-[10px]" style={{ color: "var(--wa-text-muted)" }}>
              online · CEFIS
            </div>
          </div>
        </div>
      </div>

      {/* Indexar novo curso — mesmo gradient, Sparkles e Plus */}
      <div className="border-b px-2.5 py-2.5" style={{ borderColor: "var(--wa-border)" }}>
        <div className="group flex w-full items-center gap-2 rounded-lg bg-gradient-to-br from-[#00a884] to-[#06846a] px-2.5 py-2 text-left shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Plus className="h-4 w-4 text-white" />
          </span>
          <span className="flex-1">
            <span className="block text-[11px] font-semibold leading-tight text-white">
              Indexar novo curso
            </span>
            <span className="block text-[9px] leading-tight text-emerald-50/80">
              Agente de onboarding · CEFIS
            </span>
          </span>
          <Sparkles className="h-3 w-3 text-white/70" />
        </div>
      </div>

      {/* Busca */}
      <div className="border-b px-2.5 py-2" style={{ borderColor: "var(--wa-border)" }}>
        <div
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5"
          style={{ backgroundColor: "var(--wa-active)" }}
        >
          <Search className="h-3 w-3" style={{ color: "var(--wa-text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--wa-text-muted)" }}>
            Buscar curso ou matéria
          </span>
        </div>
      </div>

      {/* Lista mock */}
      <div className="flex-1 overflow-hidden">
        <MockCourseRow
          active
          avatar={<Library className="h-4 w-4 text-white/90" />}
          avatarBg="bg-gradient-to-br from-emerald-500 to-emerald-700"
          title="Todos os cursos"
          subtitle="3 indexados · busca global"
        />
        <div
          className="px-3.5 pb-0.5 pt-3 text-[9px] font-bold uppercase tracking-wider"
          style={{ color: "var(--wa-text-muted)" }}
        >
          Indexados (3)
        </div>
        <MockCourseRow
          avatar={<BookOpen className="h-4 w-4 text-emerald-50" />}
          avatarBg="bg-gradient-to-br from-[#2a6f55] to-[#1d4d3c]"
          title="Negociação Harvard"
          subtitle="24 aulas · 58 trechos"
          badge="58"
        />
        <MockCourseRow
          avatar={<BookOpen className="h-4 w-4 text-emerald-50" />}
          avatarBg="bg-gradient-to-br from-[#2a6f55] to-[#1d4d3c]"
          title="Gestão de Processos"
          subtitle="14 aulas · só metadados"
          metaBadge
        />
        <MockCourseRow
          avatar={<BookOpen className="h-4 w-4 text-emerald-50" />}
          avatarBg="bg-gradient-to-br from-[#2a6f55] to-[#1d4d3c]"
          title="IFRS 16"
          subtitle="23 aulas · só metadados"
          metaBadge
        />
      </div>
    </aside>
  );
}

function MockCourseRow({
  active = false,
  avatar,
  avatarBg,
  title,
  subtitle,
  badge,
  metaBadge,
}: {
  active?: boolean;
  avatar: React.ReactNode;
  avatarBg: string;
  title: string;
  subtitle: string;
  badge?: string;
  metaBadge?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-1.5"
      style={{ backgroundColor: active ? "var(--wa-active)" : "transparent" }}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-inner ${avatarBg}`}
      >
        {avatar}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className="truncate text-[11px] font-medium"
            style={{ color: "var(--wa-text-primary)" }}
          >
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {badge}
            </span>
          )}
          {metaBadge && (
            <span className="text-[9px]" style={{ color: "var(--wa-text-muted)" }}>
              meta
            </span>
          )}
        </div>
        <div className="truncate text-[10px]" style={{ color: "var(--wa-text-muted)" }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────

function MockChat({ onInteract }: { onInteract: () => void }) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* Header — igual ao ChatHeader real (avatar com gradient accent) */}
      <div
        className="flex items-center gap-2.5 border-b px-4 py-2.5"
        style={{
          backgroundColor: "var(--wa-header)",
          borderColor: "var(--wa-header-border)",
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-base shadow-md">
          🧭
        </div>
        <div className="min-w-0 leading-tight">
          <div
            className="truncate text-xs font-semibold"
            style={{ color: "var(--wa-text-primary)" }}
          >
            Negociação Harvard
          </div>
          <div className="truncate text-[10px]" style={{ color: "var(--wa-text-muted)" }}>
            24 aulas · 58 trechos timestampados
          </div>
        </div>
      </div>

      {/* Wallpaper + mensagens */}
      <div
        className="flex-1 overflow-hidden px-4 py-3.5 sm:px-6"
        style={{
          backgroundColor: "var(--wa-chat)",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--wa-wallpaper-dot) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {/* User bubble */}
          <div className="flex justify-end">
            <div
              className="max-w-[80%] rounded-2xl rounded-br-md px-3 py-1.5 text-[12px] leading-snug shadow-sm"
              style={{
                backgroundColor: "var(--wa-bubble-sent)",
                color: "var(--wa-bubble-sent-text)",
              }}
            >
              Como abrir uma negociação difícil com cliente que atrasa pagamento?
              <div
                className="mt-0.5 flex items-center justify-end gap-1 text-[9px]"
                style={{ color: "var(--wa-bubble-sent-time)" }}
              >
                <span>10:42</span>
                <CheckCheck className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>

          {/* Assistant bubble + citation */}
          <div className="flex flex-col gap-1.5">
            <div className="flex">
              <div
                className="max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2 text-[12px] leading-snug shadow-sm"
                style={{
                  backgroundColor: "var(--wa-bubble-received)",
                  color: "var(--wa-bubble-received-text)",
                }}
              >
                Comece <strong className="text-emerald-700 dark:text-emerald-300">
                explicando o interesse</strong> antes da posição — &quot;preciso fechar caixa
                esse mês&quot; fala mais que &quot;pague hoje&quot;. A Profa. mostra esse
                pivô por volta de <span className="font-mono">2:30</span> em &quot;Quebra-gelo
                em conflito&quot;.
                <div
                  className="mt-0.5 flex items-center justify-end gap-1 text-[9px]"
                  style={{ color: "var(--wa-bubble-received-time)" }}
                >
                  <span>10:42</span>
                  <Check className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>

            {/* Citation card — mesmo estilo do CitationCardDark */}
            <div className="ml-2 space-y-1 sm:ml-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                📺 1 aula CEFIS embasando
              </p>
              <div
                className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2 shadow-sm"
                style={{
                  backgroundColor: "var(--wa-citation-bg)",
                  borderColor: "var(--wa-citation-border)",
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-xs text-white shadow-sm">
                  ▶
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div
                    className="truncate text-[11px] font-medium"
                    style={{ color: "var(--wa-text-primary)" }}
                  >
                    Quebra-gelo em conflito
                  </div>
                  <div
                    className="truncate text-[9px]"
                    style={{ color: "var(--wa-text-muted)" }}
                  >
                    Negociação Harvard · relevância 92%
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                  style={{ backgroundColor: "var(--wa-active)" }}
                >
                  2:30
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onInteract();
        }}
        className="flex items-end gap-2 border-t px-4 py-3 sm:px-6"
        style={{
          backgroundColor: "var(--wa-composer)",
          borderColor: "var(--wa-header-border)",
        }}
      >
        <div
          className="flex flex-1 items-center rounded-2xl px-3 py-1.5"
          style={{ backgroundColor: "var(--wa-input-bg)" }}
        >
          <input
            type="text"
            readOnly
            onFocus={onInteract}
            onClick={onInteract}
            onKeyDown={onInteract}
            placeholder="Pergunte sobre BATNA, honorários, conflito com sócio…"
            className="w-full cursor-pointer bg-transparent py-1 text-xs leading-snug focus:outline-none"
            style={{ color: "var(--wa-text-primary)" }}
          />
        </div>
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-colors hover:bg-emerald-500"
          aria-label="Enviar e abrir o tutor"
        >
          <Send className="h-3.5 w-3.5 translate-x-px" />
        </button>
      </form>
    </div>
  );
}
