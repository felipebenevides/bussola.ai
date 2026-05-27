"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Flame,
  Library,
  Menu,
  Plus,
  Search,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from "lucide-react";

/**
 * Mock estático mas interativo do /tutor — reproduz fielmente:
 * - SidebarHeader com avatar do user logado + pulse online + nome
 * - Seletor de plano em discussão
 * - Botões "Indexar novo curso" (emerald) + "Plano Empresarial" (violet)
 * - Busca + lista de cursos (Todos + Indexados)
 * - JourneyWidget compacto (gamificação)
 * - SidebarFooter (Receber no WhatsApp + Meu plano)
 * - ChatHeader com Settings + pill "Receber no WhatsApp"
 * - Mensagens + citation card no segundo exato
 * - Composer com input
 *
 * Qualquer click/focus/Enter no card abre /tutor de verdade.
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
            É assim que a Bússola responde — com a aula CEFIS apontada no minuto exato, plano
            do seu time, Jornada do Herói gamificando a evolução. Clique pra entrar.
          </p>
        </div>

        <div className="mx-auto flex items-center justify-center gap-6 lg:gap-8">
          {/* Desktop: browser-chrome mock (escondido em <lg) */}
          <div
            role="link"
            tabIndex={0}
            onClick={goToTutor}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") goToTutor(e);
            }}
            className="group relative hidden w-full max-w-3xl cursor-pointer overflow-hidden rounded-2xl shadow-2xl ring-1 ring-zinc-200 transition-transform hover:-translate-y-1 dark:ring-zinc-800 lg:block xl:max-w-4xl"
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

            <div
              className="grid h-[680px] grid-cols-[280px_1fr] xl:h-[720px] xl:grid-cols-[320px_1fr]"
              style={{ backgroundColor: "var(--wa-app)" }}
            >
              <MockSidebar />
              <MockChat onInteract={goToTutor} />
            </div>
          </div>

          {/* Celular PWA — sempre visível */}
          <MockPhoneFrame onInteract={goToTutor} />
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
      className="flex flex-col overflow-hidden border-r"
      style={{
        backgroundColor: "var(--wa-sidebar)",
        borderColor: "var(--wa-border)",
      }}
    >
      <MockSidebarHeader />
      <MockPlanSelector />
      <MockSidebarButtons />
      <MockSearch />
      <MockCourseList />
      <MockJourneyWidget />
      <MockSidebarFooter />
    </aside>
  );
}

function MockSidebarHeader() {
  return (
    <div
      className="flex items-center justify-between border-b px-3.5 py-2.5"
      style={{
        backgroundColor: "var(--wa-header)",
        borderColor: "var(--wa-header-border)",
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-sm font-bold text-white shadow-md ring-2 ring-emerald-500/40">
            M
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 bg-emerald-500"
            style={{ borderColor: "var(--wa-header)" }}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-xs font-semibold" style={{ color: "var(--wa-text-primary)" }}>
            Maria Silva
          </div>
          <div className="truncate text-[10px]" style={{ color: "var(--wa-text-muted)" }}>
            CEFIS · logado
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ color: "var(--wa-text-secondary)" }}
        >
          <span className="text-base">☀️</span>
        </div>
      </div>
    </div>
  );
}

function MockPlanSelector() {
  return (
    <div className="border-b px-3 py-2" style={{ borderColor: "var(--wa-border)" }}>
      <div
        className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider"
        style={{ color: "var(--wa-text-muted)" }}
      >
        <span>Plano em discussão</span>
        <span className="text-emerald-600 dark:text-emerald-400">ver todos</span>
      </div>
      <div className="flex h-8 items-center justify-between rounded-lg border border-zinc-300 bg-white px-2 text-[11px] font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
        <span className="truncate">Negociar honorários · ativo (7)</span>
        <ChevronRight className="h-3 w-3 rotate-90 opacity-50" />
      </div>
    </div>
  );
}

