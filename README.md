# 🧭 Bússola — Tutor de IA CEFIS

Hackathon CEFIS 2026. Tutor de IA que combina catálogo real da CEFIS + RAG sobre transcrições + geração sob demanda para entregar um plano de estudos personalizado.

## Stack

- Next.js 16 (App Router, RSC, `src/` dir)
- Vercel AI SDK + OpenAI (`gpt-4o-mini`, `text-embedding-3-small`, `tts-1`)
- Supabase (Postgres + pgvector + Storage)
- Tailwind v4 + componentes UI próprios (shadcn-like)
- Cliente CEFIS pronto em `src/lib/cefis.ts` (v1 + v3, com retry)

## Setup local

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# Preencha: NEXT_PUBLIC_SUPABASE_URL, *_ANON_KEY, SUPABASE_SERVICE_KEY, ADMIN_PASSWORD

# 3. Schema do banco
# Cole o conteúdo de supabase/schema.sql no SQL Editor do Supabase Dashboard e rode.

# 4. Configurar credenciais via backoffice
npm run dev
# Abra http://localhost:3000/admin → use ADMIN_PASSWORD → preencha OpenAI key

# 5. (próximo passo) Ingestão das transcrições sample
# scripts/ingest-sample.ts (a ser criado no próximo bloco)
```

## Estrutura

```
src/
├── app/
│   ├── page.tsx                    Landing
│   ├── layout.tsx
│   ├── admin/page.tsx              Backoffice (senha do .env)
│   └── api/admin/settings/route.ts API admin
├── components/ui/                  Botão, Input, Card, Label
└── lib/
    ├── cefis.ts                    Cliente API CEFIS (v1 + v3)
    ├── settings.ts                 getSettings() server-only com cache 60s
    ├── ai.ts                       OpenAI provider factory
    ├── supabase.ts                 server & admin clients
    └── utils.ts                    cn(), formatDuration()

supabase/schema.sql                 Schema completo (rode no Dashboard)
trascriptions_sample/output/        Sample CEFIS (26 cursos, VTT só do 1132)
hackathon/                          Briefing + docs estratégicas
```

## O que ainda falta (próximos blocos)

- [ ] Script de ingestão sample (`scripts/ingest-sample.ts`): parser VTT + chunks com `start_seconds`
- [ ] `/login` com `POST /api/v1/login` da CEFIS + cookie HttpOnly
- [ ] `/onboarding` (chat com Vercel AI SDK + tool `save_profile`)
- [ ] `/plano` (curador síncrono: RAG + `/tracks` + `/courses`)
- [ ] `/tutor` (RAG + citação com deep-link no timestamp — killer feature)

## Persona da demo

Contadora querendo melhorar negociação com clientes/honorários. Curso central com transcrição real: **1132 — Negociação e Gestão de Conflitos (Metodologia Harvard)**.

## Documentação

Briefing completo do hackathon: `hackathon/README.md`. Memória de decisões: `~/.claude/projects/C--Projects-bussola-ai/memory/`.
