import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  Brain,
  Building2,
  Cloud,
  Code2,
  Database,
  GitBranch,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  MessagesSquare,
  Phone,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar } from "./avatar";

export const metadata = {
  title: "Felipe Benevides — Engineering Manager & Full Stack",
  description:
    "Portfólio de Felipe Benevides — Gerente de Engenharia / Full Stack Sênior. C#, .NET, Node.js, React, Next.js, AWS e liderança técnica.",
};

const PHOTO_PATH = "/felipe.jpg";

const STACK = [
  {
    icon: Code2,
    title: "Linguagens & Frameworks",
    accent: "from-emerald-500 to-teal-600",
    items: [
      "C#",
      ".NET Core",
      "Node.js",
      "Elixir",
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Redux Saga",
      "Angular",
      "Flutter",
    ],
  },
  {
    icon: Layers,
    title: "Arquitetura & Padrões",
    accent: "from-sky-500 to-indigo-600",
    items: [
      "Hexagonal",
      "Serverless",
      "Event-Driven",
      "Microsserviços",
      "Monolitos",
      "Dapper",
      "EF Core",
    ],
  },
  {
    icon: Cloud,
    title: "Cloud & DevOps",
    accent: "from-amber-500 to-orange-600",
    items: ["AWS EC2", "S3", "RDS PostgreSQL", "Route53", "Load Balancer", "DataDog"],
  },
  {
    icon: Database,
    title: "Bancos & Mensageria",
    accent: "from-violet-500 to-fuchsia-600",
    items: [
      "PostgreSQL",
      "SQL Server",
      "Oracle",
      "MongoDB",
      "Redis",
      "RabbitMQ",
      "REST APIs",
    ],
  },
  {
    icon: Brain,
    title: "Inteligência Artificial",
    accent: "from-pink-500 to-rose-600",
    items: ["OpenAI", "RAG", "Embeddings", "LLM tooling", "Vector search", "Supabase pgvector"],
  },
  {
    icon: Users,
    title: "Liderança & Gestão",
    accent: "from-cyan-500 to-blue-600",
    items: [
      "Engineering Management",
      "Team Building",
      "Cultura 1:1",
      "Decisão Estratégica",
      "Scrum",
      "Métricas de performance",
    ],
  },
];

const RESERVABOT_CLIENTS = [
  { name: "Drogaria PoupAgora", url: "https://www.drogariapoupagora.com.br" },
  { name: "Drogaria Portal Farma", url: "https://www.drogariaportalfarma.com.br" },
  { name: "Drogaria Leal", url: "https://www.drogarialeal.com.br" },
];

