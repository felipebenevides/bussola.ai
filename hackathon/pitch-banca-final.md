# 🧭 Bússola — Pitch da Banca

> **A tutora de IA que estuda a CEFIS por você e abre o vídeo da aula no segundo exato em que aquilo é explicado.**

Hackathon CEFIS · 26/05/2026 · Felipe Benevides (solo)
URL viva: <https://bussola.klassmanager.com.br> · Web · Aplicativo PWA · WhatsApp · Grupo WhatsApp

---

## 🎯 O problema (em 1 minuto)

Profissional contábil brasileiro tem **96.000 horas-aula** de conteúdo CEFIS à disposição, mas:

1. **Não tem tempo** — 12h de trabalho, família, rotina apertada. Plataforma de vídeo linear não cabe.
2. **Não sabe por onde começar** — falta um diagnóstico que aponte exatamente o que estudar primeiro.
3. **Esquece o que aprendeu** — vê 1 hora de aula, retém 15 minutos. Sem revisão espaçada, o ROI cai.
4. **Não tem onde tirar dúvida na hora** — surge dúvida durante o trabalho, mas o catálogo está em outra janela, no escritório, no fim do dia.

**Resultado:** assinatura paga, plataforma pouco usada, evasão alta.

---

## 💡 A solução: Bússola

> **Estuda com IA, sem desculpa.**

Bússola é um **tutor de IA conversacional, gamificado, multi-canal**, integrado nativo ao catálogo da CEFIS, que combina as **melhores práticas globais de aprendizagem corporativa** — repetição espaçada, microlearning, deep-link no segundo exato, gamificação Jornada do Herói — entregue onde o aluno está: **aplicativo (PWA), página web, WhatsApp 1:1 e grupo WhatsApp empresarial**.

### Pitch em uma frase

> Bússola lê todo o catálogo CEFIS, monta seu plano semanal personalizado, responde qualquer dúvida abrindo a aula no minuto certo, e te acompanha por WhatsApp pra você não perder o ritmo.

---

## 📋 DESCRIÇÃO DO PROJETO

**Bússola** é uma plataforma de aprendizagem assistida por IA construída como camada complementar sobre o catálogo da **CEFIS** — a maior plataforma de educação contábil do Brasil. O projeto integra **três pilares** que, juntos, resolvem o paradoxo do aluno-profissional adulto: ele quer aprender mas não tem tempo, não tem método, e não tem reforço.

### Pilar 1 — Inteligência aplicada ao catálogo CEFIS

A Bússola **indexa cada aula CEFIS por transcrição completa**, gera embeddings vetoriais de cada trecho e armazena timestamps precisos no banco. Quando o aluno faz uma pergunta — em qualquer canal — o sistema busca os trechos semanticamente mais relevantes via **RAG (Retrieval-Augmented Generation)** com `pgvector` no Postgres do Supabase, monta o contexto, dispara para o modelo de linguagem via OpenRouter/OpenAI, e devolve uma resposta **citando a aula e o segundo exato** em que aquilo é explicado.

> *Pergunta: "Como abrir uma negociação difícil com cliente que atrasa pagamento?"*
> *Resposta: "Comece explicando o interesse antes da posição — 'preciso fechar caixa esse mês' fala mais que 'pague hoje'. A Profa. mostra esse pivô em **2:30** da aula 'Quebra-gelo em conflito'."*
> *→ Card clicável abre o player CEFIS direto no segundo 150.*

### Pilar 2 — Pedagogia mensurada

A Bússola **diagnostica o aluno em 6 perguntas conversacionais** (objetivo, experiência profissional, tempo/dia, estilo de aprendizagem, área de dificuldade, WhatsApp), gera um perfil de competências (`skill_assessment`), e produz um **plano semanal personalizado** misturando aulas reais da CEFIS com conteúdo gerado por IA sob demanda (resumos, quizzes, podcasts). Toda interação alimenta a **Jornada do Herói** — sistema de XP em 5 níveis (Aprendiz, Aventureiro, Estrategista, Mestre, Lenda) com streak diário e ligas semanais.