function MockSidebarButtons() {
  return (
    <div className="space-y-1.5 border-b px-3 py-2.5" style={{ borderColor: "var(--wa-border)" }}>
      {/* Indexar novo curso */}
      <div className="group flex w-full items-center gap-2.5 rounded-lg bg-gradient-to-br from-[#00a884] to-[#06846a] px-2.5 py-2 text-left shadow-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur">
          <Plus className="h-4 w-4 text-white" />
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-[12px] font-semibold text-white">Indexar novo curso</span>
          <span className="block text-[9px] text-emerald-50/80">Agente de onboarding · CEFIS</span>
        </span>
        <Sparkles className="h-3.5 w-3.5 text-white/70" />
      </div>

      {/* Plano Empresarial */}
      <div className="group flex w-full items-center gap-2.5 rounded-lg border border-violet-500/40 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 px-2.5 py-1.5 text-left">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
          <Users className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 leading-tight">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-200">
            Plano Empresarial
            <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-1 py-0 text-[8px] font-bold uppercase tracking-wider text-white">
              exclusivo
            </span>
          </span>
          <span className="block text-[9px] text-violet-700/70 dark:text-violet-300/70">
            Grupo WhatsApp · até 5 · 7 dias
          </span>
        </span>
      </div>
    </div>
  );
}

function MockSearch() {
  return (
    <div className="border-b px-3 py-2" style={{ borderColor: "var(--wa-border)" }}>
      <div
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
        style={{ backgroundColor: "var(--wa-active)" }}
      >
        <Search className="h-3.5 w-3.5" style={{ color: "var(--wa-text-muted)" }} />
        <span className="text-[11px]" style={{ color: "var(--wa-text-muted)" }}>
          Buscar curso ou matéria
        </span>
      </div>
    </div>
  );
}

