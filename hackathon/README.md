# Hackathon CEFIS — Briefing &amp; Estratégia

> **Deadline:** 26 de maio de 2026, 23h59 (BRT-3)
> **Prêmio:** R$ 10.000
> **Time:** até 3 pessoas
> **Modo mentor:** este pacote foi pensado para você apresentar HOJE com um protótipo deployado.

---

## Documentos deste pacote

| Documento | Use quando |
|---|---|
| [README.md](./README.md) (este) | Para alinhar contexto, critérios e estratégia |
| [proposta-produto.md](./proposta-produto.md) | Para vender a ideia — o "o quê" e o "por quê" |
| [arquitetura.md](./arquitetura.md) | Para guiar implementação — stack, RAG, agents, schema |
| **[endpoints-cefis.md](./endpoints-cefis.md)** | **Cheatsheet dos 8 endpoints CEFIS — referência rápida copy-paste** |
| **[integracao-cefis.md](./integracao-cefis.md)** | **Cliente TypeScript completo + estratégia de uso** |
| [roadmap-dia.md](./roadmap-dia.md) | Plano hora a hora do dia do hackathon |
| [pitch-banca.md](./pitch-banca.md) | Roteiro de demo de 5 min para a banca |

> 📌 **Atualização importante:** a CEFIS forneceu doc oficial de APIs (PDF) + ZIP com transcrições prontas. Veja [`integracao-cefis.md`](./integracao-cefis.md) — isso muda a estratégia (auth real, catálogo real, transcrições prontas para RAG). **A persona do produto agora foca em direito/OAB/concursos/contabilidade**, áreas fortes da CEFIS.

---

## Sobre a CEFIS (resumo)

EdTech brasileira focada em democratizar educação de qualidade. Cultura: usuário em 1º lugar, sonhar grande, assumir riscos, eficiência, excelência, humildade, integridade, foco no resultado.

O hackathon convida participantes a construir o **futuro do aprendizado personalizado**, usando IA + o conteúdo real da plataforma da CEFIS.

---

## O desafio (em uma frase)

> Construir um **tutor de IA que realmente conhece o aluno** — diagnostica lacunas, monta plano adaptativo combinando catálogo CEFIS + conteúdo gerado, e acompanha a evolução ao longo do tempo.

---

## Entrega mínima obrigatória

1. **Onboarding do aluno** — coleta perfil, objetivos, experiência, nível
2. **Diagnóstico de lacunas** — identifica o que falta para atingir o objetivo
3. **Plano de estudos adaptativo** — combina catálogo CEFIS + conteúdo gerado por IA (PDF, podcast, etc.), respeitando tempo disponível ("tenho 10 min para entender astronomia")

## Diferenciais valorizados

- Adaptação a estilo de aprendizagem (visual/auditivo/cinestésico)
- Geração de conteúdo original (apostilas, resumos, quizzes)
- Múltiplos formatos (áudio, podcast, chat)
- Acompanhamento contínuo (avaliação diária + ajuste)
- Tira-dúvidas com RAG sobre material real
- UX bem projetada

---

## Critérios de avaliação (100 pts)

| Critério | Peso | Onde ganhamos |
|---|---|---|
| **Funcionalidade** | 30 pts | Fluxo principal funciona sem travar. Demo precisa rodar online. |
| **Integração CEFIS** | 25 pts | Tutor usa conteúdo real do catálogo (RAG). |
| **Qualidade da IA** | 20 pts | Respostas relevantes, precisas, adaptadas ao perfil. |
| **Inovação** | 15 pts | Algo criativo/inesperado (ex: podcast generator, "10 min para X"). |
| **UX** | 10 pts | Interface clara, fluida, agradável. |

**Insight estratégico:** Funcionalidade + Integração CEFIS = **55 pts (mais da metade)**. Se isso falhar, nada salva. Se isso for sólido, restam 45 pts para diferenciar via inovação e UX. **Prioridade absoluta: o fluxo principal precisa rodar online**.

---

## Estratégia para ganhar (resumo executivo)

### 1. Foco em entregar (30 + 25 pts)
- Entregar 5 telas que funcionam &gt; 15 telas com bug
- Deploy no Vercel desde a primeira hora (CI contínuo)
- **Baixar transcrições.zip oficial** nos primeiros 10 min e iniciar ingestão em background

### 2. RAG no coração (25 pts)
- Embeddings das **transcrições oficiais CEFIS** em pgvector
- Toda resposta do tutor cita lições reais com `course_id` + `lesson_id` da CEFIS
- Search híbrido (vetorial + keyword) para precisão
- Cruza com `GET /tracks` para sugerir trilhas curadas como pontos de partida

### 3. Multi-agent com Vercel AI SDK (20 pts)
- 5 agents especializados: Onboarding, Diagnóstico, Curador, Tutor, Coach
- Orquestração via tool calling do SDK (zero framework boilerplate)
- Streaming UI para sensação de "vivo"

### 4. Killer features (15 pts)
- **"X minutos para entender Y"** — plano que se adapta ao tempo disponível
- **Podcast generator** — dois "apresentadores" IA conversam sobre o tema (estilo NotebookLM)
- **Diagnóstico via conversa** — não formulário chato, e sim diálogo natural

### 5. UX limpa (10 pts)
- shadcn/ui + Tailwind = visual profissional grátis
- Streaming markdown nas respostas
- Skeleton loaders em tudo

---

## Stack recomendada (decisão para não perder tempo)

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC + streaming nativo |
| IA | **Vercel AI SDK** + OpenAI | Abstrai tool calling, streaming, structured outputs |
| Modelo principal | `gpt-4o-mini` ou `gpt-4.1-mini` | Custo/qualidade equilibrados |
| Modelo TTS | OpenAI `tts-1` (voices: nova, alloy) | Podcast generator |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) | Padrão indústria, rápido |
| DB | Supabase (Postgres + pgvector + Auth) | RAG + auth em um pacote |
| UI | shadcn/ui + Tailwind | Componentes prontos, customizáveis |
| Deploy | Vercel | 1 clique, integração Next.js perfeita |

---

## Regras críticas (não esquecer)

- Código **100% feito no dia** — projetos pré-iniciados são desclassificados
- Bibliotecas/frameworks/templates podem ser usados livremente
- **Prazo:** 26/05 23h59 (BRT-3)
- **Online obrigatório** — não roda só na máquina
- Repositório **público** no GitHub
- Time de até 3 pessoas (ou solo)
- Premiação dividida pelo time

---

## Próximos passos (agora)

1. Leia [proposta-produto.md](./proposta-produto.md) — alinhe a visão com seu time
2. Leia [arquitetura.md](./arquitetura.md) — entenda RAG + agents que vamos construir
3. Siga o [roadmap-dia.md](./roadmap-dia.md) — plano hora a hora
4. Use [pitch-banca.md](./pitch-banca.md) — ensaie os últimos 30 min antes da apresentação
