# Pitch para a Banca — 5 Minutos

> Use isso nos últimos 30 minutos antes de apresentar. Ensaie em voz alta 2x.
> Total: **5 minutos** (banca de hackathon não tolera passar). Tenha versão de **3 min** se cortarem.

---

## Estrutura da apresentação

| Bloco | Tempo | Quem fala | Tela |
|---|---|---|---|
| 1. Abertura (problema) | 30s | Apresentador | Landing |
| 2. Demonstração (jornada Maria) | 3min | Apresentador + co-piloto | App ao vivo |
| 3. Como funciona (técnica) | 60s | Dev | Slide arquitetura |
| 4. Inovação + métricas | 30s | Apresentador | Slide métricas |
| 5. Fechamento | 30s | Apresentador | Logo + CTA |

---

## Bloco 1 — Abertura (30s)

**Tela:** landing.

> "Quem aqui já abriu uma plataforma com mil cursos e não soube por onde começar?
>
> Esse é o problema do aluno moderno: tem muito conteúdo, **falta caminho**. Tem muita disciplina pra estudar, **falta tempo**. Quer mudar de área, **não sabe a lacuna entre onde está e onde precisa chegar**.
>
> A gente construiu hoje a **Bússola** — uma tutora de IA que resolve isso usando o catálogo da CEFIS."

**Transição:** "Vou mostrar como funciona com uma persona real: Marina, contadora de 28 anos, quer dominar Direito Tributário em 4 meses para abrir escritório próprio."

---

## Bloco 2 — Demo (3min) — A PARTE QUE MAIS IMPORTA

### Cena 1 — Login + Onboarding (40s)

**Tela:** `/login` → `/onboarding`

> "Marina já tem conta na CEFIS. Ela faz **login real**."

[Digite credenciais reais ou demo, clique entrar]

> "A Bússola **já sabe quem ela é** — chamou a API da CEFIS, pegou nome, ocupação, cidade, atividades. Não pede o que já tem."

[Mostre a tela de onboarding com "Oi Marina! Vi que você é contadora em SP. Qual seu objetivo agora?"]

[Digite ao vivo:]
```
quero dominar direito tributário para abrir meu escritório em 4 meses
```

> "Em 4 perguntas — não 50 — ela conhece o suficiente. **Note que a IA decide a próxima pergunta com base na anterior.** Não é formulário, é mentor."

### Cena 2 — Diagnóstico (30s)

**Tela:** `/diagnostico`

> "Antes de perguntar qualquer coisa, a Bússola **consulta o histórico real** da Marina na CEFIS — vê que ela já tem certificado de Contabilidade Básica com 90% de acerto. **Pula isso no diagnóstico.**"

[Mostre uma label "Já dominado: Contabilidade Básica (certificado CEFIS 90%)"]

> "Faz um **quiz adaptativo de 2 minutos** focado no que falta."

[Mostre 2 perguntas sendo respondidas]

> "Cada resposta calibra a próxima. Resultado:"

[Tela final: mapa de skills com cores]

> "**Contabilidade Básica: domina (via certificado). Direito Tributário: lacuna crítica. ICMS: lacuna crítica. Planejamento Tributário: lacuna parcial.**"

### Cena 3 — Plano (40s) — A PROVA REAL DA INTEGRAÇÃO

**Tela:** `/plano`

> "Em 30 segundos a Bússola monta um plano de 16 semanas."

[Aponte na tela]

> "Cada dia tem uma atividade. Veja os badges:
> - 🎯 **Trilha CEFIS 'Tributário Avançado'** — a Bússola encontrou uma trilha curada por especialistas e usou como espinha dorsal
> - 📺 **Aula real CEFIS** (linka para `cefis.com.br/curso/{id}` — abre o player real)
> - 📝 **Resumo gerado pela IA** — onde a trilha não cobria um gap específico
> - 🎙️ **Podcast gerado** — para os 45 min de carro dela"

> "**Aqui está o pulo do gato**: comparativo lado a lado."

[Mostre os 2 painéis: "Trilha CEFIS padrão" (5 cursos lineares) vs "Plano Bússola para Marina" (reordenado, com complementos)]

> "Trilha genérica vs trilha **dela**. Mesmo conteúdo CEFIS — caminho diferente."

### Cena 4 — Tutor com RAG (40s) — A INTEGRAÇÃO CEFIS

**Tela:** `/tutor`

> "Em qualquer momento, Marina tira dúvida."

[Convide a banca:] **"Pode escolher uma pergunta? Qualquer coisa que vocês fariam pra um tutor de tributário ou contabilidade?"**

[Digite a pergunta sugerida — ou use fallback se ninguém sugerir:]
```
Qual a diferença entre crédito tributário e débito tributário?
```

> "A Bússola responde com base nas **transcrições reais das aulas da CEFIS** — e olha aqui — **cita a aula real, com link clicável que abre direto na plataforma da CEFIS no ponto certo do vídeo**."

