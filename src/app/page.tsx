import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Globe,
  LogIn,
  MessageCircle,
  Sparkles,
  Smartphone,
  Users,
} from "lucide-react";
import { InstallCta } from "@/components/install-cta";
import { TutorPreviewMock } from "@/components/tutor-preview-mock";
import { getCefisClient } from "@/lib/cefis-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  let isLoggedIn = false;
  let firstName: string | null = null;
  try {
    const client = await getCefisClient();
    if (client) {
      isLoggedIn = true;
      try {
        const me = await client.me();
        firstName = me.first_name ?? null;
      } catch {
        // segue sem nome
      }
    }
  } catch {
    // sem cliente — fluxo de visitante
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteHeader isLoggedIn={isLoggedIn} firstName={firstName} />

      <main className="flex-1">
        <Hero isLoggedIn={isLoggedIn} firstName={firstName} />
        <TutorPreviewMock />
        <ChannelsSection />
        <MethodSection />
        <CefisSection isLoggedIn={isLoggedIn} />
        <FeaturesSection />
        <FinalCta isLoggedIn={isLoggedIn} firstName={firstName} />
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────

function SiteHeader({ isLoggedIn, firstName }: { isLoggedIn: boolean; firstName: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-900 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight transition-opacity hover:opacity-80"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
            <Compass className="h-4 w-4" />
          </span>
          <span>
            Bússola<span className="text-zinc-400 dark:text-zinc-600">.ai</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <NavLink href="/tutor">Tutor</NavLink>
          {isLoggedIn && <NavLink href="/plano">Plano</NavLink>}
          <NavLink href="/agentes">Agentes</NavLink>
          <NavLink href="/docs">Docs</NavLink>
          {isLoggedIn ? (
            <Link
              href="/tutor"
              className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 sm:px-4 sm:text-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                Continuar{firstName ? `, ${firstName}` : ""}
              </span>
              <span className="sm:hidden">Continuar</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 sm:px-4 sm:text-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Entrar com CEFIS</span>
              <span className="sm:hidden">Entrar</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 sm:px-3 sm:text-sm"
    >
      {children}
    </Link>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────

function Hero({ isLoggedIn, firstName }: { isLoggedIn: boolean; firstName: string | null }) {
  return (
    <section className="relative overflow-hidden">
      <BackgroundGlow />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-6 py-16 text-center sm:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Sparkles className="h-3 w-3" />
          <span>Hackathon CEFIS · 2026</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Estude com IA{" "}
          <span className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-emerald-400 dark:to-teal-400">
            sem desculpa
          </span>
          .
        </h1>

        <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">
          A Bússola combina as{" "}
          <strong className="text-zinc-900 dark:text-zinc-50">
            melhores práticas globais de aprendizagem corporativa
          </strong>
          {" "}— repetição espaçada, microlearning, deep-link no segundo exato da aula, gamificação
          com Jornada do Herói e atendimento em{" "}
          <strong className="text-zinc-900 dark:text-zinc-50">quatro canais</strong>{" "}
          (app, web, WhatsApp e grupo), utilizando como parceria a melhor plataforma de ensino
          atual:{" "}
          <strong className="text-emerald-700 dark:text-emerald-300">CEFIS</strong>.
          Absorção fácil, evolução medida.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          {isLoggedIn ? (
            <>
              <Link
                href="/tutor"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-7 text-base font-semibold text-zinc-50 shadow-lg shadow-zinc-900/10 transition-all hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:shadow-zinc-50/10 dark:hover:bg-zinc-200"
              >
                Continuar{firstName ? `, ${firstName}` : ""}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/plano"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-7 text-base font-medium transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-900"
              >
                Ver meu plano
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-7 text-base font-semibold text-zinc-50 shadow-lg shadow-zinc-900/10 transition-all hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:shadow-zinc-50/10 dark:hover:bg-zinc-200"
              >
                Entrar com CEFIS
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tutor"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-7 text-base font-medium transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-900"
              >
                Ver tutor sem login
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 pt-2">
          <InstallCta variant="ghost" />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
            Instale na tela inicial — abre como app, sem perder espaço no celular.
          </p>
        </div>
      </div>
    </section>
  );
}

function BackgroundGlow() {
  return (
    <>
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute -right-16 top-32 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
      <div
        className="pointer-events-none absolute inset-0 text-zinc-900 opacity-[0.05] dark:text-zinc-100 dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
    </>
  );
}

// ─── 4 Canais ─────────────────────────────────────────────────────────

function ChannelsSection() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-900/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <SectionHeader
          eyebrow="4 canais. Zero fricção."
          title="A Bússola te alcança onde você estiver."
          subtitle="Mesma tutora, mesma memória do seu plano, mesma citação no segundo exato — só muda a porta de entrada."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ChannelCard
            icon={<Smartphone className="h-5 w-5" />}
            accent="from-emerald-400 to-teal-600"
            title="Aplicativo"
            text="Instale na tela inicial do celular — vira app. Funciona offline para navegar o plano e abre cada aula no segundo exato."
            tag="PWA"
          />
          <ChannelCard
            icon={<Globe className="h-5 w-5" />}
            accent="from-sky-400 to-indigo-600"
            title="Página web"
            text="Acesse pelo navegador, em qualquer máquina. Chat completo, sidebar de cursos indexados, deep-link para o player CEFIS."
            tag="Sempre online"
          />
          <ChannelCard
            icon={<MessageCircle className="h-5 w-5" />}
            accent="from-green-400 to-emerald-600"
            title="WhatsApp"
            text="Envie sua dúvida pelo zap e receba a resposta com o link da aula. O número fica salvo no onboarding — um clique e a Bússola te chama."
            tag="Conversa natural"
          />
          <ChannelCard
            icon={<Users className="h-5 w-5" />}
            accent="from-violet-400 to-fuchsia-600"
            title="Grupo no WhatsApp"
            text="Plano empresarial: grupo do seu time onde a Bússola entra como tutora coletiva — perguntas viram aprendizado compartilhado."
            tag="Empresarial"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Method ─────────────────────────────────────────────────────────

function MethodSection() {
  return (
    <section className="border-b border-zinc-200 dark:border-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <SectionHeader
          eyebrow="Metodologia"
          title="Aprendizagem com base nas melhores práticas globais."
          subtitle="Microlearning, repetição espaçada, contextualização — empacotados em um produto que conversa com você."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MethodCard
            emoji="🧠"
            title="Microlearning ativo"
            text="Cada item do plano cabe em 5-30 minutos. Você responde à tutora, ela cita a aula no segundo certo, você aplica no contexto real do dia."
          />
          <MethodCard
            emoji="🔁"
            title="Repetição espaçada"
            text="A Bússola sabe o que você já viu e quando. Lembretes pelo WhatsApp na sua janela de disponibilidade, com revisão em intervalos cientificamente otimizados."
          />
          <MethodCard
            emoji="🎯"
            title="Diagnóstico contínuo"
            text="O agente de diagnóstico decompõe seu objetivo em sub-habilidades mensuráveis. O plano se ajusta conforme você evolui — nada de receita pronta."
          />
          <MethodCard
            emoji="📺"
            title="Conteúdo CEFIS de verdade"
            text="Indexamos as transcrições com pgvector. Cada citação aponta o vídeo no minuto exato — você não perde 10 minutos procurando o trecho certo."
          />
          <MethodCard
            emoji="🏆"
            title="Gamificação significativa"
            text="Jornada do Herói em 5 níveis (Aprendiz → Lenda), XP por engajamento real, streak diário. Não é badge enfeite — é métrica de constância."
          />
          <MethodCard
            emoji="🤝"
            title="Aprendizagem social"
            text="No plano empresarial, a Bússola entra no seu grupo WhatsApp como tutora coletiva. Dúvida de um vira referência de todos, sem sair do canal que o time já usa."
          />
        </div>
      </div>
    </section>
  );
}

function MethodCard({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-900 dark:bg-zinc-950 dark:shadow-none dark:hover:border-emerald-700/60">
      <div className="text-3xl" aria-hidden>
        {emoji}
      </div>
      <h3 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{text}</p>
    </div>
  );
}

// ─── CEFIS ────────────────────────────────────────────────────────────

function CefisSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/60 p-8 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-zinc-950 dark:to-emerald-950/20 sm:p-12">
          <div className="pointer-events-none absolute -right-12 -top-12 text-[200px] leading-none opacity-[0.06] dark:opacity-[0.08]">
            🎓
          </div>

          <div className="relative grid gap-8 md:grid-cols-[2fr_1fr] md:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                Integração nativa
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                Integrada à{" "}
                <span className="bg-gradient-to-br from-emerald-600 to-teal-700 bg-clip-text text-transparent dark:from-emerald-300 dark:to-teal-400">
                  CEFIS
                </span>{" "}
                — a melhor plataforma de ensino contábil do Brasil.
              </h2>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-base">
                Faça login com a sua conta CEFIS e a Bússola passa a conhecer o seu catálogo
                de cursos, suas aulas e o seu progresso. Cada resposta vem com{" "}
                <strong className="text-zinc-900 dark:text-zinc-50">
                  link direto para o player no segundo exato
                </strong>{" "}
                — basta clicar e estudar.
              </p>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <CheckLine>
                  Single sign-on com CEFIS — sem cadastro novo, sem senha extra.
                </CheckLine>
                <CheckLine>
                  Catálogo CEFIS indexado por transcrição, busca semântica em segundos.
                </CheckLine>
                <CheckLine>
                  Plano de estudo gerado misturando aulas reais + conteúdo IA sob demanda.
                </CheckLine>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/plano"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
                  >
                    Abrir meu plano
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/tutor"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-900"
                  >
                    Conversar no tutor
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
                  >
                    Entrar com CEFIS
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/tutor"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-900"
                  >
                    Testar antes
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
          <path
            d="M3 8 L7 12 L13 4"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

// ─── Features ─────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="border-t border-zinc-200 dark:border-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <SectionHeader
          eyebrow="Como funciona"
          title="Três pilares que tiram a sua desculpa para não estudar."
          subtitle="Diagnóstico rápido, plano realista, citação que abre o vídeo. Sem floreio."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Feature
            icon="🎯"
            title="Diagnóstico em 2 min"
            text="5 perguntas no chat, sem formulário, sem fricção. A Bússola já entende o seu objetivo, o seu tempo e o seu canal."
          />
          <Feature
            icon="🗺️"
            title="Plano da sua semana"
            text="Aulas reais da CEFIS misturadas com reforço IA, no horário que cabe na sua rotina. Streak diário, XP e lembrete pelo WhatsApp."
          />
          <Feature
            icon="▶"
            title="Cita o segundo exato"
            text="O tutor responde citando a aula e o minuto em que aquilo é explicado — você clica e abre o player CEFIS no ponto certo."
          />
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────

function FinalCta({ isLoggedIn, firstName }: { isLoggedIn: boolean; firstName: string | null }) {
  if (isLoggedIn) {
    return (
      <section className="border-t border-zinc-200 dark:border-zinc-900">
        <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Bem-vindo de volta{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-300">
            Continue de onde parou — converse com o tutor, gere o estudo do dia ou abra o plano da semana.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/tutor"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              <Sparkles className="h-4 w-4" />
              Conversar com o tutor
            </Link>
            <Link
              href="/plano"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-7 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-900"
            >
              Ver meu plano
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-zinc-200 dark:border-zinc-900">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Hora de fazer acontecer.
        </h2>
        <p className="mt-3 text-zinc-600 dark:text-zinc-300">
          Entre com CEFIS, informe o seu objetivo e o seu WhatsApp. Em 2 minutos você sai com
          plano, link no segundo certo e a Bússola te chamando pelo WhatsApp.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-7 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
          >
            <LogIn className="h-4 w-4" />
            Começar com CEFIS
          </Link>
          <Link
            href="/tutor"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-7 text-sm font-medium transition-all hover:-translate-y-0.5 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:hover:bg-zinc-900"
          >
            Conhecer o tutor
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────

function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Compass className="h-3.5 w-3.5" />
          Bússola · Hackathon CEFIS · 26/05/2026 · Projeto solo
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
          <Link href="/tutor" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Tutor
          </Link>
          <Link href="/agentes" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Agentes
          </Link>
          <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Docs
          </Link>
          <Link href="/sobre" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Portfólio
          </Link>
          <Link href="/admin" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mx-auto max-w-2xl text-center">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">{subtitle}</p>
    </header>
  );
}

function ChannelCard({
  icon,
  accent,
  title,
  text,
  tag,
}: {
  icon: React.ReactNode;
  accent: string;
  title: string;
  text: string;
  tag: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-900 dark:bg-zinc-950 dark:shadow-none dark:hover:border-zinc-800">
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-25`}
      />
      <div className="relative">
        <div className="flex items-start justify-between">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md`}
          >
            {icon}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            {tag}
          </span>
        </div>
        <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {text}
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm dark:border-zinc-900 dark:bg-zinc-950 dark:shadow-none">
      <div className="text-2xl" aria-hidden>
        {icon}
      </div>
      <p className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">{title}</p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}