const PROJECTS = [
  {
    name: "Bússola",
    period: "2026 · Hackathon CEFIS",
    role: "Solo · Product + Engineering",
    description:
      "Tutora de IA que indexa o catálogo CEFIS por transcrição e responde abrindo o vídeo da aula no segundo exato (deep-link). Onboarding conversacional, plano de estudos gerado e canal WhatsApp via Evolution API.",
    stack: ["Next.js 16", "Supabase + pgvector", "OpenAI", "OpenRouter", "Evolution API", "Bun"],
    href: "/",
    cta: "Abrir Bússola",
    clients: undefined as { name: string; url: string }[] | undefined,
  },
  {
    name: "ReservaBot Flex",
    period: "Produto · em produção",
    role: "Founder · Product + Engineering",
    description:
      "Plataforma de reserva e atendimento automatizado para drogarias — bot conversacional integrado ao WhatsApp do estabelecimento, gestão de produtos e fluxo de retirada. Em operação real com rede de farmácias independentes.",
    stack: ["Next.js", "Node.js", "WhatsApp API", "PostgreSQL", "SaaS B2B"],
    href: "https://www.reservabotflex.com.br",
    cta: "reservabotflex.com.br",
    external: true,
    clients: RESERVABOT_CLIENTS,
  },
  {
    name: "IZA",
    period: "2022 — atual",
    role: "Tech Manager · Engineering AI",
    description:
      "Reestruturação da plataforma com foco em escala, segurança e observabilidade. Liderança do time de engenharia ponta a ponta — contratação, mentoria, métricas e parceria estratégica com C-Level reportando direto ao CEO.",
    stack: [
      "C#",
      "Elixir",
      "Python",
      "Node.js",
      "RabbitMQ",
      "PostgreSQL",
      "Redis",
      "AWS",
      "DataDog",
      "Next.js",
      "Flutter",
    ],
    href: "https://iza.com.vc",
    cta: "iza.com.vc",
    external: true,
  },
  {
    name: "Itaú Unibanco",
    period: "2020 — 2022",
    role: "Engenheiro de Software Sênior",
    description:
      "Engenharia de sistemas para fundos de índice (ETFs) de alto impacto no mercado financeiro. Participação no lançamento de produtos de grande visibilidade — NYFANGT (Teck11) e Morningstars (HTECK11) — com foco em estabilidade e performance transacional.",
    stack: ["C#", ".NET Core", "SQL Server", "Mercado financeiro"],
  },
  {
    name: "Imobi Places",
    period: "2020 — 2021",
    role: "Engenheiro de Software Sênior",
    description:
      "Design de arquitetura em nuvem (AWS) com Arquitetura Hexagonal. Modelagem de queries complexas e persistência otimizada via Dapper e EF Core. Setup completo de ambiente EC2 / Load Balancer / S3 / RDS / Route53.",
    stack: [".NET Core 3.1", "EF Core", "Dapper", "AWS"],
  },
  {
    name: "LTM Fidelidade",
    period: "2019 — 2020",
    role: "Engenheiro de Software Sênior",
    description:
      "Engenharia de projetos no mercado de fidelização de clientes. Backend em .NET com persistência mista (SQL Server + MongoDB) e frontend React com Redux Saga.",
    stack: [".NET Core", "SQL Server", "MongoDB", "React", "Redux Saga"],
  },
  {
    name: "BTG Pactual",
    period: "2019",
    role: "Analista de Sistemas",
    description:
      "Desenvolvimento e manutenção de sistemas essenciais para operações bancárias — stack heterogênea com .NET, React/Angular e bancos relacionais clássicos.",
    stack: [".NET Core", "C#", "React", "Angular", "SQL Server", "Oracle", "AWS"],
  },
];

const CERTIFICATIONS = [
  { title: "AWS CTO Fellowship", year: "2024", issuer: "Amazon Web Services" },
  { title: "Scrum Foundation", year: "", issuer: "" },
];