### Pilar 3 — Multi-canal sem fricção

A Bússola te encontra onde você está. **Quatro portas de entrada** com a mesma memória, mesmo plano, mesma citação no segundo exato:

| Canal | Para quem | Como funciona |
|---|---|---|
| **📱 Aplicativo (PWA)** | Aluno que quer "app fixo" no celular | Adiciona à tela inicial em iOS/Android, abre standalone como app nativo |
| **🌐 Página web** | Aluno no desktop ou navegador mobile | Tutor visual completo com sidebar de cursos, plano, gamificação |
| **💬 WhatsApp 1:1** | Aluno em trânsito, dúvida pontual | Pareamento por código OTP gated em login CEFIS; bot responde com link da aula |
| **👥 Grupo WhatsApp** | **Plano Empresarial** — times de até 5 | A Bússola entra como tutora coletiva; perguntas viram aprendizado compartilhado |

---

## ⚡ Diferenciais — por que a Bússola é a melhor solução

### 1. Deep-link no segundo exato (killer feature)

Não é apenas "veja a aula X". É **"vá em 2:30 da aula X"**. Cada citação na resposta carrega `lessonId + startSeconds` e gera a URL exata pro player CEFIS. **Reduz fricção entre dúvida e resposta de minutos pra segundos**.

> Arquitetura: 58 chunks com timestamp já indexados no sample (15 VTTs / 577 cues), `vector(1536)` no Postgres, RPC `match_lesson_chunks(query_embedding, threshold, top_k)` retorna chunks ordenados por similaridade cossênica.

### 2. RAG semântico de verdade — não só keyword search

- Embeddings via **Google Gemini (gemini-embedding-001, 1536-dim Matryoshka)** primary ou **OpenAI text-embedding-3-small** fallback
- Busca vetorial cossênica em **pgvector** com índice `ivfflat` (lists=100)
- Threshold ajustável (default 0.7), top-k configurável
- Quando há plano selecionado, expande a query com keywords dos `plan_items` pra biasar resultados sem fechar o escopo
- Quando há curso selecionado na sidebar, filtra `course_id` mas relaxa threshold pra 0.4

**Por que importa:** o aluno pergunta com palavras dele, não palavras da apostila. Busca semântica entende intent. Keyword search retorna lixo.

### 3. Multi-canal de verdade — não só "exporta pro WhatsApp"

A maioria dos concorrentes faz integração WhatsApp via bot OEM ou wa.me. A Bússola tem **infraestrutura própria**: serviço Bun dedicado (Railway), instância Evolution gerenciada, fila FIFO com delay anti-spam, HMAC entre serviços, e **pareamento por OTP gated em login CEFIS** — segurança real, não "qualquer um manda mensagem".

> Cada canal compartilha o mesmo `askTutor()` no backend → o aluno troca de canal sem perder contexto.

### 4. Plano Empresarial — grupo no WhatsApp

Diferencial **único no mercado** para CEFIS B2B. Empresa contrata, time entra num grupo WhatsApp criado automaticamente, a Bússola aparece como participante do grupo. Quando alguém pergunta, todo mundo aprende junto.

> Aproveita o **Beta aberto**: anônimo pode criar um grupo (até 5 participantes, 7 dias) só pra demonstrar pro decisor. Conversão B2B sem fricção.

### 5. Gamificação que retém — Jornada do Herói

Não é "ganhe estrelinhas". É um sistema completo:
- **5 níveis** com identidade visual própria (Aprendiz → Aventureiro → Estrategista → Mestre → Lenda)
- **XP por ação** (+10 por pergunta, +5 por citação CEFIS embasada)
- **Streak diário** com ícone de chama animado, ligas semanais
- **Quiz diário** automático via cron, baseado na `skill_assessment.lacuna_critica` do aluno
- **Calendário de atividade** dos últimos 30 dias

