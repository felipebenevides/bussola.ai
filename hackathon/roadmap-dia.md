# Roadmap do Dia — Hora a Hora

> Plano operacional para entregar a Bússola até 26/05 23h59.
> Premissa: dia "padrão hackathon" de ~14-16h úteis. Ajuste se começar mais tarde.

---

## Distribuição de papéis (time de 3)

| Pessoa | Foco | Responsabilidades |
|---|---|---|
| **Dev 1 (você?)** | Backend + IA | Setup, RAG, agentes, integrações |
| **Dev 2** | Frontend | Telas, UX, streaming, componentes |
| **Dev 3** | Conteúdo + Pitch | Ingestão de conteúdo CEFIS, dataset de demo, roteiro de pitch, screenshots |

Se for solo, faça na ordem: Setup → RAG mínimo → 1 agente → UI mínima → próximo agente. Não tente paralelizar mentalmente.

---

## Hora a hora

### 🕗 H+0 a H+1 — SETUP + INGESTÃO EM PARALELO (não negocia)

**Objetivo:** repositório, deploy, banco prontos. **E ingestão de transcrições começando em background.**

**Dev 1 (você) — setup do projeto:**
- [ ] Criar repositório GitHub público (`bussola-cefis`)
- [ ] `npx create-next-app@latest bussola --typescript --tailwind --app --src-dir=false`
- [ ] Instalar deps:
  ```bash
  npm i ai @ai-sdk/openai zod @supabase/supabase-js openai
  npm i lucide-react clsx tailwind-merge
  npx shadcn@latest init
  npx shadcn@latest add button card input textarea dialog toast skeleton avatar
  ```
- [ ] Criar projeto Supabase, copiar URL + ANON_KEY + SERVICE_KEY
- [ ] Rodar schema SQL inicial (cole o bloco de `arquitetura.md` + ajustes de `integracao-cefis.md` — IDs `integer` para CEFIS, não uuid)
- [ ] Criar bucket `podcasts` (public) no Supabase Storage
- [ ] Criar `.env.local` com chaves (incluir `CEFIS_DEMO_API_KEY`)
- [ ] Colar `lib/cefis.ts` (cliente pronto em `integracao-cefis.md` §6)
- [ ] Push para GitHub, conectar Vercel, primeiro deploy

