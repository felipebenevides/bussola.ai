import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação — Bússola",
  description:
    "Documentação técnica completa do Bússola: arquitetura, stack, RAG, schema, fluxos, integrações e regras de negócio.",
};

interface Section {
  id: string;
  title: string;
  subtitle?: string;
}

const SECTIONS: Section[] = [
  { id: "visao-geral", title: "1. Visão geral", subtitle: "O que é a Bússola" },
  { id: "killer-feature", title: "2. Killer feature", subtitle: "Deep-link no segundo" },
  { id: "stack", title: "3. Stack técnica", subtitle: "Next.js, Supabase, OpenAI" },
  { id: "arquitetura", title: "4. Arquitetura", subtitle: "Diagrama macro" },
  { id: "fluxos", title: "5. Fluxos do usuário", subtitle: "Login, onboarding, tutor, plano" },
  { id: "rag", title: "6. RAG", subtitle: "Embeddings + pgvector" },
  { id: "agentes", title: "7. Agentes de IA", subtitle: "Onboarding, curador, tutor" },
  { id: "schema", title: "8. Schema do banco", subtitle: "Tabelas e RPCs" },
  { id: "rotas", title: "9. Rotas e API", subtitle: "Páginas + endpoints" },
  { id: "cefis", title: "10. Integração CEFIS", subtitle: "API v1 + v3" },
  { id: "whatsapp", title: "11. WhatsApp", subtitle: "Serviço Bun + Evolution" },
  { id: "admin", title: "12. Backoffice /admin", subtitle: "Credenciais e modelos" },
  { id: "seguranca", title: "13. Segurança", subtitle: "Princípios + checklist" },
  { id: "negocio", title: "14. Regras de negócio", subtitle: "O que o produto faz e não faz" },
  { id: "numeros", title: "15. Números do sample", subtitle: "Métricas reais" },
  { id: "limitacoes", title: "16. Limitações", subtitle: "Escopo cortado, dívidas" },
  { id: "deploy", title: "17. Deploy & ambiente", subtitle: "Vercel + Railway + Supabase" },
];

export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6">
      <Header />

      <div className="flex flex-1 flex-col gap-8 py-8 lg:flex-row">
        <Toc />
        <article className="prose prose-zinc dark:prose-invert flex-1 space-y-16 text-zinc-800 dark:text-zinc-200">
          <Intro />
          <VisaoGeral />
          <KillerFeature />
          <Stack />
          <Arquitetura />
          <Fluxos />
          <Rag />
          <Agentes />
          <Schema />
          <Rotas />
          <Cefis />
          <Whatsapp />
          <Admin />
          <Seguranca />
          <Negocio />
          <Numeros />
          <Limitacoes />
          <Deploy />
          <Footer />
        </article>
      </div>
    </main>
  );
}

// ============================================================
// Layout
// ============================================================

function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden>🧭</span>
        <span>Bússola · Docs</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm sm:gap-3">
        <Link
          href="/tutor"
          className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Tutor
        </Link>
        <Link
          href="/plano"
          className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Plano
        </Link>
        <Link
          href="/admin"
          className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Admin
        </Link>
      </nav>
    </header>
  );
}

