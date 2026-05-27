# 🧭 Bússola — Tutor de IA CEFIS

> Hackathon CEFIS 2026 · Projeto solo · [bussola-ai.vercel.app](https://bussola-ai.vercel.app)

Tutor de IA que combina o catálogo real da **CEFIS** com RAG sobre transcrições, planos de estudo personalizados, gamificação no estilo Duolingo e atendimento em **4 canais** (web, PWA, WhatsApp e grupo no zap).

**Killer feature:** cada resposta cita a aula CEFIS no **segundo exato** com deep-link direto pro player.

---

## ✨ Destaques

| Pilar | O que faz |
|---|---|
| **6 agentes especializados** | Onboarding, Diagnóstico, Curador, Tutor (RAG), Quick-Learn ("X min p/ Y") e Gerador de Conteúdo |
| **RAG com deep-link** | 58 chunks indexados (curso 1132, negociação) + 25 metadata embeddings · 1536d via Google `gemini-embedding-001` |
| **4 canais** | Página web · PWA instalável · Bot WhatsApp via Evolution · Grupo de estudo (Plano Empresarial, 7 dias) |
| **Gamificação Duolingo-style** | Jornada do Herói (Aprendiz → Lenda), ligas semanais (Bronze → Diamante), XP, gemas, streak com protetor, meta diária, mascote 🧭 com fala por fase |
| **Acompanhamento contínuo** | Lembretes via Vercel Cron (a cada 30min na janela 8h–20h BRT) + quiz de revisão diário (9h BRT) baseado em `lacuna_critica` |
| **Multi-plano** | N planos por usuário, switcher no header, contexto passado pro tutor via `planId` |
| **Acompanhamento de acesso** | Painel simples pra ver quem acessou o projeto e por onde navegou |

---

## 🏗 Arquitetura

```
                           ┌────────────────────┐
                           │      Vercel        │
                           │  (Next.js 16 RSC)  │
                           │ + Cron Jobs        │
                           └──────────┬─────────┘
                                      │
            ┌─────────────────────────┼─────────────────────────┐
            │                         │                         │
            ▼                         ▼                         ▼
   ┌────────────────┐       ┌─────────────────┐       ┌───────────────┐
   │  Supabase      │       │  bussola-wa     │       │  CEFIS API    │
   │  (Postgres +   │       │  (Bun on        │       │  (v1 + v3)    │
   │   pgvector)    │       │   Railway)      │       │               │
   └────────────────┘       └────────┬────────┘       └───────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  Evolution API   │
                            │  (WhatsApp)      │
                            └──────────────────┘
```

**Stack:**

- **Next.js 16** (App Router · RSC · `src/` dir · Turbopack)
- **Vercel AI SDK** com fallback `OpenRouter → OpenAI` para chat e `generateObject`
- **Google Embeddings** (`gemini-embedding-001` 1536d Matryoshka) com fallback OpenAI
- **Supabase**: Postgres + pgvector + Storage + Auth (cookie HttpOnly)
- **Tailwind v4** + componentes shadcn-like + temas dark/light
- **Bun** standalone service (`services/wa/`) com fila FIFO de 1.5s entre Bun ↔ Evolution
- **Vercel Cron** para lembretes e quiz diários

---

## 🚀 Setup local

```bash
# 1. Clonar e instalar
git clone https://github.com/felipebenevides/bussola.ai.git
cd bussola.ai
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# Preencha:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_KEY          (pega no Dashboard → Settings → API)
#   ADMIN_PASSWORD                (qualquer string forte ≥20 chars)
#   OPENROUTER_API_KEY            (primário pra chat; opcional)
#   WA_SERVICE_URL                (URL do bussola-wa no Railway)
#   INTERNAL_HMAC_SECRET          (32 bytes hex; mesmo valor no Bun)
#   CRON_SECRET                   (gerado com openssl rand -hex 32)

# 3. Aplicar migrations
# Cole o conteúdo de supabase/migrations/bussola/*.sql no SQL Editor
# do Supabase Dashboard, em ordem cronológica.

# 4. Configurar credenciais via /admin
npm run dev
# Abra http://localhost:3000/admin → ADMIN_PASSWORD → preencha:
#   - OpenAI / Google API keys (embeddings + LLM)
#   - Evolution API URL / Key / Instance (se for usar WhatsApp)
#   - CEFIS demo API key (fallback pra rotas anônimas)

# 5. Ingerir sample CEFIS
# Use scripts/ingest-embeddings-direct.ts (Google embeddings, sem rate limit)
# ou /api/admin/ingest-sample (precisa SUPABASE_SERVICE_KEY no .env.local)
node --experimental-strip-types scripts/ingest-embeddings-direct.ts
```

### Serviço WhatsApp (`services/wa/`)

Rodando no **Railway** como deploy separado:

```bash
cd services/wa
cp .env.example .env
# Preencha EVOLUTION_*, INTERNAL_HMAC_SECRET, SUPABASE_*
bun install
bun run dev
```

Configure o webhook na Evolution apontando para:
```
https://<seu-bun-railway>.up.railway.app/v1/evolution/webhook?secret=<EVOLUTION_WEBHOOK_SECRET>
```

---

## 📂 Estrutura

```
src/
├── app/
│   ├── page.tsx                 Landing (Hero + 4 canais + métodos + CEFIS + features)
│   ├── tutor/                   Killer feature — chat com sidebar de cursos/planos + Jornada
│   ├── plano/                   Plano semanal + switcher + StudyViewer com markdown extenso
│   ├── onboarding/              Agente conversacional (6 perguntas)
│   ├── diagnostico/             Quiz adaptativo de sub-skills
│   ├── agentes/                 Página visual com os 6 agentes
│   ├── sobre/                   Portfólio + descrição do projeto
│   ├── docs/                    Documentação técnica completa (20 seções)
│   ├── admin/                   Backoffice (senha do .env)
│   ├── login/                   Auth CEFIS real
│   └── api/                     Endpoints (ver tabela em /docs §9)
├── components/                  ChannelToggle, JourneyWidget, StudyGroupModal, ...
├── lib/
│   ├── ai.ts                    Provider factory (OpenRouter/OpenAI/Google)
│   ├── cefis.ts                 Cliente CEFIS v1+v3 (retry, deep-link)
│   ├── tutor-agent.ts           askTutor() + RAG search
│   ├── journey.ts               Gamificação Duolingo-style
│   ├── plan.ts                  loadPlan, listPlansForUser, loadPlanContext
│   ├── analytics-server.ts      Registra acessos (telas + identificações)
│   └── ...
services/wa/                     Bun + Hono + Evolution adapter + fila FIFO 1.5s
supabase/migrations/bussola/     SQL migrations (10+ arquivos)
hackathon/                       Briefing original + estratégia
```

---

## 🤖 Agentes

| Agente | Endpoint | Função |
|---|---|---|
| **Onboarding** | `/api/onboarding` | 6 perguntas extraindo perfil, experiência, disponibilidade, estilo, weak area, WhatsApp |
| **Diagnóstico** | `/api/diagnostic` | Decompõe goal em 4-6 sub-skills e classifica em domina/lacuna parcial/lacuna crítica |
| **Curador** | `/api/curator/generate-plan` | Plano semanal (modes: auto · course · custom) adaptado ao learning style |
| **Tutor** ⭐ | `/api/tutor` | RAG → resposta + citações com deep-link mm:ss. Aceita `planId` pra biasar |
| **Quick-Learn** | `/api/quick-learn` | "X min para entender Y" — resumo calibrado pelo tempo (1min→1 bullet, 30min→6 profundos) |
| **Gerador de Conteúdo** | `/api/generate-content` | Materializa summary (markdown) ou quiz (3-5 questões) por tópico |
| **Estudo da Aula** | `/api/plan-item-study` | Markdown estruturado de 800-1500 palavras por `plan_item` — persistido pra revisar |

Página visual em [`/agentes`](https://bussola-ai.vercel.app/agentes).

---

## 🎮 Gamificação (Duolingo-style)

| Pilar | Cálculo |
|---|---|
| **XP** | +10 por pergunta · +5 por resposta com citação |
| **Nível** | Aprendiz → Aventureiro → Estrategista → Mestre → Lenda (com fala do mascote 🧭 por fase) |
| **Liga semanal** | XP dos últimos 7 dias define: Bronze 🥉 / Prata 🥈 / Ouro 🥇 / Esmeralda 💚 / Diamante 💎 |
| **Gemas 💎** | 1 por citação recebida (prêmio por conteúdo de qualidade) |
| **Meta diária** | 30 XP/dia · ✅ ao bater garante +1 streak |
| **Streak 🔥** | Dias consecutivos com ≥1 pergunta |
| **Protetor de ofensiva 🛡️** | Streak ≥ 3 ganha 1 protetor · +1 a cada múltiplo de 7 |

Tudo computado em runtime em `src/lib/journey.ts` a partir de eventos reais (sem schema novo).

---

## 📱 Canais

| Canal | Como acessar |
|---|---|
| **Web** | https://bussola-ai.vercel.app · macOS · Linux · Windows |
| **PWA** | Botão "Instalar app" na home · iOS · Android |
| **WhatsApp** | Bot envia convite ao preencher o telefone no onboarding · também aceita comando `menu` |
| **Grupo WhatsApp** | Plano Empresarial · até 5 participantes · 7 dias · criado via `/api/whatsapp/group` |

**Continuidade entre canais:** componente `<ChannelToggle />` envia o estudo completo do plano direto para o WhatsApp do aluno via Evolution (sem abrir janela externa). Pelo zap, toda resposta do tutor termina com `🌐 Ver no app: <url>`.

---

## 🗄 Schema (resumo)

Schema dedicado `bussola` — 17 tabelas. Destaque:

- `users`, `user_profile`, `skill_assessment` — perfil + diagnóstico
- `study_plan`, `plan_items` — planos semanais
- `cefis_courses`, `cefis_lessons`, `cefis_lesson_embeddings` (1536d), `cefis_course_embeddings`
- `tutor_messages`, `whatsapp_messages`, `progress_log`
- `study_groups` — Plano Empresarial (creator_user_id OU creator_phone, expira +7d)
- `generated_content` — resumos/quizzes/estudos materializados (ligado a `plan_item_id`)
- `whatsapp_link_codes`, `user_whatsapp` — pareamento OTP + throttle de lembretes/quizzes
- `analytics_events` — registro de telas visitadas e identificações por acesso

**RPCs (pgvector):** `match_lesson_chunks(query_embedding, threshold, count)` e `match_courses(...)`.

Detalhe completo em [`/docs §8`](https://bussola-ai.vercel.app/docs#schema).

---

## ⏰ Cron Jobs (Vercel)

Configurado em `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/reminders",   "schedule": "0,30 11-23 * * *" },
    { "path": "/api/cron/daily-quiz",  "schedule": "0 12 * * *" }
  ]
}
```

- **Reminders** (a cada 30min, 8h-20h BRT): manda lembrete pro WhatsApp se aluno não recebeu nas últimas 18h e tem `available_minutes_per_day > 0`
- **Daily quiz** (9h BRT): gera 1 MCQ baseada em `skill_assessment` com maior `importance` e envia via WhatsApp. Throttle 36h.

Ambos exigem header `Authorization: Bearer ${CRON_SECRET}`.

---

## 📊 Acompanhamento de acesso

Painel simples pra acompanhar quem está acessando o projeto durante a apresentação:

```bash
curl -H "x-admin-password: $ADMIN_PASSWORD" \
  https://bussola-ai.vercel.app/api/analytics/stats
```

Retorna totais de acessos, telas mais visitadas e quem se identificou (com email/telefone informado no login ou onboarding) com as rotas que percorreu.

---

## 🧪 Smoke tests

```bash
# Tutor com RAG (sem login)
curl -X POST http://localhost:3000/api/tutor \
  -H "Content-Type: application/json" \
  -d '{"message":"Como abrir uma negociação difícil?"}'

# Quick learn
curl -X POST http://localhost:3000/api/quick-learn \
  -H "Content-Type: application/json" \
  -d '{"topic":"BATNA","minutes":5}'

# Diagnóstico — start
curl -X POST http://localhost:3000/api/diagnostic \
  -H "Content-Type: application/json" \
  -d '{"phase":"start"}'

# Bun service health
curl https://bussola-wa-production.up.railway.app/health
```

Scripts prontos em `scripts/smoke-tutor.ts` e `scripts/smoke-curator.ts`.

---

## 🚢 Deploy

- **Vercel** (Next.js + cron jobs): `git push` na main aciona deploy automático
- **Railway** (serviço Bun): `cd services/wa && railway up --service bussola-wa`
- **Supabase**: aplicar migrations em ordem (`supabase/migrations/bussola/*.sql`)

Configuração:
- Vercel env: `NEXT_PUBLIC_*`, `SUPABASE_SERVICE_KEY`, `ADMIN_PASSWORD`, `WA_SERVICE_URL`, `INTERNAL_HMAC_SECRET`, `CRON_SECRET`
- Railway env (bussola-wa): `EVOLUTION_*`, `INTERNAL_HMAC_SECRET`, `SUPABASE_SERVICE_KEY`, `NEXTJS_PROCESS_URL`

---

## 📚 Documentação detalhada

| Recurso | Onde |
|---|---|
| **Página /docs no produto** | https://bussola-ai.vercel.app/docs (20 seções) |
| **Briefing do hackathon** | [`hackathon/README.md`](./hackathon/README.md) + arquivos em `hackathon/` |
| **Memória de decisões** | `~/.claude/projects/C--Projects-bussola-ai/memory/` |
| **Tasks (status atual)** | [`tasks/`](./tasks/) |

---

## 🎯 Persona da demo

**Contadora brasileira melhorando habilidades de negociação** — honorários sob pressão, sócios resistentes, clientes que atrasam. Curso central com transcrição real: **1132 — Negociação e Gestão de Conflitos (Metodologia Harvard)**.

---

## 🛠 Comandos úteis

```bash
npm run dev          # Next.js dev server
npm run build        # Build de produção
npm run lint         # ESLint
npx tsc --noEmit     # Typecheck
```

---

## 📄 Licença

Projeto solo de hackathon. Código aberto pra avaliação da banca CEFIS.

Feito por [Felipe Benevides](https://github.com/felipebenevides) · maio/2026.