[Mostre a citação, clique no link, mostre que abre `cefis.com.br/curso/...`]

> "Indexamos **N mil chunks** das transcrições oficiais que a CEFIS disponibilizou. Toda resposta é ancorada no conteúdo real."

### Cena 5 — Killer feature: Podcast (30s)

**Tela:** `/podcast`

> "E o diferencial: Marina me disse que aprende ouvindo, **no caminho do trabalho — 45 minutos por dia**."

[Digite:]
```
Tópico: ICMS para escritório contábil
Duração: 5 minutos
```

[Clique em "Gerar"]

> "Em 30 segundos, a Bússola gera um podcast com dois apresentadores conversando sobre ICMS — usando contexto das **transcrições reais das aulas da CEFIS** sobre o tema."

[Quando carregar, toque 5 segundos do podcast]

> "**Pronto. Áudio. Para ouvir no carro.** Conteúdo CEFIS, novo formato."

---

## Bloco 3 — Como funciona (60s)

**Tela:** Slide de arquitetura (Figma/Excalidraw)

> "Por baixo dos panos, são **5 agentes de IA especializados** orquestrados via Vercel AI SDK:"

[Aponte no slide]

> "**Onboarding Agent** coleta perfil em conversa.
> **Diagnostic Agent** roda quiz adaptativo.
> **Curator Agent** monta o plano usando o catálogo CEFIS + gera conteúdo quando falta.
> **Tutor Agent** responde dúvidas com **RAG** sobre embeddings do catálogo.
> **Coach Agent** acompanha o aluno diariamente."

> "O RAG usa **pgvector no Postgres**, embeddings da OpenAI, e busca híbrida vetorial + keyword para precisão."

> "Stack: **Next.js 15, Vercel AI SDK, OpenAI, Supabase**. Deploy no Vercel. Custou menos de **5 dólares** rodar o dia inteiro."

---

## Bloco 4 — Inovação + métricas (30s)

**Tela:** Slide com números

> "Os 3 diferenciais:
>
> 1. **'X minutos para entender Y'** — comando direto: '10 min para aprender astronomia'. A Bússola monta um micro-resumo no tempo exato.
>
> 2. **Podcast generator estilo NotebookLM** — dois apresentadores IA conversam. Único na competição.
>
> 3. **Diagnóstico por conversa, não formulário** — sente como falar com mentor humano.
>
> Em números:
> - **5 agentes especializados** em produção
> - **N lições CEFIS indexadas** (substitua pelo número real)
> - **&lt;30s** do diagnóstico ao plano pronto
> - **&lt;2s** de resposta do tutor
> - **3 formatos** de conteúdo: vídeo, PDF, podcast"

---

## Bloco 5 — Fechamento (30s)

**Tela:** Logo + URL

> "A CEFIS tem como missão **democratizar a educação de qualidade**.
>
> O conteúdo já está lá. O que falta é o **caminho**. A Bússola dá esse caminho para cada aluno — único, adaptativo, contínuo.
>
> A gente construiu isso em **um dia**, com **menos de 5 dólares** de infra. Imagina o que vira com a equipe da CEFIS por trás.
>
> URL: **bussola-cefis.vercel.app**. GitHub: link no canal.
>
> Obrigado."

---

## Material visual (preparar nas últimas 2h)

### Slide 1 — Arquitetura

ASCII art em Excalidraw ou desenho à mão estilizado:

```
ALUNO
  │
  ▼
┌────────────────────────────────────┐
│  Bússola (Next.js + Vercel AI SDK) │
├────────────────────────────────────┤
│  5 AGENTES                          │
│  ┌──────┐ ┌──────┐ ┌──────┐         │
│  │Onbor.│ │Diagn.│ │Curad.│         │
│  └──────┘ └──────┘ └──────┘         │
│  ┌──────┐ ┌──────┐                  │
│  │Tutor │ │Coach │                  │
│  └──────┘ └──────┘                  │
├────────────────────────────────────┤
│  RAG: pgvector + OpenAI Embeddings │
│  Catálogo CEFIS indexado            │
├────────────────────────────────────┤
│  GERAÇÃO: PDFs, Podcasts, Quizzes   │
└────────────────────────────────────┘
```

### Slide 2 — Métricas

```
┌────────────────────────────────┐
│ BÚSSOLA EM NÚMEROS              │
├────────────────────────────────┤
│                                 │
│   5     Agentes IA              │
│   100+  Lições CEFIS indexadas  │
│   3     Formatos de conteúdo    │
│  <30s   Para gerar plano        │
│  <2s    Resposta do tutor       │
│  <$5    Custo de infra/dia      │
│                                 │
└────────────────────────────────┘
```

### Slide 3 — Fechamento

Logo + URL + CTA

```
   🧭  BÚSSOLA

  O caminho personalizado
  para o aprendizado.

  bussola-cefis.vercel.app
```

