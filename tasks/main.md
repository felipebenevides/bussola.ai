# Main — Plano consolidado do dia (2026-05-26)

Deadline: **26/05/2026 23h59 BRT-3**. Submeter até **23h00** com 1h de buffer.

> Persona da demo: contador(a) querendo melhorar negociação (curso 1132 — Harvard).
> Killer feature única: **deep-link no timestamp da aula CEFIS** (chunks com `start_seconds`).
> Escopo solo: cortar dashboard / coach diário / diagnóstico cheio / podcast / "X min para Y".

---

## 0. Já entregue (base)

- [x] Next.js 15 + Tailwind 4 + shadcn (button/card/input/label) + deps (ai/openai/supabase/zod)
- [x] `.env.example` com só Supabase + ADMIN_PASSWORD (sem secrets sensíveis)
- [x] `.gitignore` ignorando `.env*`, `/data/`, `.claude/`, `.vercel`
- [x] Schema Supabase (`supabase/schema.sql` + `schema_whatsapp.sql`)
- [x] Backoffice `/admin` (settings em DB, masking, whitelist de campos)
- [x] `lib/settings.ts` server-only com cache
- [x] Login real CEFIS (`/api/auth/cefis-login`, `/login`, `/api/auth/me`, `/api/auth/logout`)
- [x] Cliente CEFIS (`lib/cefis.ts` + `lib/cefis-server.ts`)
- [x] Parser VTT (`lib/vtt.ts`) + ingestão sample (`lib/sample-ingest.ts` + `/api/admin/ingest-sample`)
- [x] Tutor agent server-side com RAG + deep-link (`lib/tutor-agent.ts`)
- [x] WhatsApp: Evolution client, OTP, webhook, página `/conectar-whatsapp`
- [x] Landing mínima `/`

## 1. Bloco crítico (deve estar online — 30pts Funcionalidade + 25pts Integração)

Ordem sugerida. Não pular para o próximo sem ter o anterior em produção.

### 1.1 Tutor — UI + route handler
- [ ] `/api/tutor/route.ts` — wrapper streaming sobre `lib/tutor-agent.ts`
- [ ] `/tutor/page.tsx` — `useChat` + render de citações como cards com botão ▶ deep-link
- [ ] Validar pergunta de Negociação Harvard → resposta com citação clicável que abre player CEFIS no segundo certo
- [ ] Fallback "esse tema não está no catálogo" funcionando

Detalhe: [backend.md §Tutor](./backend.md) · [frontend.md §Tutor](./frontend.md) · [ai.md §Tutor prompt](./ai.md)

### 1.2 Onboarding — agente curto (2-3 perguntas que servem de diagnóstico)
- [ ] `/api/onboarding/route.ts` — chat streaming com tool `save_profile`
- [ ] `/onboarding/page.tsx` — `useChat` + Card + cabeçalho "Oi, {first_name}!" pré-populado de `/me`
- [ ] Após salvar, redirecionar para `/plano`
- [ ] Validar no DB: linha em `user_profile`

Detalhe: [backend.md §Onboarding](./backend.md) · [frontend.md §Onboarding](./frontend.md)

### 1.3 Plano — curador síncrono + UI
- [ ] `/api/curator/generate-plan/route.ts` — chama `match_courses` (RAG light metadados) + `match_lesson_chunks` (RAG profundo 1132) + monta `study_plan` + `plan_items`
- [ ] `/plano/page.tsx` — 1 semana visual com badges (📺 CEFIS / 🎯 Trilha / 📝 IA / ❓ Quiz)
- [ ] Itens CEFIS com link real `cefis.com.br/curso/{id}` (validar formato)
- [ ] Botão "Tirar dúvida sobre essa aula" leva ao `/tutor` com contexto pré-carregado

Detalhe: [backend.md §Curador](./backend.md) · [frontend.md §Plano](./frontend.md)

## 2. Bloco de polimento (UX 10pts + Inovação 15pts)

- [ ] Landing `/` com copy de persona contador + CTA único "Entrar com CEFIS"
- [ ] Loading skeletons em `/onboarding`, `/plano`, `/tutor`
- [ ] Error toast genérico
- [ ] Mobile responsive (testar no celular real)
- [ ] Favicon + OG image
- [ ] Citação no Tutor com tempo formatado `mm:ss` e botão visual destacado (killer feature precisa BRILHAR)

Detalhe: [frontend.md §Polish](./frontend.md)

## 3. Infra & deploy

- [ ] Criar repo GitHub público `bussola-cefis`
- [ ] Primeiro commit (já tem `?? .gitignore` mas nada commitado — ver `git status`)
- [ ] Conectar Vercel + adicionar env vars (Supabase + ADMIN_PASSWORD)
- [ ] Rodar schemas no Supabase prod
- [ ] Configurar credenciais via `/admin` em prod (OpenAI key, CEFIS demo key)
- [ ] Rodar `/api/admin/ingest-sample` em prod uma vez
- [ ] Smoke test ponta-a-ponta em prod

Detalhe: [infra.md](./infra.md)

## 4. Pitch & submissão

- [ ] README do repo (descrição, demo URL, stack, setup)
- [ ] Screenshots backup (tutor com citação, plano, onboarding)
- [ ] Slide de arquitetura (1 imagem)
- [ ] Roteiro de 5 min decorado (ver `hackathon/pitch-banca.md`)
- [ ] Ensaiar 2x ponta-a-ponta cronometrando
- [ ] **Submeter no canal oficial até 23h00**

Detalhe: [pitch.md](./pitch.md)

---

## Gates de decisão

| Hora | Se não está pronto, corte |
|---|---|
| 14h | Tutor UI funcionando online → senão, mostre via API direto e siga |
| 17h | Onboarding salvando perfil → senão, hardcode perfil de demo |
| 19h | Plano renderizando → senão, mostre JSON da resposta no pitch |
| 21h | Polimento parado, foco em pitch |
| 22h | Freeze de código. Só fix de bug crítico daqui pra frente |
| 23h | Submeter. Sem exceção |