**Dev 3 (em paralelo) — ingestão de transcrições:**
- [ ] Baixar [transcrições.zip oficial](https://drive.google.com/file/d/1FQ5grEzobP26ipRwKzq0A4kkeJ7jWs7-/view?usp=sharing)
- [ ] Descompactar em `data/transcricoes/`
- [ ] Rodar `scripts/ingest-transcriptions.ts` (snippet em `integracao-cefis.md` §11)
- [ ] **Esse processo pode levar 30-60 min** — deixe rodando enquanto avança outras tarefas
- [ ] Validar ao final: `SELECT count(*) FROM cefis_lesson_embeddings` retorna milhares

**Dev 2 (em paralelo) — preparar dataset de exemplos:**
- [ ] Criar conta em cefis.com.br (gratuita)
- [ ] Fazer login manual no app oficial para entender UX
- [ ] Anotar 3 exemplos de "pergunta do aluno" para usar na demo (ex: "qual a diferença entre crédito tributário e débito tributário?")
- [ ] Mapear category_id → label real (chamar `GET /courses?count=50` e agrupar por `categories[]`)

**Saída:** URL pública no ar + ingestão rodando + cliente CEFIS configurado.
**Anti-padrão:** ficar 2h escolhendo bibliotecas. **DECIDA E SIGA.**

---

### 🕘 H+1 a H+2 — TELA DE LOGIN + INTEGRAÇÃO COM /me

**Objetivo:** auth real com a CEFIS funcionando + perfil pré-populado.

- [ ] Criar `app/api/auth/cefis-login/route.ts` (snippet em `integracao-cefis.md` §10)
- [ ] Criar `app/login/page.tsx` com form de email + senha CEFIS
- [ ] Após login: cookie `cefis_key` setado, redireciona para `/onboarding`
- [ ] No `/onboarding`, chamar `GET /api/v1/user/me` no server component para pré-popular:
  - nome (já preenchido — vira "Oi, {nome}!" )
  - ocupação
  - atividades
  - cidade
- [ ] Validar: login funciona, perfil aparece no onboarding sem pergunta redundante

**Anti-padrão:** não fazer auth real "para ganhar tempo". A integração real **já vai entregar pontos de "Integração CEFIS"** e impressiona a banca.

---

### 🕙 H+2 a H+4 — ONBOARDING AGENT (a 1ª demo que funciona)

**Objetivo:** chat de onboarding que coleta perfil e salva no banco.

- [ ] Criar `lib/supabase.ts`, `lib/ai.ts`, `lib/user.ts` (USER_ID fixo do .env)
- [ ] Criar `app/api/onboarding/route.ts` (snippet do `arquitetura.md`)
- [ ] Criar `app/onboarding/page.tsx` com `useChat` (snippet)
- [ ] Estilizar bonito (shadcn Card, avatar Bússola)
- [ ] Testar: fluxo de 5-7 perguntas, IA chama `save_profile`, mensagem final de confirmação
- [ ] Validar no Supabase Dashboard: `user_profile` tem registro
- [ ] **Commit + push + deploy automático**
- [ ] Testar em produção

**Critério de parada:** funciona em https://bussola.vercel.app/onboarding. Se não funciona, **NÃO siga adiante**.

---

### 🕛 H+4 a H+6 — DIAGNOSTIC AGENT

**Objetivo:** quiz adaptativo que cria mapa de skills.

- [ ] Criar `app/api/diagnostic/route.ts`
- [ ] System prompt focado: "gere 1 pergunta por vez, com base no skill atual e nas respostas anteriores"
- [ ] Tools: `get_profile`, `generate_question`, `score_answer`, `save_assessment`
- [ ] Criar `app/diagnostico/page.tsx` — UI estilo Quiz (uma pergunta na tela, botões de resposta ou input)
- [ ] Mostrar barra de progresso
- [ ] Ao final, mostrar mapa de skills (cards com cores: verde domina, amarelo parcial, vermelho crítica)
- [ ] Validar no banco: `skill_assessment` populada

**Dica:** Não tente fazer truly adaptativo perfeito. **8 perguntas sequenciais** com dificuldade fixa por skill já é "adaptativo" o suficiente para a banca. Otimize depois se sobrar tempo.

---

### 🕒 H+6 a H+8 — CURATOR AGENT + TELA DE PLANO (com trilhas CEFIS)

**Objetivo:** botão "Gerar meu plano" produz plano visual que combina trilhas CEFIS + personalização.

- [ ] Criar `app/api/curator/generate-plan/route.ts`
  - Carrega perfil + assessment + certificados (`GET /performance/certificates`) para PULAR skills já dominadas
  - Para cada skill com lacuna, RAG search nas transcrições
  - **Chama `GET /tracks?categories[]=...`** para encontrar trilha curada relevante (acelera + dá credibilidade)
  - Decide: adicionar aula CEFIS real (via `GET /courses/:id/lessons`) ou gerar conteúdo
  - Para gaps de tempo: `GET /courses?filter[]=quick` (cursos &lt;1h)
  - Cria `study_plan` + `plan_items` com `cefis_course_id` e `cefis_lesson_id` reais
  - Returns plan structure
- [ ] Criar `app/plano/page.tsx`
  - Mostrar semanas como columns
  - Cada dia tem items com badge de origem:
    - 📺 **CEFIS** (link real `https://cefis.com.br/curso/{id}`)
    - 🎯 **Trilha CEFIS recomendada** (do `/tracks/:id`)
    - 📝 **IA-PDF** (gerado pelo Bússola)
    - 🎙️ **IA-Podcast** (gerado)
    - ❓ **Quiz**
  - Click no item abre detalhe (vídeo player com `stream_sources[].link_secure`)
- [ ] Estilizar bonito (esse será o screenshot principal do pitch)
- [ ] **Diferencial visual:** mostrar lado a lado "Trilha CEFIS genérica" (5 cursos sequenciais) vs "Plano Bússola" (reordenado por urgência, com complementos IA)

**Atenção:** essa tela é a **maior vendedora de valor**. Capriche no visual. Use cores, ícones, badges.

---

### 🕓 H+8 a H+10 — TUTOR AGENT (RAG na cara)

**Objetivo:** chat de dúvidas que cita fontes.

- [ ] Criar `app/api/tutor/route.ts` (snippet do `arquitetura.md`)
- [ ] Criar `app/tutor/page.tsx` com `useChat`
- [ ] Renderizar mensagens com **markdown + citações destacadas**:
  - Use `react-markdown` para render
  - Citações como cards no fim da resposta
- [ ] Testar: "qual diferença entre INNER e LEFT JOIN" → resposta cita aula
- [ ] Testar: "como fazer pão" → "esse tema não está no catálogo, mas..."

**Wow factor:** quando demonstrar, peça à banca: "qual dúvida vocês querem fazer?" e digite ao vivo. Mostra confiança.

---

### 🕔 H+10 a H+12 — KILLER FEATURES (inovação)

**Foco em 2 features:**

#### 1. Podcast generator (90 min)
- [ ] `app/api/podcast/generate/route.ts` (snippet do `arquitetura.md`)
- [ ] `app/podcast/page.tsx`:
  - Input: tópico + duração
  - Botão "Gerar podcast"
  - Loading com mensagem "Gerando roteiro..." → "Sintetizando voz..." → "Pronto!"
  - Player de áudio quando pronto
  - Mostra roteiro abaixo (lista de fala dos apresentadores)

#### 2. "X minutos para entender Y" (30 min)
- [ ] `app/api/quick-learn/route.ts` (snippet)
- [ ] Adicionar input rápido no `/tutor` ou tela própria
- [ ] Renderizar resposta em markdown estruturado

**Decisão crítica:** Se 12h chegou e tutor + plano + podcast estão funcionando, vá para o próximo. Se algo não funciona, **conserte antes de adicionar mais**.

---

### 🕕 H+12 a H+13 — POLIMENTO

**Objetivo:** elevar UX e robustez.

- [ ] Tela `/` (landing): apresentar produto + CTA "Começar"
- [ ] Loading states em todas as telas (Skeleton)
- [ ] Error toasts em todas as ações
- [ ] Mobile responsive (test no iPhone)
- [ ] Adicionar logo / nome / cor de marca
- [ ] Favicon
- [ ] Meta tags (OG image)

**Dica:** use [v0.dev](https://v0.dev) para gerar landing rápido se Dev 2 estiver no limite.

---

### 🕖 H+13 a H+14 — DASHBOARD + COACH (se sobrou)

- [ ] `app/dashboard/page.tsx`:
  - Card "Plano ativo" (clica vai para `/plano`)
  - Card "Próxima atividade"
  - Card "Tempo investido esta semana"
  - Card "Skills evoluídas" (mostra delta de assessment)
- [ ] `app/api/coach/daily/route.ts`: gera 1 quiz de revisão + mensagem motivacional
- [ ] Botão "Como estou indo?" abre Dialog com output do coach

**Se H+13 chegou sem polimento, pule essa etapa.**

---

### 🕗 H+14 a H+15 — REHEARSAL DO PITCH

**Objetivo:** apresentação fluida em 5 min.

- [ ] Ler `pitch-banca.md` 3 vezes
- [ ] Rodar demo 2x ponta a ponta cronometrando
- [ ] Gravar screenshots/GIFs das telas como backup (se demo travar)
- [ ] Preparar 1 slide de arquitetura (Figma/Excalidraw)
- [ ] Preparar 1 slide de métricas do produto
- [ ] Validar: link de produção funciona, sem erros 500, latência ok
- [ ] Validar: GitHub público acessível

---

### 🕘 H+15 a H+16 — BUFFER + ENTREGA

**Objetivo:** margem de segurança.

- [ ] Última passada nos prompts dos agentes
- [ ] Confirmar Supabase com dados de demo (não rodar `DELETE` por engano)
- [ ] README do GitHub com:
  - Descrição
  - Demo URL
  - Setup local
  - Stack
  - Como contribuir
- [ ] Submeter no formulário/canal oficial do hackathon **antes** de 23h59

**⚠️ ALERTA:** Submeta com 1h de antecedência. Não confie em "vou conseguir até as 23h58".

---

## Checklist de "definition of done"

Antes de apresentar, valide:

- [ ] URL pública acessível
- [ ] GitHub público com README
- [ ] Onboarding completa em &lt;2 min
- [ ] Diagnóstico completa em &lt;3 min
- [ ] Plano gerado em &lt;30s
- [ ] Tutor responde com citação CEFIS em &lt;5s
- [ ] Podcast gera em &lt;60s
- [ ] Mobile responsivo (testar no celular)
- [ ] Sem erro 500 em fluxo principal
- [ ] Pitch ensaiado 2x

---

## Anti-padrões a evitar (lições de hackathons)

1. **"Vamos refatorar isso depois"** — não, vai usar como está
2. **"Vou aprender X agora"** — não, use o que já sabe
3. **"Mais uma feature"** — não, polish a que tem
4. **"Funciona local mas no Vercel..."** — deploye desde o início, conserte assim que aparecer
5. **"O design ainda tá feio"** — shadcn já é bonito o suficiente; vá para funcionalidade
6. **"Vamos fazer auth real"** — não, mock USER_ID no .env
7. **"Vou esperar o Dev 2 terminar o frontend"** — desbloqueia com mock UI
8. **"Esse erro acho que tá só no meu localhost"** — abra incógnito + outro browser + outro device
9. **"Vou implementar streaming custom"** — use `useChat` do Vercel AI SDK, ponto

---

## Plano de contingência

| Cenário | Plano B |
|---|---|
| Catálogo CEFIS não disponível | Use conteúdo aberto + diga "demonstrando com proxy" |
| RAG retornando bobagem | Aumente threshold para 0.75, use híbrido com keyword |
| Embedding pesado/lento | Use batch=20, paralelize |
| TTS demorando muito | Reduza segmentos para 6-8, vozes simples |
| Vercel falhando | Deploy em Railway ou Render |
| OpenAI fora do ar | Fallback para Anthropic Claude Haiku |
| Time travando | Reduza escopo (tire podcast, tire coach), foque na entrega mínima |

---

## Sinais de alerta (parar e reavaliar)

- ✋ **H+4 e onboarding não funciona** → cancele agentes avançados, foque em entregar onboarding+plano simples
- ✋ **H+8 e plano não gera** → simplifique para 1 semana hardcoded com 5 items
- ✋ **H+12 e tutor não cita fonte** → mostre RAG funcionando em outra tela, mesmo que mock
- ✋ **H+14 e demo não roda online** → vá para "modo emergência" com gif gravado + slides

---

**Próximo:** [pitch-banca.md](./pitch-banca.md) — roteiro de 5 min.