function Toc() {
  return (
    <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
        Sumário
      </p>
      <ol className="space-y-1 text-sm">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              <span className="block font-medium text-zinc-800 dark:text-zinc-200">
                {s.title}
              </span>
              {s.subtitle && (
                <span className="block text-[11px] text-zinc-500">{s.subtitle}</span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}

// ============================================================
// Helpers
// ============================================================

function SectionTitle({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <header id={id} className="scroll-mt-24">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
    </header>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-xs leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
      {children}
    </pre>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
      {children}
    </code>
  );
}

function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn" | "danger" | "success";
  title?: string;
  children: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    info: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    warn: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    danger: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
    success:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  };
  return (
    <div className={`rounded-lg border p-4 text-sm ${toneClasses[tone]}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-100 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Sections
// ============================================================

function Intro() {
  return (
    <section className="space-y-4 border-b border-zinc-200 pb-8 dark:border-zinc-800">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        Documentação técnica
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        🧭 Bússola — Tutor de IA CEFIS
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Tutor conversacional que combina catálogo CEFIS + RAG sobre transcrições + geração sob
        demanda. Cada citação abre o player no <strong>segundo exato</strong> da aula.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Tag>Hackathon CEFIS 2026</Tag>
        <Tag>Solo (Felipe Benevides)</Tag>
        <Tag>Deadline: 26/05/2026</Tag>
        <Tag>Premiação: R$ 10.000</Tag>
      </div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-300 bg-white px-2.5 py-0.5 font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
      {children}
    </span>
  );
}

// ── 1. Visão geral ──
function VisaoGeral() {
  return (
    <section className="space-y-5">
      <SectionTitle id="visao-geral" eyebrow="O produto" title="Visão geral" />
      <p>
        A <strong>Bússola</strong> é uma tutora de IA construída sobre o catálogo da CEFIS.
        O aluno conversa em português natural, e o agente responde citando aulas reais —
        cada citação vem com um link que abre o player CEFIS no segundo exato da explicação.
      </p>

      <h3 className="text-xl font-semibold">O que ela entrega na demo</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>/login</strong> — auth real contra a API CEFIS (cookie HttpOnly).
        </li>
        <li>
          <strong>/onboarding</strong> — chat curto (4-5 perguntas) que salva perfil + lacuna
          crítica.
        </li>
        <li>
          <strong>/plano</strong> — semana de estudos gerada por um Curador IA combinando
          aulas reais + reforço gerado.
        </li>
        <li>
          <strong>/tutor</strong> — chat estilo WhatsApp que responde com RAG sobre as
          transcrições, com sidebar de cursos e indexação on-demand.
        </li>
        <li>
          <strong>WhatsApp</strong> — a mesma experiência de tutor disponível via zap
          (serviço Bun separado em Railway).
        </li>
      </ul>

      <h3 className="text-xl font-semibold">Persona da demo</h3>
      <Callout tone="info" title="Contador querendo melhorar negociação">
        <p>
          A persona original (contador → tributário) foi pivotada porque o sample público de
          transcrições só tinha VTT do curso <strong>1132 — Negociação e Gestão de
          Conflitos (Metodologia Harvard)</strong>. Mantemos o universo CEFIS contabilista,
          mas a lacuna crítica vira <strong>negociação</strong> — encaixa no único conteúdo
          com transcrição real disponível.
        </p>
      </Callout>

      <h3 className="text-xl font-semibold">Critérios de avaliação (100 pts)</h3>
      <Table
        headers={["Critério", "Peso", "Onde a Bússola joga"]}
        rows={[
          ["Funcionalidade", "30", "Fluxo principal /login → /plano → /tutor online em Vercel"],
          ["Integração CEFIS", "25", "Auth real, catálogo via /api/v3, deep-link no segundo"],
          ["Qualidade da IA", "20", "RAG + structured output + fallback graceful"],
          ["Inovação", "15", "Deep-link no segundo exato + tutor no WhatsApp"],
          ["UX", "10", "Shell WhatsApp-dark, streaming, suggested questions"],
        ]}
      />
    </section>
  );
}

// ── 2. Killer feature ──
function KillerFeature() {
  return (
    <section className="space-y-5">
      <SectionTitle id="killer-feature" eyebrow="Diferencial" title="Killer feature: deep-link no segundo exato" />
      <p>
        Em vez de espalhar inovação em várias direções (podcast, “X min para Y”, gamificação),
        o produto foca em <strong>uma coisa que ninguém vai pensar</strong>: quando o tutor
        cita uma aula, o link abre o player CEFIS exatamente no momento da explicação.
      </p>

      <p className="font-medium">Como funciona</p>
      <ol className="ml-5 list-decimal space-y-1">
        <li>
          Transcrições <Code>.vtt</Code> são parseadas preservando timestamps por linha
          (cue).
        </li>
        <li>
          Cues são agrupados em chunks de ~800 caracteres, cada chunk guarda{" "}
          <Code>start_seconds</Code> e <Code>end_seconds</Code>.
        </li>
        <li>
          O embedding do chunk vai para <Code>pgvector</Code>.
        </li>
        <li>
          No tutor, o RAG retorna chunks com timestamp. O modelo cita o momento (
          <Code>mm:ss</Code>) e a UI renderiza um cartão <Code>▶ Abrir na CEFIS</Code> com
          deep-link <Code>?t=&lt;segundos&gt;</Code>.
        </li>
      </ol>

      <Pre>{`buildLessonDeepLink(courseId, lessonId, startSeconds)
  → https://cefis.com.br/curso/{courseId}/aula/{lessonId}?t={s}`}</Pre>

      <Callout tone="success" title="Por que isso ganha pontos">
        <p>
          Custa ~1h para implementar (vs ~2h de podcast generator), aproveita a única coisa
          única do sample (timestamps), entrega um “momento de uau” visual instantâneo
          (clica e abre no segundo) e nenhum competidor vai pensar nisso primeiro.
        </p>
      </Callout>
    </section>
  );
}

// ── 3. Stack ──
function Stack() {
  return (
    <section className="space-y-5">
      <SectionTitle id="stack" eyebrow="Tecnologia" title="Stack técnica" />
      <Table
        headers={["Camada", "Escolha", "Por quê"]}
        rows={[
          [
            "Framework",
            "Next.js 16 (App Router, RSC, src/)",
            "Streaming nativo, RSC para reduzir JS no cliente, integração 1-clique com Vercel",
          ],
          [
            "UI",
            "Tailwind v4 + componentes shadcn-like próprios",
            "Visual profissional sem dependência pesada; tema escuro grátis",
          ],
          [
            "IA",
            "Vercel AI SDK + OpenRouter (primário) + OpenAI (fallback)",
            "OpenRouter destrava trocar modelo ao vivo durante demo; OpenAI cobre Whisper/TTS/embeddings",
          ],
          [
            "Embeddings",
            "OpenAI text-embedding-3-small (ou Google gemini-embedding-001 a 1536d)",
            "1536 dims casam com pgvector; Google opcional via /admin",
          ],
          [
            "Banco",
            "Supabase Postgres + pgvector (schema dedicado bussola)",
            "Postgres + vetores + Storage + Auth em um único provider",
          ],
          [
            "Persistência de chat",
            "Tabela tutor_messages com citations jsonb",
            "Histórico opcional, best-effort (não bloqueia resposta)",
          ],
          [
            "WhatsApp",
            "Serviço Bun separado em Railway → Evolution API v2",
            "Workload long-running (webhooks contínuos) separado do Next.js stateless",
          ],
          ["Deploy", "Vercel (web) + Railway (services/wa)", "Edge-friendly + cron/long-running ao lado"],
        ]}
      />

      <h3 className="text-xl font-semibold">Decisões de modelo</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>Chat:</strong> <Code>gpt-4o-mini</Code> via OpenRouter (
          <Code>openai/gpt-4o-mini</Code>). Em falha, fallback transparente para OpenAI direto.
        </li>
        <li>
          <strong>Embeddings:</strong> sempre OpenAI ou Google direto — OpenRouter não cobre.
          Não misture providers (vetores de providers diferentes não são comparáveis e
          destroem o RAG).
        </li>
        <li>
          <strong>Whisper / TTS:</strong> sempre OpenAI direto.
        </li>
      </ul>
    </section>
  );
}

// ── 4. Arquitetura ──
function Arquitetura() {
  return (
    <section className="space-y-5">
      <SectionTitle id="arquitetura" eyebrow="Sistema" title="Arquitetura" />
      <p>
        Dois deploys independentes (web e WhatsApp) compartilham o mesmo Supabase. Toda
        credencial sensível vive na tabela <Code>app_settings</Code>; código nunca toca
        envs de chave de API em produção (exceto fallbacks).
      </p>
      <Pre>{`┌──────────────────────────────────────────────────────────────────┐
│                            BROWSER                                │
│                                                                   │
│   /                /login              /onboarding   /plano       │
│   /tutor (shell estilo WhatsApp)       /admin        /docs        │
│   /conectar-whatsapp                                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│             Next.js 16 (Vercel — RSC + Route Handlers)            │
│                                                                   │
│   /api/auth/*      (cefis-login, logout, me)                      │
│   /api/onboarding  (chat curto + save_profile tool)               │
│   /api/curator/generate-plan                                      │
│   /api/tutor       (RAG + structured output)                      │
│   /api/courses     (lista indexados + sample)                     │
│   /api/courses/ingest                                             │
│   /api/plan/*      (active, by id)                                │
│   /api/admin/*     (settings, ingest-sample)                      │
└────────────┬───────────────────────────────┬─────────────────────┘
             │                               │
             ▼                               ▼
   ┌──────────────────────┐       ┌──────────────────────┐
   │  Supabase (Postgres) │       │  AI providers        │
   │  schema "bussola"    │       │                      │
   │                      │       │  • OpenRouter (chat) │
   │  • users             │       │  • OpenAI (chat/emb/ │
   │  • user_profile      │       │     whisper/tts)     │
   │  • study_plan        │       │  • Google (emb)      │
   │  • plan_items        │       └──────────────────────┘
   │  • cefis_courses     │
   │  • cefis_lessons     │       ┌──────────────────────┐
   │  • cefis_lesson_     │       │  CEFIS API           │
   │     chunks (vector)  │       │                      │
   │  • cefis_course_     │       │  v1: /api/v1/login   │
   │     embeddings       │       │       (auth)         │
   │  • tutor_messages    │       │  v3: catálogo,       │
   │  • tutor_sessions    │       │      cursos, aulas,  │
   │  • app_settings      │       │      trilhas         │
   │  • whatsapp_link     │       └──────────────────────┘
   └──────────────────────┘
             ▲
             │
             │ (compartilha)
             │
┌────────────┴─────────────────────────────────────────────────────┐
│              services/wa — Bun service (Railway)                  │
│                                                                   │
│  POST /v1/evolution/webhook?secret=...                            │
│     ├─ HMAC check                                                 │
│     ├─ Resolve aluno via whatsapp_link                            │
│     ├─ Chama askTutor() reusando lib do app web                   │
│     └─ Envia resposta via Evolution API v2                        │
└──────────────────────────────────────────────────────────────────┘`}</Pre>

      <Callout tone="warn" title="Princípio de isolamento">
        <p>
          Tudo do app vive no schema <Code>bussola</Code> do Supabase. O cliente
          (<Code>src/lib/supabase.ts</Code>) é tipado <Code>SupabaseClient&lt;any,
          &quot;bussola&quot;, &quot;bussola&quot;&gt;</Code>, o que evita colidir com
          outros projetos hospedados no mesmo Supabase.
        </p>
      </Callout>
    </section>
  );
}

// ── 5. Fluxos ──
function Fluxos() {
  return (
    <section className="space-y-5">
      <SectionTitle id="fluxos" eyebrow="UX" title="Fluxos do usuário" />

      <h3 className="text-xl font-semibold">Fluxo principal (caminho feliz)</h3>
      <Pre>{`/  →  /login  →  /onboarding  →  /plano  →  /tutor
                                       │
                                       └─ (opcional) /conectar-whatsapp
                                               │
                                               └─ tutor no WhatsApp`}</Pre>

      <h3 className="text-xl font-semibold">/login — auth real CEFIS</h3>
      <ol className="ml-5 list-decimal space-y-1">
        <li>
          Form HTML simples (email + senha CEFIS).
        </li>
        <li>
          POST <Code>/api/auth/cefis-login</Code> →{" "}
          <Code>CefisClient.login()</Code> → API CEFIS v1.
        </li>
        <li>
          Upsert em <Code>bussola.users</Code> com{" "}
          <Code>cefis_user_id</Code>, <Code>cefis_api_key</Code>, etc.
        </li>
        <li>
          Set cookie <Code>bussola_session</Code> (HttpOnly, Secure, SameSite=Lax) com o
          UUID interno do user.
        </li>
        <li>Redirect para <Code>/onboarding</Code> ou <Code>/plano</Code>.</li>
      </ol>

      <h3 className="text-xl font-semibold">/onboarding — chat curto</h3>
      <p>
        Server pré-carrega o primeiro <Code>firstName</Code> do user. Componente cliente
        manda histórico de mensagens para <Code>/api/onboarding</Code>; rota gera a próxima
        pergunta com <Code>genObject</Code> + Zod até ter:
      </p>
      <ul className="ml-5 list-disc space-y-1">
        <li><Code>goal</Code> — objetivo de aprendizado</li>
        <li><Code>available_minutes_per_day</Code></li>
        <li><Code>learning_style</Code> (visual / auditory / kinesthetic / mixed)</li>
        <li>Lacuna crítica → grava <Code>skill_assessment</Code> com <Code>status=&apos;lacuna_critica&apos;</Code></li>
      </ul>
      <p>
        Quando o modelo retorna <Code>complete: true</Code>, o front mostra o CTA{" "}
        <strong>Gerar meu plano</strong>, que dispara{" "}
        <Code>POST /api/curator/generate-plan</Code>.
      </p>

      <h3 className="text-xl font-semibold">/plano — semana sob medida</h3>
      <p>
        Renderiza o plano ativo (<Code>study_plan</Code> + <Code>plan_items</Code>),
        agrupado por dia, com badges por <Code>source</Code> (aula CEFIS, trilha, resumo
        IA…). Cada item com <Code>cefis_course_id</Code> + <Code>cefis_lesson_id</Code>{" "}
        ganha um botão <strong>▶ Abrir na CEFIS</strong> com{" "}
        <Code>buildLessonDeepLink()</Code>.
      </p>

      <h3 className="text-xl font-semibold">/tutor — shell tipo WhatsApp</h3>
      <p>
        Layout dark com sidebar (lista de cursos indexados + disponíveis no sample) e área
        de chat. Selecionar um curso na sidebar passa <Code>courseId</Code> e{" "}
        <Code>courseTitle</Code> no payload, escopando o RAG. O botão{" "}
        <strong>+ Indexar novo curso</strong> abre um agente de onboarding que aceita um
        ID de curso, valida contra o sample local, e dispara{" "}
        <Code>/api/courses/ingest</Code> com log em tempo real.
      </p>

      <Callout tone="info" title="Onboarding sem login">
        <p>
          O tutor funciona sem auth — <Code>getCurrentUserId()</Code> retorna{" "}
          <Code>null</Code> e o histórico não é persistido. Útil para showcasing rápido na
          banca.
        </p>
      </Callout>
    </section>
  );
}

// ── 6. RAG ──
function Rag() {
  return (
    <section className="space-y-5">
      <SectionTitle id="rag" eyebrow="Retrieval-Augmented Generation" title="Pipeline RAG" />

      <h3 className="text-xl font-semibold">Ingestão</h3>
      <ol className="ml-5 list-decimal space-y-1">
        <li>
          Sample local em <Code>trascriptions_sample/output/</Code>:{" "}
          <Code>details.json</Code> por curso + <Code>.vtt</Code> por aula (quando existe).
        </li>
        <li>
          <Code>parseVtt()</Code> em <Code>src/lib/vtt.ts</Code> converte cues do WebVTT
          em <Code>{`{ startSeconds, endSeconds, text }`}</Code>.
        </li>
        <li>
          <Code>chunkCues()</Code> agrupa em blocos de ~800 caracteres (max 1200),
          quebrando preferencialmente em fim de sentença e preservando
          start/end no menor cue.
        </li>
        <li>
          <Code>embed()</Code> (OpenAI ou Google, conforme <Code>app_settings</Code>) gera
          vetores 1536d.
        </li>
        <li>
          Insert em <Code>cefis_lesson_chunks</Code> com{" "}
          <Code>lesson_id, chunk_index, chunk_text, start_seconds, end_seconds,
          embedding</Code>.
        </li>
        <li>
          Metadados do curso (title + summary + goals + keywords) viram um único embedding
          em <Code>cefis_course_embeddings</Code> para o RAG de catálogo.
        </li>
      </ol>

      <h3 className="text-xl font-semibold">Busca</h3>
      <p>
        Dois RPCs Postgres expostos no schema <Code>bussola</Code>:
      </p>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <Code>match_lesson_chunks(query_embedding, match_threshold, match_count)</Code> —
          RAG profundo (chunks com timestamp).
        </li>
        <li>
          <Code>match_courses(query_embedding, match_threshold, match_count)</Code> — RAG
          light (metadados de curso).
        </li>
      </ul>
      <p>
        Default: threshold 0.7, top-k 5 (ajustável em <Code>/admin</Code>). Quando o usuário
        escopa um curso na sidebar, o tutor baixa o threshold para 0.4 e busca 60
        candidatos antes de filtrar client-side por <Code>course_id</Code>.
      </p>

      <h3 className="text-xl font-semibold">Generation</h3>
      <p>
        O tutor monta o prompt com:
      </p>
      <ul className="ml-5 list-disc space-y-1">
        <li>System prompt fixo (personalidade Bússola + regras).</li>
        <li>Lista numerada de chunks (até 600 chars cada) com <Code>[mm:ss]</Code> e similaridade.</li>
        <li>Lista de cursos sugeridos.</li>
      </ul>
      <p>
        Resposta sai por <Code>genObject()</Code> com schema Zod
        (<Code>answer</Code>, <Code>used_chunk_indices</Code>,{" "}
        <Code>suggest_course_indices</Code>, <Code>grounded_in_cefis</Code>).
        A UI usa <Code>used_chunk_indices</Code> para renderizar cards de citação com
        deep-link.
      </p>

      <Callout tone="warn" title="Fallback transparente">
        <p>
          Se o RAG não devolve nada relevante, o modelo precisa começar com{" "}
          <em>“Esse tópico ainda não está no nosso catálogo indexado, mas posso te
          explicar:”</em> e setar <Code>grounded_in_cefis=false</Code>. O front pinta a
          mensagem com uma nota discreta avisando que é conhecimento geral.
        </p>
      </Callout>
    </section>
  );
}

// ── 7. Agentes ──
function Agentes() {
  return (
    <section className="space-y-5">
      <SectionTitle id="agentes" eyebrow="Agentes" title="Agentes de IA" />

      <p>
        A proposta original tinha 5 agentes. Para caber em time solo e ~16h de execução,
        cortamos para <strong>2 agentes + 1 função síncrona</strong>:
      </p>

      <Table
        headers={["Agente", "Onde mora", "Tools / output", "Responsabilidade"]}
        rows={[
          [
            "Onboarding",
            "/api/onboarding",
            "save_profile, save_skill_assessment, complete",
            "Conversar 4-5 mensagens, extrair perfil + lacuna crítica e salvar",
          ],
          [
            "Tutor",
            "src/lib/tutor-agent.ts",
            "Structured output: answer + chunk indices",
            "RAG → resposta + citações com deep-link no segundo",
          ],
          [
            "Curador (síncrono)",
            "/api/curator/generate-plan",
            "Structured output: plano completo de 1 semana",
            "Combina perfil + RAG (chunks + cursos) em 4-7 items distribuídos na semana",
          ],
          [
            "Indexador (UI)",
            "/tutor (shell) + /api/courses/ingest",
            "Streaming de log de progresso",
            "Aceita ID de curso do sample, parseia VTTs, gera embeddings, persiste",
          ],
        ]}
      />

      <Callout tone="info" title="Por que não LangChain / LlamaIndex">
        <p>
          Curva de aprendizado alta para um dia. Vercel AI SDK + <Code>generateObject</Code>{" "}
          com Zod resolve 90% do que precisamos com 1/5 do código. Tool calling fica para
          quando precisar — onboarding por enquanto usa structured output puro (saída
          tipada e chega o trabalho).
        </p>
      </Callout>
    </section>
  );
}

// ── 8. Schema ──
function Schema() {
  return (
    <section className="space-y-5">
      <SectionTitle id="schema" eyebrow="Banco de dados" title="Schema do banco" />

      <p>
        Tudo no schema dedicado <Code>bussola</Code>. Migrations em{" "}
        <Code>supabase/migrations/bussola/*.sql</Code> aplicadas em ordem.
      </p>

      <h3 className="text-xl font-semibold">Tabelas principais</h3>
      <Table
        headers={["Tabela", "Função"]}
        rows={[
          [<Code key="1">app_settings</Code>, "Singleton (id=1) com chaves de API + modelos + flags"],
          [<Code key="2">users</Code>, "Espelha conta CEFIS — guarda cefis_user_id, cefis_api_key, perfil básico"],
          [<Code key="3">user_profile</Code>, "Saída do onboarding: goal, minutos/dia, learning_style, deadline"],
          [<Code key="4">skill_assessment</Code>, "Mapa de competências (score, status, importance) — gerado no onboarding"],
          [<Code key="5">study_plan</Code>, "Plano semanal (title, total_weeks, active, rationale)"],
          [<Code key="6">plan_items</Code>, "Items por dia (source, source_ref, cefis_course/lesson/track_id, duration_minutes, status)"],
          [<Code key="7">cefis_courses</Code>, "Cache local dos cursos indexados (metadados + cefis_url)"],
          [<Code key="8">cefis_lessons</Code>, "Aulas dos cursos indexados"],
          [<Code key="9">cefis_lesson_chunks</Code>, "Chunks de transcrição com start/end seconds + embedding(1536)"],
          [<Code key="10">cefis_course_embeddings</Code>, "Embedding único por curso (metadados) para RAG light"],
          [<Code key="11">tutor_sessions</Code>, "Sessões de conversa (para histórico futuro)"],
          [<Code key="12">tutor_messages</Code>, "Mensagens persistidas (best-effort) com citations jsonb"],
          [<Code key="13">whatsapp_link</Code>, "Pareamento WhatsApp ↔ user via OTP (TTL curto)"],
          [<Code key="14">progress_log</Code>, "Eventos de progresso por plan_item (started, completed, …)"],
          [<Code key="15">generated_content</Code>, "Conteúdo gerado pela IA (resumos, podcasts, quizzes) — placeholder"],
        ]}
      />

      <h3 className="text-xl font-semibold">RPCs (Postgres functions)</h3>
      <Pre>{`-- RAG profundo: chunks de transcrição com timestamp
match_lesson_chunks(query_embedding vector(1536),
                    match_threshold float DEFAULT 0.7,
                    match_count int DEFAULT 5)
  RETURNS TABLE(lesson_id, course_id, course_title, lesson_title,
                lesson_position, chunk_text, start_seconds, end_seconds,
                similarity, course_cefis_url, lesson_cefis_url)

-- RAG light: cursos por metadados
match_courses(query_embedding vector(1536),
              match_threshold float DEFAULT 0.5,
              match_count int DEFAULT 3)
  RETURNS TABLE(course_id, title, subtitle, summary, duration_seconds,
                lesson_count, category_ids, cefis_url, similarity)`}</Pre>

      <h3 className="text-xl font-semibold">Índices</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <Code>cefis_lesson_chunks</Code>: <Code>ivfflat (embedding vector_cosine_ops)</Code>{" "}
          + <Code>gin (chunk_text gin_trgm_ops)</Code> para keyword fallback.
        </li>
        <li>
          <Code>users.cefis_user_id</Code> UNIQUE — idempotência no upsert pós-login.
        </li>
        <li>
          <Code>study_plan(user_id, active)</Code> — busca rápida do plano ativo.
        </li>
      </ul>
    </section>
  );
}

// ── 9. Rotas ──
function Rotas() {
  return (
    <section className="space-y-5">
      <SectionTitle id="rotas" eyebrow="Reference" title="Rotas e API" />

      <h3 className="text-xl font-semibold">Páginas</h3>
      <Table
        headers={["Rota", "Tipo", "Função"]}
        rows={[
          ["/", "RSC", "Landing — CTAs para login e tutor"],
          ["/login", "Client", "Form CEFIS (email + senha)"],
          ["/onboarding", "RSC + Client", "Chat curto que monta perfil"],
          ["/plano", "RSC", "Plano ativo do user com deep-links"],
          ["/tutor", "RSC + Client", "Shell WhatsApp-dark com sidebar de cursos"],
          ["/conectar-whatsapp", "Client", "OTP de pareamento com bot do zap"],
          ["/admin", "Client", "Backoffice protegido por senha (env)"],
          ["/docs", "RSC", "Esta página — documentação"],
        ]}
      />

      <h3 className="text-xl font-semibold">API routes</h3>
      <Table
        headers={["Endpoint", "Método", "Função"]}
        rows={[
          ["/api/auth/cefis-login", "POST", "Auth real contra CEFIS v1, set cookie"],
          ["/api/auth/logout", "POST", "Limpa cookie de sessão"],
          ["/api/auth/me", "GET", "Devolve user atual (ou 401)"],
          ["/api/onboarding", "POST", "Próxima mensagem do agente Onboarding (structured)"],
          ["/api/curator/generate-plan", "POST", "Curador gera plano semanal e persiste"],
          ["/api/tutor", "POST", "RAG + resposta com citações"],
          ["/api/plan/active", "GET", "Plano ativo do user logado"],
          ["/api/plan/[id]", "GET", "Plano por ID (com ownership check)"],
          ["/api/courses", "GET", "Cursos indexados + disponíveis no sample"],
          ["/api/courses/ingest", "POST", "Indexa curso do sample (VTTs + embeddings)"],
          ["/api/whatsapp/link", "POST/GET", "Gera/valida OTP de pareamento"],
          ["/api/whatsapp/process", "POST", "Endpoint interno chamado pelo service Bun"],
          ["/api/whatsapp/webhook", "*", "Deprecated — 410. Webhook agora vive em services/wa"],
          ["/api/admin/settings", "GET/POST", "Lê/grava app_settings (auth por senha)"],
          ["/api/admin/ingest-sample", "GET/POST", "Dry-run ou ingestão completa do sample"],
        ]}
      />

      <Callout tone="warn" title="Sobre /api/whatsapp/webhook">
        <p>
          O webhook foi movido para <Code>services/wa</Code> (deploy independente em
          Railway, runtime Bun). A rota Next.js virou um stub 410 só para a Evolution não
          fazer retry infinito enquanto o painel não é atualizado.
        </p>
      </Callout>
    </section>
  );
}

// ── 10. CEFIS ──
function Cefis() {
  return (
    <section className="space-y-5">
      <SectionTitle id="cefis" eyebrow="Integração" title="Integração CEFIS" />

      <p>
        Cliente único em <Code>src/lib/cefis.ts</Code> cobre <strong>v1</strong> (auth) e{" "}
        <strong>v3</strong> (catálogo). Atenção:
      </p>

      <Callout tone="danger" title="Diferença crítica nos headers">
        <ul className="ml-5 list-disc">
          <li>
            v1: <Code>Authorization: {`{key}`}</Code> — <strong>sem</strong> prefixo Bearer.
          </li>
          <li>
            v3: <Code>Authorization: Bearer {`{key}`}</Code> — <strong>com</strong> Bearer.
          </li>
        </ul>
      </Callout>

      <Table
        headers={["Método", "Endpoint", "Uso"]}
        rows={[
          ["login(email, pass)", "POST v1 /api/v1/login", "Pega key + user — salva em users"],
          ["me()", "GET v1 /api/v1/user/me", "Valida key ainda válida"],
          ["listCourses(params)", "GET v3 /courses", "Catálogo paginado (search, categories, filter)"],
          ["getCourse(id)", "GET v3 /courses/{id}", "Detalhe de curso (summary, goals, keywords)"],
          ["listLessons(courseId)", "GET v3 /courses/{id}/lessons", "Aulas + stream_sources"],
          ["listTracks(params)", "GET v3 /tracks", "Trilhas curadas pela CEFIS"],
          ["getTrack(id)", "GET v3 /tracks/{id}", "Detalhe + cursos da trilha"],
          ["listCertificates(params)", "GET v3 /performance/certificates", "Histórico de certificados do aluno"],
        ]}
      />

      <h3 className="text-xl font-semibold">Retry</h3>
      <p>
        <Code>withRetry(fn, maxAttempts=3)</Code> faz backoff exponencial (1s, 2s, 4s) para
        respostas <Code>429</Code> e <Code>5xx</Code>. Outros erros propagam direto.
      </p>

      <h3 className="text-xl font-semibold">Deep-link</h3>
      <Pre>{`buildLessonDeepLink(courseId, lessonId, startSeconds)
  → "https://cefis.com.br/curso/{courseId}/aula/{lessonId}?t={Math.floor(startSeconds)}"`}</Pre>
      <p className="text-sm text-zinc-500">
        Ponto único de mudança. Se o formato real do CEFIS for diferente, ajustar ali
        atualiza todo o produto.
      </p>
    </section>
  );
}

// ── 11. WhatsApp ──
function Whatsapp() {
  return (
    <section className="space-y-5">
      <SectionTitle id="whatsapp" eyebrow="Canal alternativo" title="WhatsApp via Evolution" />

      <p>
        O canal de chat via zap mora num serviço separado em{" "}
        <Code>services/wa/</Code> (runtime Bun, deploy Railway). A separação foi
        deliberada:
      </p>

      <Callout tone="info" title="Por que serviço dedicado">
        <ul className="ml-5 list-disc">
          <li>Webhooks da Evolution são contínuos (long-running) e não casam com Vercel stateless.</li>
          <li>Permite cold-start zero e logging próprio.</li>
          <li>Bun é mais rápido para HMAC + JSON parsing em volume.</li>
          <li>Aponta a Evolution direto, sem hop no Next.js.</li>
        </ul>
      </Callout>

      <h3 className="text-xl font-semibold">Fluxo de pareamento</h3>
      <ol className="ml-5 list-decimal space-y-1">
        <li>Aluno logado vai em <Code>/conectar-whatsapp</Code>.</li>
        <li>
          POST <Code>/api/whatsapp/link</Code> gera OTP com{" "}
          <Code>crypto.randomBytes</Code>, TTL 10min, uso único, e devolve o número do bot.
        </li>
        <li>Aluno manda o código pelo zap para o bot.</li>
        <li>
          Service Bun recebe via webhook, valida OTP em <Code>whatsapp_link</Code>, e
          marca pareamento como concluído.
        </li>
        <li>Conversas subsequentes daquele número resolvem direto para o <Code>user_id</Code>.</li>
      </ol>

      <h3 className="text-xl font-semibold">Estrutura do serviço</h3>
      <Pre>{`services/wa/src/
├── index.ts        # bootstrap Bun.serve()
├── env.ts          # validação de variáveis
├── middleware.ts   # body parsing + error wrap
├── webhook.ts      # POST /v1/evolution/webhook
├── hmac.ts         # validação de secret
├── relay.ts        # askTutor() + format pra zap
├── send.ts         # Evolution sendText / sendList
├── evolution.ts    # cliente Evolution v2
├── instance.ts     # gerenciamento de instâncias
├── supabase.ts     # cliente compartilhado
├── phone.ts        # E.164 normalize
└── log.ts          # log estruturado (sem PII)`}</Pre>

      <p>
        O serviço chama <Code>askTutor()</Code> (a mesma função usada por{" "}
        <Code>/api/tutor</Code>) e formata a resposta com{" "}
        <Code>formatTutorForWhatsApp()</Code> — texto plain com emojis sutis e links
        absolutos clicáveis no zap.
      </p>
    </section>
  );
}

// ── 12. Admin ──
function Admin() {
  return (
    <section className="space-y-5">
      <SectionTitle id="admin" eyebrow="Operação" title="Backoffice /admin" />

      <p>
        Página única protegida por senha (<Code>ADMIN_PASSWORD</Code> no{" "}
        <Code>.env.local</Code>, único secret que mora em env). Toda chave de API real e
        configuração de modelo vive em <Code>app_settings</Code> (singleton id=1).
      </p>

      <h3 className="text-xl font-semibold">Campos editáveis</h3>
      <Table
        headers={["Categoria", "Campos"]}
        rows={[
          [
            "Providers de IA",
            <span key="1">
              <Code>openrouter_api_key</Code>, <Code>google_api_key</Code>,{" "}
              <Code>openai_api_key</Code>
            </span>,
          ],
          ["CEFIS", <Code key="2">cefis_demo_api_key</Code>],
          [
            "Modelos",
            <span key="3">
              <Code>chat_model</Code>, <Code>embedding_model</Code>,{" "}
              <Code>whisper_model</Code>
            </span>,
          ],
          [
            "RAG",
            <span key="4">
              <Code>rag_match_threshold</Code> (0-1), <Code>rag_top_k</Code> (1-20)
            </span>,
          ],
          [
            "WhatsApp",
            <span key="5">
              <Code>evolution_api_url</Code>, <Code>evolution_api_key</Code>,{" "}
              <Code>evolution_instance</Code>, <Code>evolution_bot_phone</Code>,{" "}
              <Code>evolution_webhook_secret</Code>
            </span>,
          ],
        ]}
      />

      <Callout tone="success" title="Demo bonus">
        <p>
          Permite trocar o modelo de chat ao vivo durante o pitch (de{" "}
          <Code>gpt-4o-mini</Code> para <Code>anthropic/claude-3.5-sonnet</Code> via
          OpenRouter, por exemplo) sem redeploy. <Code>getSettings()</Code> tem cache de
          60s; <Code>invalidateSettingsCache()</Code> roda no save.
        </p>
      </Callout>

      <h3 className="text-xl font-semibold">Regras de segurança</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>GET devolve <strong>chaves mascaradas</strong> (<Code>abc12…wxyz</Code>) — nunca plaintext.</li>
        <li>
          POST aceita só whitelist de campos (não <Code>Object.keys(body)</Code> direto).
        </li>
        <li>
          Senha enviada em header <Code>x-admin-password</Code>; comparada via{" "}
          <Code>timingSafeEqual</Code>.
        </li>
        <li>
          Inputs vazios mantêm valor atual (não sobrescrevem com <Code>null</Code>).
        </li>
      </ul>
    </section>
  );
}

// ── 13. Segurança ──
function Seguranca() {
  return (
    <section className="space-y-5">
      <SectionTitle id="seguranca" eyebrow="Não negociável" title="Segurança" />

      <Callout tone="danger" title="Princípio raiz">
        <p>
          Nada de secrets em código versionado, e nada de credenciais expostas no
          client/browser. Mesmo com deadline, atalho de segurança é bloqueio.
        </p>
      </Callout>

      <h3 className="text-xl font-semibold">Checklist aplicado</h3>
      <ol className="ml-5 list-decimal space-y-1.5">
        <li>
          <strong>Secrets em DB via /admin</strong>, não em <Code>.env</Code> versionado.{" "}
          <Code>.env.local</Code> gitignored só guarda <Code>ADMIN_PASSWORD</Code>, conexão
          Supabase e fallbacks opcionais.
        </li>
        <li>
          <Code>.gitignore</Code> valida <Code>.env*</Code> + exceção para{" "}
          <Code>.env.example</Code>.
        </li>
        <li>
          Mascarar keys no GET admin (<Code>abc12…wxyz</Code>); nunca plaintext em JSON nem
          log.
        </li>
        <li>Whitelist de campos editáveis em POST admin.</li>
        <li>
          Cookies sempre <Code>httpOnly: true</Code>, <Code>secure: true</Code> (prod),{" "}
          <Code>sameSite: &quot;lax&quot;</Code>.
        </li>
        <li>
          <Code>import &quot;server-only&quot;</Code> em libs que tocam credenciais
          (<Code>settings.ts</Code>, <Code>ai.ts</Code>, <Code>cefis-server.ts</Code>,{" "}
          <Code>tutor-agent.ts</Code>, <Code>plan.ts</Code>) — impede bundle no client por
          engano.
        </li>
        <li>
          Webhooks de terceiros (Evolution) validam HMAC; nunca aceitar payload sem prova
          de origem.
        </li>
        <li>
          OTP de pareamento via <Code>crypto.randomBytes</Code>, TTL 10min, uso único.
        </li>
        <li>
          Não logar conteúdo de chaves, senhas, mensagens privadas. Em emergência, log
          prefixo curto (<Code>sk-abc12…</Code>).
        </li>
        <li>
          PII (telefone, email, chat) tratada como sensível — guardada no banco, nunca em
          log estruturado.
        </li>
      </ol>
    </section>
  );
}

// ── 14. Regras de negócio ──
function Negocio() {
  return (
    <section className="space-y-5">
      <SectionTitle id="negocio" eyebrow="O produto" title="Regras de negócio" />

      <h3 className="text-xl font-semibold">O que o produto faz</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          <strong>Diagnóstico em chat</strong>, não formulário. 4-5 perguntas naturais.
        </li>
        <li>
          <strong>Plano de 1 semana</strong> (segunda a domingo), respeitando o orçamento
          declarado em <Code>available_minutes_per_day</Code>.
        </li>
        <li>
          Plano sempre tem <strong>4 a 7 items</strong>. Cada item ≤ minutos/dia.
        </li>
        <li>
          <strong>Sábado e domingo</strong> podem ter blocos maiores (até 2× o normal).
        </li>
        <li>
          Plano <strong>prioriza aulas reais</strong> (<Code>source=cefis_lesson</Code> com{" "}
          <Code>chunk_index</Code>) — só usa <Code>generated_summary</Code> ou{" "}
          <Code>generated_quiz</Code> como reforço quando não há aula apropriada.
        </li>
        <li>
          Curador <strong>nunca inventa cursos</strong> fora do contexto do RAG.
        </li>
        <li>
          Cada citação no tutor abre <strong>no segundo exato</strong> via{" "}
          <Code>?t=&lt;seconds&gt;</Code>.
        </li>
        <li>
          Resposta sem base no RAG é <strong>declarada explicitamente</strong>: começa com
          aviso e seta <Code>grounded_in_cefis=false</Code>.
        </li>
        <li>
          Plano novo <strong>desativa o anterior</strong> (<Code>active=false</Code>) — um
          plano ativo por user.
        </li>
        <li>
          Ingest é <strong>idempotente</strong>: roda de novo sobre o mesmo curso e
          sobrescreve chunks (não duplica).
        </li>
      </ul>

      <h3 className="text-xl font-semibold">O que o produto NÃO faz (escopo cortado)</h3>
      <Callout tone="warn" title="Cortes deliberados para caber em time solo">
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Sem <Code>/dashboard</Code> com progresso histórico (tabela{" "}
            <Code>progress_log</Code> existe, mas UI ficou de fora).
          </li>
          <li>Sem coach diário / spaced repetition automatizado.</li>
          <li>Sem podcast generator (TTS). Schema preparado, geração não.</li>
          <li>Sem quiz adaptativo (diagnóstico virou 2-3 perguntas no onboarding).</li>
          <li>
            Sem trilhas curadas pelo aluno — usamos as trilhas oficiais via API CEFIS
            quando o curador encontra match relevante.
          </li>
          <li>
            Multi-tenant: <strong>1 plano ativo por user</strong>, sem versionamento nem
            comparação entre planos.
          </li>
        </ul>
      </Callout>

      <h3 className="text-xl font-semibold">Tom e personalidade</h3>
      <ul className="ml-5 list-disc space-y-1">
        <li>
          Tutor adota postura de <strong>professor experiente</strong> (referência:
          Harvard Negotiation Project — Fisher, Ury). Usa conceitos (BATNA, ZOPA,
          interesses vs. posições) com naturalidade, sem citar bibliografia o tempo todo.
        </li>
        <li>
          Exemplos sempre do <strong>mundo do contador</strong>: honorários, sócio, cliente
          que atrasa.
        </li>
        <li>
          Respostas curtas: 3-6 frases. Sem markdown pesado (funciona em web e WhatsApp).
        </li>
        <li>
          Português brasileiro coloquial moderado. Sem &quot;prezado&quot; nem floreio
          corporativo.
        </li>
      </ul>
    </section>
  );
}

// ── 15. Números ──
function Numeros() {
  return (
    <section className="space-y-5">
      <SectionTitle id="numeros" eyebrow="Estado real" title="Números do sample" />

      <p>
        Medições reais sobre <Code>trascriptions_sample/output/</Code> (2026-05-26):
      </p>

      <Table
        headers={["Métrica", "Valor"]}
        rows={[
          ["Cursos totais no sample", "26"],
          ["Cursos com VTT (transcrição)", "1 (curso 1132 — Negociação Harvard)"],
          ["Cursos só com metadados", "25"],
          ["Aulas totais", "697"],
          ["Aulas com transcrição", "15"],
          ["Cues VTT parseados", "577"],
          ["Chunks gerados (target 800, max 1200)", "58"],
          ["Média de chars por chunk", "898"],
        ]}
      />

      <Callout tone="info" title="Custo de ingestão">
        <p>
          58 chunks × ~800 chars ≈ 50k tokens de embedding ≈ <strong>US$ 0,001</strong>{" "}
          em <Code>text-embedding-3-small</Code>. Ingestão completa do sample roda em
          ~15 segundos com batches default.
        </p>
      </Callout>

      <p>
        Cada chunk carrega <Code>startSeconds</Code> + <Code>endSeconds</Code> do WebVTT —
        é o que destrava o deep-link no player CEFIS.
      </p>
    </section>
  );
}

// ── 16. Limitações ──
function Limitacoes() {
  return (
    <section className="space-y-5">
      <SectionTitle id="limitacoes" eyebrow="Trade-offs" title="Limitações conhecidas" />

      <ol className="ml-5 list-decimal space-y-2">
        <li>
          <strong>RAG profundo só no curso 1132.</strong> Os outros 25 cursos têm só
          embedding de metadados (title + summary + goals + keywords). O curador consegue
          sugerir qualquer curso no plano, mas o tutor só mergulha em negociação.
        </li>
        <li>
          <strong>Demo precisa cair em tópico de negociação Harvard</strong> para
          mostrar o deep-link. Perguntas fora desse universo entregam respostas baseadas
          em metadados (sem timestamp). O tutor avisa explicitamente.
        </li>
        <li>
          <strong>Deep-link presume formato do CEFIS</strong> (
          <Code>?t=&lt;seconds&gt;</Code>). Se a plataforma real usar outro parâmetro
          (e.g. <Code>&start=</Code>), ajustar em <Code>buildLessonDeepLink()</Code>.
        </li>
        <li>
          <strong>Cookie de sessão é leve.</strong> Só guarda o UUID do user; perfil
          completo busca via DB. Em escala precisaria virar JWT signed ou session no
          Redis.
        </li>
        <li>
          <strong>app_settings é singleton</strong> (sem RLS multi-tenant). Plaintext de
          chave protegida só por senha admin. Aceitável no hackathon; em produção
          requer KMS / Supabase Vault.
        </li>
        <li>
          <strong>Progresso não fecha o loop.</strong> A tabela <Code>progress_log</Code>{" "}
          existe e <Code>plan_items.status</Code> é atualizável, mas não há UI para
          marcar “feito” nem cálculo de % do plano.
        </li>
        <li>
          <strong>Whisper / TTS provisionados mas não usados</strong> na demo. O schema
          inclui <Code>whisper_model</Code> e <Code>tts_voice_*</Code> nas configurações,
          mas não há rota de upload de áudio nem geração de podcast.
        </li>
      </ol>
    </section>
  );
}

// ── 17. Deploy ──
function Deploy() {
  return (
    <section className="space-y-5">
      <SectionTitle id="deploy" eyebrow="Operação" title="Deploy & ambiente" />

      <Table
        headers={["Componente", "Provider", "Notas"]}
        rows={[
          [
            "Web (Next.js)",
            "Vercel",
            "Build automático no push para main. Free tier suficiente para a demo.",
          ],
          [
            "Banco",
            "Supabase (managed)",
            "Schema dedicado bussola precisa estar em Settings → API → Exposed schemas.",
          ],
          [
            "WhatsApp service",
            "Railway (Bun)",
            "Long-running. railway.json em services/wa. Variáveis via dashboard Railway.",
          ],
          [
            "Evolution API",
            "Self-hosted (terceiros)",
            "Configurar webhook como https://<railway>/v1/evolution/webhook?secret=...",
          ],
        ]}
      />

      <h3 className="text-xl font-semibold">Setup local</h3>
      <Pre>{`# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# Preencha NEXT_PUBLIC_SUPABASE_URL, *_ANON_KEY, SUPABASE_SERVICE_KEY,
#          ADMIN_PASSWORD (todo resto vai pra /admin)

# 3. Schema do banco
# Aplique migrations em supabase/migrations/bussola/ via SQL Editor
# ou supabase CLI (em ordem cronológica)

# 4. Backoffice
npm run dev
# Abra http://localhost:3000/admin → use ADMIN_PASSWORD
# Cole OpenAI key (e opcionalmente OpenRouter / Google)

# 5. Ingestão sample
curl -X POST http://localhost:3000/api/admin/ingest-sample \\
     -H "x-admin-password: $ADMIN_PASSWORD"

# 6. Smoke test
# /tutor → pergunte "O que é BATNA?"
# → deve responder citando o curso 1132 com deep-link no segundo`}</Pre>

      <h3 className="text-xl font-semibold">Variáveis sensíveis</h3>
      <Table
        headers={["Variável", "Onde mora", "Função"]}
        rows={[
          ["ADMIN_PASSWORD", ".env.local (web)", "Único secret no env; libera /admin"],
          ["NEXT_PUBLIC_SUPABASE_URL", ".env.local (web)", "Conexão Supabase (público)"],
          ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ".env.local (web)", "Anon key Supabase (público)"],
          ["SUPABASE_SERVICE_KEY", ".env.local (web)", "Service key — só server-side, nunca exposto"],
          [
            "OPENAI_API_KEY / OPENROUTER_API_KEY / GOOGLE_API_KEY",
            ".env.local (web, fallback)",
            "Opcional — preferência é gravar via /admin em app_settings",
          ],
          [
            "EVOLUTION_*",
            "Railway env (services/wa)",
            "Espelhado de app_settings na inicialização do service",
          ],
        ]}
      />
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 pt-8 text-sm text-zinc-500 dark:border-zinc-800">
      <p>
        Documentação gerada em 2026-05-26 · Bússola é um projeto solo para o Hackathon
        CEFIS 2026.
      </p>
      <p className="mt-2">
        Briefing original e roadmap: <Code>hackathon/</Code>. Memória de decisões:{" "}
        <Code>~/.claude/projects/C--Projects-bussola-ai/memory/</Code>.
      </p>
    </footer>
  );
}