Quem joga Duolingo entende: streak é o que mantém o hábito. Bússola traz isso pra educação corporativa.

### 6. Integração nativa CEFIS — SSO + catálogo indexado

- **Single Sign-On** real via API CEFIS v1 (`/api/v1/login`) — sem cadastro paralelo, sem senha duplicada
- **Catálogo CEFIS espelhado** localmente com IDs reais, mantendo URLs de deep-link funcionais
- **Indexação automática de novos cursos** via agente conversacional (`Novo curso` → ID → ingest + embeddings em segundos)
- **Permite expansão**: além do CEFIS, modal aceita **PDF** e **YouTube** (atualmente em construção, com simulação visual completa pra mostrar a roadmap)

### 7. Segurança real — não "MVP de hackathon"

- HTTPS-only, cookies HttpOnly pro CEFIS session
- Secrets em DB via `/admin` (não em código nem em `.env`)
- RLS por tabela no Supabase
- HMAC entre serviços (Bussola web ↔ Bun WhatsApp service)
- OTP de pareamento com `crypto.randomBytes`, TTL 10min, uso único, gated em login
- Rate-limit no convite WhatsApp (3 por 15min)
- Webhook signature validation

---

## 🎬 Demonstração — fluxo que cabe em 3 minutos

1. **Home** (`/`) — pitch visual com mock interativo do tutor real no MacBook + celular PWA lado a lado. Qualquer clique abre o `/tutor` de verdade.
2. **Login CEFIS** (`/login`) — credencial real, SSO, redireciona pra onboarding.
3. **Onboarding** (`/onboarding`) — 6 perguntas conversacionais; agente de IA extrai e persiste perfil estruturado.
4. **Plano gerado** (`/plano`) — semana sob medida com mix de aulas CEFIS reais + reforço IA, organizada por dia.
5. **Tutor** (`/tutor`) — pergunta exemplo "Como abrir uma negociação difícil?" → resposta + **card de citação no 2:30 da aula "Quebra-gelo em conflito"** → clica → abre o player CEFIS no segundo exato.
6. **WhatsApp pairing** — botão "Receber no WhatsApp" → código OTP de 6 chars → envia pelo zap próprio → recebe boas-vindas em segundos.
7. **Plano Empresarial** — modal de grupo → cria grupo WhatsApp em segundos com a Bússola dentro.
8. **Instalação PWA** — botão "Instalar app" → prompt nativo Android ou tutorial visual iOS → ícone vira nativo no celular.

> Toda essa jornada funciona em produção real, hospedada na Railway, com Supabase como backbone e Evolution API conectada.

---

## 🛠️ Stack & arquitetura — escolhas defensáveis

| Camada | Tecnologia | Por quê |
|---|---|---|
| **Frontend** | Next.js 16 (App Router, RSC, Turbopack) | Mesma codebase pra web + PWA, server-side fetch dos providers, hidratação seletiva |
| **Estilo** | Tailwind v4 + class-based dark mode + View Transitions API | Theme toggle com efeito iOS-style sweep, tokens semânticos `--wa-*` reutilizados em todas as superfícies |
| **DB** | Supabase Postgres (schema `bussola`) | RLS por tabela, isolamento por schema, 17 tabelas modelando users/onboarding/plano/RAG/WhatsApp/grupos/gamificação |
| **Vector search** | `pgvector` (extension nativa do Postgres) | 1536-dim, ivfflat cosine, sem dependência externa, sem custo extra |
| **LLM** | OpenRouter (chat) + OpenAI (fallback + Whisper + TTS) + Google (embeddings) | Routing por providers, fallback automático, embeddings nunca misturados (vetores incompatíveis) |
| **WhatsApp** | Serviço Bun dedicado (Railway) + Evolution API v2 | Cold-start zero, FIFO queue com delay anti-spam, HMAC inter-serviços |
| **Deploy** | Railway (web + WhatsApp service) | Nixpacks autocompose, healthcheck, env vars centralizadas, deploy via `railway up` ou push GitHub |
| **PWA** | Manifest gerado dinamicamente + ícones via `next/og` ImageResponse | Sem build step manual, ícones se atualizam com o branding |