function MockCourseList() {
  return (
    <nav className="flex-1 overflow-hidden">
      <MockCourseRow
        active
        avatar={<Library className="h-4 w-4 text-white/90" />}
        avatarBg="bg-gradient-to-br from-emerald-500 to-emerald-700"
        title="Todos os cursos"
        subtitle="3 indexados · busca global"
      />
      <div
        className="px-3.5 pb-0.5 pt-2.5 text-[9px] font-bold uppercase tracking-wider"
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
    </nav>
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

function MockJourneyWidget() {
  return (
    <div className="border-t px-3 py-2.5" style={{ borderColor: "var(--wa-border)" }}>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-sky-400 to-blue-600 p-2.5 shadow-lg">
        <span className="pointer-events-none absolute -right-2 -top-2 text-4xl opacity-20">
          🗺️
        </span>
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl backdrop-blur ring-2 ring-sky-400/40">
              🗺️
            </span>
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/90">
                Aventureiro
              </div>
              <div className="text-[9px] text-white/70">Buscando bagagem</div>
            </div>
          </div>
          <span className="flex items-center gap-0.5 rounded-full bg-orange-500/30 px-1.5 py-0.5 text-[9px] font-bold text-white ring-1 ring-orange-300/40">
            <Flame className="h-2.5 w-2.5 animate-pulse" />
            12
          </span>
        </div>
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full bg-gradient-to-r from-white/90 to-white/60 shadow-inner"
            style={{ width: "62%" }}
          />
        </div>
        <div className="relative mt-1 flex items-center justify-between text-[9px] text-white/80">
          <span className="font-mono font-bold">310 XP</span>
          <span className="flex items-center gap-1">
            ver jornada <ChevronRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function MockSidebarFooter() {
  return (
    <div
      className="space-y-1.5 border-t px-3 py-2.5 text-xs"
      style={{ backgroundColor: "var(--wa-sidebar)", borderColor: "var(--wa-border)" }}
    >
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-sm">
          💬
        </span>
        <div className="flex-1 leading-tight">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-200">
            Receber no WhatsApp
          </div>
          <div className="text-[9px]" style={{ color: "var(--wa-text-muted)" }}>
            Mande dúvidas direto pelo zap
          </div>
        </div>
      </div>
      <div
        className="rounded-lg border px-2.5 py-1.5 text-center text-[11px]"
        style={{
          backgroundColor: "var(--wa-active)",
          borderColor: "var(--wa-border)",
          color: "var(--wa-text-secondary)",
        }}
      >
        Meu plano de estudos
      </div>
    </div>
  );
}

// ─── Chat ─────────────────────────────────────────────────────────

function MockChat({ onInteract }: { onInteract: () => void }) {
  return (
    <div className="flex min-w-0 flex-col">
      <MockChatHeader />
      <MockMessages />
      <MockComposer onInteract={onInteract} />
    </div>
  );
}

function MockChatHeader() {
  return (
    <header
      className="flex items-center gap-2.5 border-b px-4 py-2.5"
      style={{
        backgroundColor: "var(--wa-header)",
        borderColor: "var(--wa-header-border)",
      }}
    >
      <Menu
        className="h-4 w-4 sm:hidden"
        style={{ color: "var(--wa-text-secondary)" }}
      />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-base shadow-md">
        🧭
      </div>
      <div className="min-w-0 flex-1 leading-tight">
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
      <button
        type="button"
        className="rounded-full p-1.5"
        aria-label="Preferências"
        style={{ color: "var(--wa-text-secondary)" }}
      >
        <SettingsIcon className="h-4 w-4" />
      </button>
      <div className="hidden items-center gap-1.5 rounded-full bg-emerald-100/80 px-2.5 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-600/15 dark:text-emerald-300 sm:inline-flex">
        <span>💬</span>
        <span>Receber no WhatsApp</span>
      </div>
    </header>
  );
}

function MockMessages() {
  return (
    <div
      className="flex-1 overflow-hidden px-4 py-4 sm:px-6"
      style={{
        backgroundColor: "var(--wa-chat)",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--wa-wallpaper-dot) 1px, transparent 0)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
        {/* User */}
        <div className="flex justify-end">
          <div
            className="max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-[12px] leading-snug shadow-sm"
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

        {/* Assistant + citation */}
        <div className="flex flex-col gap-1.5">
          <div className="flex">
            <div
              className="max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[12px] leading-snug shadow-sm"
              style={{
                backgroundColor: "var(--wa-bubble-received)",
                color: "var(--wa-bubble-received-text)",
              }}
            >
              Comece <strong className="text-emerald-700 dark:text-emerald-300">explicando
              o interesse</strong> antes da posição — &quot;preciso fechar caixa esse
              mês&quot; fala mais que &quot;pague hoje&quot;. A Profa. mostra esse pivô por
              volta de <span className="font-mono">2:30</span> em &quot;Quebra-gelo em
              conflito&quot;.
              <div
                className="mt-0.5 flex items-center justify-end gap-1 text-[9px]"
                style={{ color: "var(--wa-bubble-received-time)" }}
              >
                <span>10:42</span>
                <Check className="h-2.5 w-2.5" />
              </div>
            </div>
          </div>

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
  );
}

// ─── Phone frame (mobile mock) ───────────────────────────────────

function MockPhoneFrame({ onInteract }: { onInteract: () => void }) {
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onInteract}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInteract();
        }
      }}
      className="group relative cursor-pointer transition-transform hover:-translate-y-1"
      aria-label="Abrir o tutor"
    >
      <div className="pointer-events-none absolute -bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Abrir →
      </div>

      {/* iPhone-like chassis */}
      <div className="relative rounded-[2.5rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl ring-1 ring-zinc-700 dark:border-black dark:ring-zinc-800">
        <div className="absolute left-1/2 top-1 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-zinc-900 dark:bg-black" />
        <div
          className="relative h-[600px] w-[280px] overflow-hidden rounded-[1.9rem] sm:h-[640px] sm:w-[300px]"
          style={{ backgroundColor: "var(--wa-app)" }}
        >
          {/* Status bar */}
          <div
            className="flex items-center justify-between px-5 pt-2 text-[10px] font-semibold"
            style={{
              backgroundColor: "var(--wa-header)",
              color: "var(--wa-text-primary)",
            }}
          >
            <span>10:42</span>
            <span className="flex items-center gap-1 text-[9px] opacity-70">
              <span>●●●</span>
              <span>📶</span>
              <span>🔋</span>
            </span>
          </div>

          <MockMobileTutor onInteract={onInteract} />
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-zinc-700 dark:bg-zinc-600" />
      </div>

      {/* Label do device */}
      <div className="mt-3 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Aplicativo · PWA
      </div>
    </div>
  );
}

