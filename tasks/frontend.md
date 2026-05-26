# Frontend — Páginas, componentes e UX

## Concluído

- [x] `app/layout.tsx` — root com Tailwind
- [x] `app/page.tsx` — landing mínima (🧭 + CTA Começar diagnóstico + Admin)
- [x] `app/login/page.tsx` — form email + senha CEFIS
- [x] `app/admin/page.tsx` — backoffice de settings (OpenAI/CEFIS/Evolution/modelos/RAG)
- [x] `app/conectar-whatsapp/page.tsx` — fluxo de OTP via WhatsApp
- [x] Componentes shadcn: `button`, `input`, `label`, `card`

## Pendente

### Tutor (`/tutor`)
- [x] `app/tutor/page.tsx` — chat client com fetch para `/api/tutor`, markdown via `react-markdown`, citações como `<CitationCard />`, suggestedCourses como links, loading dots, empty state com 4 sugestões prontas de negociação.
- [x] `components/citation-card.tsx` — card emerald com tempo formatado + botão "▶ Abrir aos mm:ss" abrindo deep-link em nova aba.

### Onboarding (`/onboarding`)
- [x] `app/onboarding/page.tsx` — server component carrega `firstName` via `getCefisClient().me()`, redireciona pra `/login` se sem cookie.
- [x] `app/onboarding/onboarding-chat.tsx` — client component, dispara primeiro turno automaticamente, POST turn-based para `/api/onboarding`. Quando `complete=true`, mostra status e botão "Gerar meu plano →" que chama o curador e redireciona para `/plano`.

### Plano (`/plano`)
- [x] `app/plano/page.tsx` — server fetch via `getActivePlanForUser()`. Estado empty (sem plano) com CTA gerar; com plano: header (title + rationale + badge Semana 1) + grid de dias da semana.
- [x] `WeekView` agrupa items por `day_of_week`, render em cards.
- [x] `PlanItemRow` mostra badge colorido por source (CEFIS/Trilha/IA/Quiz), duração, título, curso·aula, botão "▶ Abrir na CEFIS" (deep-link com timestamp) + "Tirar dúvida" → `/tutor`.
- [x] `generate-button.tsx` — client component para "Gerar/Refazer plano" com loading.

### Landing
- [x] `app/page.tsx` — copy de persona contador/negociação, 3 features destacando killer feature (cita segundo exato), CTA "Entrar com CEFIS".

### Polish (próxima rodada)
- [x] `app/plano/loading.tsx` — skeleton de cards animados para o Suspense do server component
- [x] `app/onboarding/loading.tsx` — placeholder enquanto carrega perfil CEFIS
- [~] Toast genérico — dispensado, erro inline já cobre os 3 fluxos
- [x] `app/opengraph-image.tsx` — render edge com gradiente esmeralda + 🧭 (1200x630)
- [x] Meta tags em `layout.tsx` (title + description já existem)
- [ ] Mobile: testar `/tutor` em 375px — citações já têm `flex-col sm:flex-row` mas validar no device

### Cortado
- [~] `/dashboard` — fora de escopo solo
- [~] `/diagnostico` — fundido no onboarding
- [~] `/podcast`, `/biblioteca` — fora de escopo

## Padrões

- Server components por padrão; `'use client'` só onde tem `useChat`/`useState`
- Cores: zinc + accent (a definir — se nada, ficar mono)
- Acessibilidade: botões com `aria-label`, links externos com `rel="noopener noreferrer"`