**17 tabelas principais:** `users`, `user_profile`, `skill_assessment`, `study_plan`, `plan_items`, `cefis_courses`, `cefis_lessons`, `cefis_lesson_embeddings`, `cefis_course_embeddings`, `tutor_messages`, `whatsapp_link_codes`, `user_whatsapp`, `whatsapp_messages`, `progress_log`, `generated_content`, `study_groups`, `app_settings`.

**9 migrações** aplicadas em ordem cronológica, idempotentes.

---

## 💰 Modelo de negócio (para CEFIS adotar)

### Como a Bússola monetiza pra CEFIS:

1. **Reduz churn** — aluno usa CEFIS mais (RAG + plano + gamificação) → renova assinatura
2. **Aumenta NPS** — deep-link no segundo certo é wow-factor, vira boca-a-boca
3. **Abre B2B novo** — Plano Empresarial (grupos WhatsApp) é canal de aquisição enterprise impossível com curso linear
4. **Capta dados de uso real** — `progress_log` + `tutor_messages` + `journey_xp` viram telemetria pedagógica pra CEFIS otimizar catálogo

### Custo de operação (estimativa):

- Embeddings: ~$0.02 por curso completo indexado (one-time)
- Chat por pergunta: ~$0.001-0.003 com OpenRouter no `gpt-4o-mini`
- WhatsApp: custo Evolution + Meta Cloud API por mensagem
- **Margem por aluno ativo:** alta — o caro foi indexar, o variável é centavos por pergunta

---

## 🗺️ Roadmap (12 meses)

**Q1 pós-launch (próximos 90 dias):**
- Ingest real de PDF (já com UI mock pronta — falta backend extrator + chunker)
- Ingest real de YouTube (transcrição via Whisper + indexação)
- Bot proativo: lembretes inteligentes baseados em rotina detectada
- A/B testing de copy de quiz pra maximizar streak

**Q2-Q3:**
- White-label pra outras plataformas educacionais (estrutura já está isolada por schema)
- Análise de progresso pro RH do cliente B2B
- Geração automática de podcast (TTS multivoice) pra estudar dirigindo
- Multi-idiomas

**Q4:**
- Tutor por voz no WhatsApp (já há Whisper para STT in/out)
- Integração com calendário (Google/Outlook) para bloquear "horário Bússola"
- Marketplace de planos sugeridos por professor CEFIS

---

## 🏁 Fechamento

A Bússola **não é mais um chatbot**. É uma camada de aprendizagem aplicada que faz a CEFIS — já líder em educação contábil — virar **a plataforma onde o aluno realmente conclui o curso**, recomenda pro colega, e renova assinatura sem pensar.

Isso é possível porque a Bússola entrega:
- **🎯 IA com RAG real** que cita o segundo certo da aula CEFIS
- **📱 4 canais** com a mesma memória — onde o aluno estiver, a Bússola está
- **👥 Grupo WhatsApp empresarial** — diferencial B2B único no mercado
- **🏆 Gamificação Jornada do Herói** que retém pela curiosidade, não pelo medo
- **🔒 Engenharia de produção** — não MVP de hackathon: OTP gated, RLS, HMAC, RLS, PWA, dark/light, theme tokens, healthcheck, multi-deploy

**O hackathon acabou? Não.**
**Tudo isso já está rodando em produção.** Você consegue pegar seu celular agora, abrir <https://bussola.klassmanager.com.br>, fazer login com CEFIS, gerar um plano, conversar com a tutora e receber a aula no segundo exato.

---

> *"Estuda com IA, sem desculpa."*
> Felipe Benevides · Engineering Manager · 10+ anos de prática · pai de 4
> contato: felipebenevides@outlook.com · linkedin/in/eng-felipebenevides
