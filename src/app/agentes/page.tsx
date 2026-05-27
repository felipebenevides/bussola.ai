import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Target,
  Timer,
  Wand2,
} from "lucide-react";

export const metadata = {
  title: "Bússola · Agentes",
  description: "Os 6 agentes especializados da Bússola — onboarding, diagnóstico, curador, tutor, quick-learn e gerador de conteúdo.",
};

interface AgentDef {
  num: number;
  slug: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  accent: string; // tailwind gradient
  endpoint: string;
  page: string | null;
  pageLabel: string | null;
  inputs: string;
  outputs: string;
  description: string;
  tags: string[];
  status: "ativo" | "killer" | "beta";
}

const AGENTS: AgentDef[] = [
  {
    num: 1,
    slug: "onboarding",
    name: "Onboarding",
    role: "Coletar perfil do aluno",
    icon: <GraduationCap className="h-6 w-6" />,
    accent: "from-emerald-400 to-teal-600",
    endpoint: "/api/onboarding",
    page: "/onboarding",
    pageLabel: "abrir onboarding",
    inputs: "Conversa em até 4 perguntas",
    outputs: "user_profile + 1 skill_assessment inicial",
    description:
      "Agente conversacional que extrai goal, disponibilidade diária, deadline, estilo de aprendizagem e área de maior fraqueza. Tom acolhedor, 1 pergunta por turno.",
    tags: ["goal", "minutes/day", "deadline", "learning_style", "weak_area"],
    status: "ativo",
  },
  {
    num: 2,
    slug: "diagnostic",
    name: "Diagnóstico",
    role: "Mapear lacunas reais",
    icon: <Target className="h-6 w-6" />,
    accent: "from-amber-400 to-orange-600",
    endpoint: "/api/diagnostic",
    page: "/diagnostico",
    pageLabel: "fazer diagnóstico",
    inputs: "Goal do perfil",
    outputs: "4-6 skill_assessment rows classificadas",
    description:
      "Decompõe o objetivo em sub-habilidades concretas. O aluno auto-avalia cada uma com slider 0-100; o sistema classifica em domina / lacuna parcial / lacuna crítica.",
    tags: ["adaptativo", "score 0-100", "importance 1-10"],
    status: "ativo",
  },
  {
    num: 3,
    slug: "curator",
    name: "Curador",
    role: "Montar plano de estudos",
    icon: <Sparkles className="h-6 w-6" />,
    accent: "from-violet-400 to-fuchsia-600",
    endpoint: "/api/curator/generate-plan",
    page: "/plano",
    pageLabel: "ver meu plano",
    inputs: "Perfil + skills + (opcional) curso CEFIS escolhido",
    outputs: "study_plan + 4-7 plan_items com deep-link",
    description:
      "Mistura cefis_lesson (com timestamp), cefis_track, generated_pdf/podcast/quiz/summary. Adapta a fonte ao learning_style: visual → vídeo, auditory → podcast, kinesthetic → quiz.",
    tags: ["mode=auto", "mode=course", "mode=custom", "1 semana"],
    status: "ativo",
  },
  {
    num: 4,
    slug: "tutor",
    name: "Tutor",
    role: "Q&A com RAG (killer feature)",
    icon: <MessageSquare className="h-6 w-6" />,
    accent: "from-emerald-500 to-cyan-600",
    endpoint: "/api/tutor",
    page: "/tutor",
    pageLabel: "conversar com o tutor",
    inputs: "Pergunta livre (web ou WhatsApp)",
    outputs: "Resposta + citações com deep-link mm:ss",
    description:
      "Embed da query → pgvector → LLM responde citando o segundo EXATO da aula CEFIS. Funciona logado ou anônimo. Pode ser escopado por curso ou por plano selecionado.",
    tags: ["RAG", "deep-link", "WhatsApp", "anônimo OK"],
    status: "killer",
  },
  {
    num: 5,
    slug: "quick-learn",
    name: "Quick-Learn",
    role: "X minutos para entender Y",
    icon: <Timer className="h-6 w-6" />,
    accent: "from-sky-400 to-indigo-600",
    endpoint: "/api/quick-learn",
    page: null,
    pageLabel: null,
    inputs: "{ topic, minutes }",
    outputs: "Resumo IA calibrado pelo tempo + citações",
    description:
      "1 minuto → 1 bullet curto. 5 minutos → 3 bullets densos. 30 minutos → 6 bullets profundos com exemplos práticos. Sempre com takeaway central.",
    tags: ["calibrado", "1-60 min", "highlights"],
    status: "ativo",
  },
  {
    num: 6,
    slug: "content-generator",
    name: "Gerador de Conteúdo",
    role: "Materializar resumos e quizzes",
    icon: <Wand2 className="h-6 w-6" />,
    accent: "from-rose-400 to-pink-600",
    endpoint: "/api/generate-content",
    page: null,
    pageLabel: null,
    inputs: "plan_item_id (source = generated_*) ou { topic, kind }",
    outputs: "generated_content (markdown ou quiz JSON)",
    description:
      "Quiz: 3-5 questões múltipla escolha + explicação. Resumo: markdown com seções H2 e bloco 'para praticar'. Sempre rastreável (source_lesson_ids).",
    tags: ["summary", "quiz", "pdf", "rastreável"],
    status: "ativo",
  },
];