---

## Resposta às perguntas que a banca VAI fazer

### "Como vocês integraram com o catálogo da CEFIS?"

> "Integração completa com as 3 APIs:
> - **v1 (login + /me):** auth real, perfil pré-populado
> - **v3 (catálogo):** `/courses`, `/courses/:id/lessons` para listar e tocar vídeos com `stream_sources`, `/tracks` para usar trilhas curadas como espinha dorsal
> - **v3 (progresso):** `/performance/certificates` para detectar skills já dominadas, `progress.lastSecond` em cada aula para retomar de onde parou
>
> Indexamos as **N mil transcrições oficiais** que a CEFIS disponibilizou em pgvector com OpenAI embeddings. Toda resposta do tutor usa RAG sobre essa base com citação clicável de volta para `cefis.com.br`."

### "Como a IA decide o que gerar vs o que pegar do catálogo?"

> "O Curator Agent faz RAG primeiro. Se encontra aulas com similaridade &gt; 0.7, usa o catálogo. Se não encontra ou se o conteúdo é parcial, gera complemento. Isso preserva o investimento no catálogo e cobre lacunas."

### "Como vocês validam a qualidade da resposta da IA?"

> "Hoje: structured outputs com Zod + citações obrigatórias. Próximos passos: evals automatizados (LangSmith ou similar), feedback do aluno, cross-check entre agentes."

### "Custo de operação em escala?"

> "Cada aluno consome ~$0.20 por mês de IA com uso médio (10 conversas + 2 podcasts). Modelos pequenos (gpt-4o-mini, tts-1) mantém o custo proporcional. Escala bem."

### "E privacidade dos dados do aluno?"

> "Perfil e progresso ficam em banco próprio. Não treinamos modelos com dados de aluno. OpenAI API com data retention desligado. LGPD: estrutura prevista para direito ao esquecimento e exportação."

### "Por que vocês escolheram essa stack?"

> "Velocidade de execução. Vercel AI SDK abstrai tool calling e streaming — pouparia umas 4-6h vs implementação from scratch. Supabase dá Postgres + pgvector + Storage em um provedor. Em um dia, isso é decisivo."

### "Como vocês mediriam sucesso desse produto?"

> "Métricas óbvias: completion rate do plano, retenção 30d, NPS. Métricas únicas da Bússola: % de itens do plano completados no prazo, evolução do skill_assessment entre diagnósticos, número de dúvidas resolvidas sem precisar abrir aula."

### "O que vocês NÃO entregaram que estava no escopo?"

> "Auth real (mockamos durante o dia), gamificação, integração com calendar do aluno, e versão mobile nativa. Todas no roadmap pós-hackathon."

---

## Regras de demo (importantes)

1. **Nunca diga "deveria funcionar"** — se algo trava, pule com calma. "Vou mostrar o próximo, esse é o ponto principal."
2. **Tenha gif de backup** das telas críticas. Se cair, abra o gif.
3. **Não leia slide** — slide é apoio, fala é você.
4. **Olhe para a banca**, não para a tela.
5. **Toque o podcast por 5s no máximo** — banca não tem paciência para áudio longo.
6. **Não chame de "MVP"** — chame de "produto" ou "Bússola". Soa mais maduro.
7. **Tom: confiante mas humilde** — "construímos em um dia" → mostra esforço, não fragilidade.

---

## Lista de bugs comuns que vão atrapalhar a demo (revisar 1h antes)

- [ ] OpenAI rate limit (use modelo "mini" não "regular")
- [ ] Supabase RLS bloqueando (use service_key no server, anon só onde precisa)
- [ ] CORS no áudio (use bucket público)
- [ ] Edge runtime sem alguma lib (force Node runtime: `export const runtime = 'nodejs'`)
- [ ] localStorage não funciona no SSR (use `'use client'` nos hooks)
- [ ] Streaming travado (cheque `runtime` e `dynamic = 'force-dynamic'`)
- [ ] Mobile com viewport quebrado (use `viewport` no `metadata`)

---

## Frase de impacto para abrir e fechar

**Abertura possível:**
> "A maior plataforma de educação do mundo não é a CEFIS, nem a Udemy. É a confusão. Hoje a gente construiu o antídoto."

**Fechamento possível:**
> "Conteúdo, a CEFIS já tem. Caminho, a Bússola dá."

---

**Última checagem antes de subir no palco:**
- [ ] URL pública aberta em uma aba (e funciona)
- [ ] Slide arquitetura aberto em outra aba
- [ ] Slide métricas aberto em outra aba
- [ ] GitHub público confirmado
- [ ] Conexão à internet testada na sala
- [ ] Microfone funcionando
- [ ] Backup local (laptop) caso wifi caia
- [ ] Demo persona "Maria" memorizada
- [ ] Respiração: 3 respirações profundas antes de subir

**Boa sorte. Vai dar certo. 🧭**