const EDUCATION = [
  {
    title: "Pós-graduação em Liderança e Gestão em Tecnologia",
    institution: "Escola Conquer",
    period: "Concluído em set/2023",
  },
  {
    title: "Bacharelado em Engenharia de Computação",
    institution: "Centro Universitário FIEO",
    period: "2013 — 2017",
  },
];

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-900">
        <BackgroundGlow />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:py-24 md:grid-cols-[auto_1fr] md:items-center md:gap-14">
          <Avatar src={PHOTO_PATH} initials="FB" />

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Engineering Manager · Full Stack Sênior</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Felipe
              <br />
              <span className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 bg-clip-text text-transparent dark:from-emerald-300 dark:via-emerald-400 dark:to-teal-500">
                Benevides
              </span>
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-lg">
              Engenheiro de software com trajetória do{" "}
              <strong className="text-zinc-950 dark:text-white">back/full-stack</strong> até
              liderança — Tech Lead e Engineering Manager. Setores de alta criticidade: meios de
              pagamento, mercado financeiro, imobiliário, fidelização e seguros. Paixão por{" "}
              <strong className="text-zinc-950 dark:text-white">IA aplicada</strong> e
              arquiteturas complexas, sem dogma — monolito quando o contexto pede.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="mailto:felipebenevides@outlook.com"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
              >
                <Mail className="h-4 w-4" />
                Falar comigo
              </a>
              <a
                href="https://linkedin.com/in/eng-felipebenevides"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <span className="text-emerald-600 dark:text-emerald-400">in</span>
                LinkedIn
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </a>
              <Link
                href="/tutor"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-5 text-sm font-medium text-emerald-800 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/70"
              >
                <MessagesSquare className="h-4 w-4" />
                Ver Bússola em ação
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-4 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                São Paulo, Brasil
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                (11) 99904-6971
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                felipebenevides@outlook.com
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Stack ─── */}
      <section className="border-b border-zinc-200 dark:border-zinc-900">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeader
            eyebrow="Stack & especialidades"
            title="Onde sou produtivo"
            subtitle="Habilidades técnicas e áreas onde entrego com profundidade — sem inventar buzzword."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STACK.map((cat) => (
              <StackCard key={cat.title} category={cat} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Projetos ─── */}
      <section className="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-900 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeader
            eyebrow="Projetos em destaque"
            title="Coisas que coloquei no mundo"
            subtitle="Da Bússola, esse hackathon, até produtos de mercado financeiro de alta visibilidade."
          />

          <div className="space-y-4">
            {PROJECTS.map((p, i) => (
              <ProjectRow key={p.name} project={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Certificações & Formação ─── */}
      <section className="border-b border-zinc-200 dark:border-zinc-900">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:py-20 md:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Certificações"
              title="Selos formais"
              subtitle="Programas de fellowship e fundamentos validados."
              compact
            />
            <ul className="mt-6 space-y-3">
              {CERTIFICATIONS.map((c) => (
                <li
                  key={c.title}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-900 dark:bg-zinc-900/40 dark:shadow-none"
                >
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-600 dark:text-amber-400">
                    <Award className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.title}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {[c.issuer, c.year].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <SectionHeader
              eyebrow="Formação"
              title="Acadêmico"
              subtitle="Onde estudei o jogo formal de engenharia e liderança."
              compact
            />
            <ul className="mt-6 space-y-3">
              {EDUCATION.map((e) => (
                <li
                  key={e.title}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-900 dark:bg-zinc-900/40 dark:shadow-none"
                >
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/20 to-indigo-600/10 text-sky-600 dark:text-sky-400">
                    <GraduationCap className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {e.title}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {e.institution} · {e.period}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-white dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Felipe Benevides
            </div>
            <p className="mt-1 max-w-md text-xs text-zinc-500">
              Bora trocar uma ideia? Mando café, papo sobre arquitetura, IA aplicada ou
              construção de time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <FooterLink href="mailto:felipebenevides@outlook.com" icon={Mail}>
              felipebenevides@outlook.com
            </FooterLink>
            <FooterLink href="tel:+5511999046971" icon={Phone}>
              (11) 99904-6971
            </FooterLink>
            <FooterLink
              href="https://linkedin.com/in/eng-felipebenevides"
              icon={GitBranch}
              external
            >
              linkedin/eng-felipebenevides
            </FooterLink>
            <FooterLink href="/" icon={Building2}>
              Bússola.app
            </FooterLink>
          </div>
        </div>
        <div className="border-t border-zinc-200 py-4 text-center text-[10px] text-zinc-400 dark:border-zinc-900 dark:text-zinc-600">
          © {new Date().getFullYear()} Felipe Benevides · construído em Next.js + Tailwind
        </div>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function BackgroundGlow() {
  return (
    <>
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
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

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  compact,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <header className={compact ? "mb-2" : "mb-10 max-w-2xl"}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
    </header>
  );
}

function StackCard({ category }: { category: (typeof STACK)[number] }) {
  const Icon = category.icon;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-900 dark:bg-zinc-900/40 dark:shadow-none dark:hover:border-zinc-800 dark:hover:bg-zinc-900/70">
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${category.accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-20`}
      />
      <div className="relative">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${category.accent} text-white shadow-lg`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {category.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {category.items.map((item) => (
            <span
              key={item}
              className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  index,
}: {
  project: (typeof PROJECTS)[number];
  index: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-900 dark:bg-gradient-to-br dark:from-zinc-900/60 dark:to-zinc-950/40 dark:shadow-none dark:hover:border-emerald-900/60 dark:hover:from-zinc-900/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-600">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {project.name}
            </h3>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              {project.period}
            </span>
          </div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {project.role}
          </p>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {project.description}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-400"
              >
                {s}
              </span>
            ))}
          </div>

          {project.clients && project.clients.length > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                Clientes em produção
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.clients.map((c) => (
                  <a
                    key={c.url}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] text-emerald-800 transition-colors hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-zinc-950/60 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/60"
                  >
                    <span>{c.name}</span>
                    <ArrowUpRight className="h-3 w-3 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {project.href && (
          <div className="shrink-0">
            {project.external ? (
              <a
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-900 transition-colors hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-800 dark:hover:text-emerald-300"
              >
                {project.cta}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link
                href={project.href}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
              >
                {project.cta}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function FooterLink({
  href,
  icon: Icon,
  children,
  external,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-emerald-300";
  const content = (
    <>
      <Icon className="h-3.5 w-3.5 opacity-70" />
      <span>{children}</span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