const STATUS_BADGE: Record<AgentDef["status"], { label: string; classes: string }> = {
  ativo: {
    label: "ativo",
    classes:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  killer: {
    label: "killer feature",
    classes:
      "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm",
  },
  beta: {
    label: "beta",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
};

export default function AgentesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden>🧭</span>
          <span>Bússola</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/tutor" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Tutor
          </Link>
          <Link href="/plano" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Plano
          </Link>
          <Link href="/sobre" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Sobre
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="space-y-4 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Arquitetura
        </p>
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Os <span className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 bg-clip-text text-transparent">6 agentes</span> da Bússola
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Cada agente tem um papel específico na jornada do aluno e compartilham a mesma
          infraestrutura: pgvector no Supabase, embeddings Google/OpenAI, e Vercel AI SDK com
          fallback automático. Funcionam isolados ou em cadeia.
        </p>
      </section>

      {/* Flow diagram */}
      <FlowDiagram />

      {/* Grid de agentes */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Detalhe de cada agente
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <AgentCard key={a.slug} agent={a} />
          ))}
        </div>
      </section>

      {/* Infra comum */}
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Infra compartilhada
        </h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <InfraItem
            label="Embeddings"
            value="Google gemini-embedding-001"
            sub="1536 dim, fallback OpenAI"
          />
          <InfraItem
            label="LLM"
            value="Vercel AI SDK"
            sub="OpenRouter → OpenAI fallback"
          />
          <InfraItem
            label="Vector store"
            value="Supabase pgvector"
            sub="match_lesson_chunks RPC"
          />
          <InfraItem
            label="Settings"
            value="bussola.app_settings"
            sub="chaves no DB, não em env"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-500">
        Projeto solo · Hackathon CEFIS · 26/05/2026
      </footer>
    </main>
  );
}

function FlowDiagram() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Como eles se conectam
      </h2>

      <div className="flex flex-col gap-4">
        {/* Linear chain: onboarding → diagnostic → curator */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <FlowNode emoji="🎓" label="Onboarding" accent="from-emerald-400 to-teal-600" />
          <FlowArrow />
          <FlowNode emoji="🎯" label="Diagnóstico" accent="from-amber-400 to-orange-600" />
          <FlowArrow />
          <FlowNode emoji="✨" label="Curador" accent="from-violet-400 to-fuchsia-600" />
        </div>

        <div className="my-2 flex justify-center">
          <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Triangle: tutor ↔ quick-learn → content-generator */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <FlowNode emoji="💬" label="Tutor" accent="from-emerald-500 to-cyan-600" badge="killer" />
          <FlowArrow bidirectional />
          <FlowNode emoji="⏱️" label="Quick-Learn" accent="from-sky-400 to-indigo-600" />
          <FlowArrow />
          <FlowNode emoji="🪄" label="Gerador" accent="from-rose-400 to-pink-600" />
        </div>

        <p className="mt-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Perfil flui para a direita; uma vez gerado o plano, Tutor e Quick-Learn podem ser usados a
          qualquer momento. Quando o plano referencia conteúdo IA, o Gerador materializa sob demanda.
        </p>
      </div>
    </section>
  );
}

function FlowNode({
  emoji,
  label,
  accent,
  badge,
}: {
  emoji: string;
  label: string;
  accent: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-2xl text-white shadow-md`}
      >
        {emoji}
      </span>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {label}
        </span>
        {badge && (
          <span className="rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function FlowArrow({ bidirectional }: { bidirectional?: boolean }) {
  return (
    <ArrowRight
      className={`h-4 w-4 text-zinc-400 ${bidirectional ? "rotate-0" : ""}`}
      aria-hidden
    />
  );
}

function AgentCard({ agent }: { agent: AgentDef }) {
  const badge = STATUS_BADGE[agent.status];
  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900`}
    >
      {/* gradient stripe */}
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${agent.accent}`}
        aria-hidden
      />

      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${agent.accent} text-white shadow-md`}
          >
            {agent.icon}
          </span>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Agente #{agent.num}
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {agent.name}
            </h3>
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badge.classes}`}
        >
          {badge.label}
        </span>
      </header>

      <p className="mt-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {agent.role}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {agent.description}
      </p>

      <dl className="mt-4 space-y-2 text-[11px]">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-zinc-500">
            Input
          </dt>
          <dd className="text-zinc-700 dark:text-zinc-300">{agent.inputs}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-zinc-500">
            Output
          </dt>
          <dd className="text-zinc-700 dark:text-zinc-300">{agent.outputs}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold uppercase tracking-wider text-zinc-500">
            Endpoint
          </dt>
          <dd className="font-mono text-zinc-700 dark:text-zinc-300">{agent.endpoint}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {t}
          </span>
        ))}
      </div>

      {agent.page && agent.pageLabel && (
        <Link
          href={agent.page}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
        >
          {agent.pageLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </article>
  );
}

function InfraItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      <div className="text-[10px] text-zinc-500">{sub}</div>
    </div>
  );
}