function MockMobileTutor({ onInteract }: { onInteract: () => void }) {
  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: "var(--wa-app)" }}
    >
      {/* Chat Header com avatar do user (estilo mobile) */}
      <header
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{
          backgroundColor: "var(--wa-header)",
          borderColor: "var(--wa-header-border)",
        }}
      >
        <Menu className="h-4 w-4" style={{ color: "var(--wa-text-secondary)" }} />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-base shadow-md">
          🧭
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div
            className="truncate text-[11px] font-semibold"
            style={{ color: "var(--wa-text-primary)" }}
          >
            Negociação Harvard
          </div>
          <div className="truncate text-[9px]" style={{ color: "var(--wa-text-muted)" }}>
            24 aulas · 58 trechos
          </div>
        </div>
        <SettingsIcon className="h-3.5 w-3.5" style={{ color: "var(--wa-text-secondary)" }} />
      </header>

      {/* JourneyWidget mini no topo (gamificação visível) */}
      <div className="border-b px-2 py-2" style={{ borderColor: "var(--wa-border)" }}>
        <div className="flex items-center justify-between rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 px-2 py-1.5 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🗺️</span>
            <div className="leading-tight">
              <div className="text-[9px] font-bold uppercase tracking-wider text-white/90">
                Aventureiro
              </div>
              <div className="text-[8px] text-white/70">310 XP · 62%</div>
            </div>
          </div>
          <span className="flex items-center gap-0.5 rounded-full bg-orange-500/30 px-1.5 py-0.5 text-[9px] font-bold text-white ring-1 ring-orange-300/40">
            <Flame className="h-2.5 w-2.5" />
            12
          </span>
        </div>
      </div>

      {/* Mensagens — versão compacta */}
      <div
        className="flex-1 overflow-hidden px-2.5 py-2"
        style={{
          backgroundColor: "var(--wa-chat)",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--wa-wallpaper-dot) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="flex flex-col gap-1.5">
          {/* User bubble */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-xl rounded-br-sm px-2 py-1 text-[10px] leading-snug shadow-sm"
              style={{
                backgroundColor: "var(--wa-bubble-sent)",
                color: "var(--wa-bubble-sent-text)",
              }}
            >
              Como abrir negociação com cliente que atrasa?
              <div
                className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px]"
                style={{ color: "var(--wa-bubble-sent-time)" }}
              >
                <span>10:42</span>
                <CheckCheck className="h-2 w-2" />
              </div>
            </div>
          </div>

          {/* Assistant + citation */}
          <div className="flex flex-col gap-1">
            <div className="flex">
              <div
                className="max-w-[90%] rounded-xl rounded-bl-sm px-2 py-1.5 text-[10px] leading-snug shadow-sm"
                style={{
                  backgroundColor: "var(--wa-bubble-received)",
                  color: "var(--wa-bubble-received-text)",
                }}
              >
                Comece <strong className="text-emerald-700 dark:text-emerald-300">explicando
                o interesse</strong> antes da posição. A Profa. fala disso em{" "}
                <span className="font-mono">2:30</span>.
                <div
                  className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px]"
                  style={{ color: "var(--wa-bubble-received-time)" }}
                >
                  <span>10:42</span>
                  <Check className="h-2 w-2" />
                </div>
              </div>
            </div>

            <div className="ml-1 space-y-1">
              <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                📺 Aula CEFIS
              </p>
              <div
                className="flex items-center gap-1.5 rounded-md border px-1.5 py-1"
                style={{
                  backgroundColor: "var(--wa-citation-bg)",
                  borderColor: "var(--wa-citation-border)",
                }}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-600 text-[9px] text-white shadow-sm">
                  ▶
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div
                    className="truncate text-[9px] font-medium"
                    style={{ color: "var(--wa-text-primary)" }}
                  >
                    Quebra-gelo em conflito
                  </div>
                  <div className="truncate text-[7px]" style={{ color: "var(--wa-text-muted)" }}>
                    Relevância 92%
                  </div>
                </div>
                <span
                  className="shrink-0 rounded px-1 py-0.5 font-mono text-[8px] font-bold text-emerald-700 dark:text-emerald-300"
                  style={{ backgroundColor: "var(--wa-active)" }}
                >
                  2:30
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer compacto */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onInteract();
        }}
        className="flex items-center gap-1.5 border-t px-2.5 py-2"
        style={{
          backgroundColor: "var(--wa-composer)",
          borderColor: "var(--wa-header-border)",
        }}
      >
        <div
          className="flex flex-1 items-center rounded-full px-2.5 py-1"
          style={{ backgroundColor: "var(--wa-input-bg)" }}
        >
          <input
            type="text"
            readOnly
            onFocus={onInteract}
            onClick={onInteract}
            placeholder="Pergunte algo…"
            className="w-full cursor-pointer bg-transparent text-[10px] focus:outline-none"
            style={{ color: "var(--wa-text-primary)" }}
          />
        </div>
        <button
          type="submit"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md"
          aria-label="Enviar"
        >
          <Send className="h-3 w-3 translate-x-px" />
        </button>
      </form>
    </div>
  );
}

function MockComposer({ onInteract }: { onInteract: () => void }) {
  return (
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
  );
}
