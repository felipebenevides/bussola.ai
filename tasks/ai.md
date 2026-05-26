# AI — Prompts, RAG, embeddings, modelos

## Concluído

### Pipeline / RAG / modelos
- [x] Embedding pipeline (`lib/sample-ingest.ts`) com `text-embedding-3-small` (1536 dims)
- [x] Chunking estratégia: target 800 chars, max 1200, respeitando boundaries do VTT
- [x] Cada chunk carrega `start_seconds` + `end_seconds` (destrava deep-link)
- [x] RAG functions no Postgres:
  - `match_lesson_chunks(embedding, threshold, k)` — RAG profundo no 1132
  - `match_courses(embedding, k)` — RAG light de metadados dos 26 cursos
- [x] Modelos parametrizáveis via `/admin` (chat_model, embedding_model, voices)
- [x] **Provider chat: OpenRouter primário, OpenAI fallback.** `OPENROUTER_API_KEY` em env (Vercel já setado). `genObject()` em `src/lib/ai.ts` tenta OpenRouter; em qualquer erro cai pra OpenAI direto. Embeddings + Whisper + TTS seguem direto na OpenAI (OpenRouter não cobre esses endpoints).
- [x] Auto-prefix do `chat_model`: se a setting não tiver `/`, prefixamos `openai/` ao chamar OpenRouter (`gpt-4o-mini` → `openai/gpt-4o-mini`). Se já tiver `/` (ex.: `anthropic/claude-3.5-sonnet`), respeita.

### Prompts (todos em PT-BR via `generateObject` + Zod)
- [x] **Onboarding** (`src/app/api/onboarding/route.ts`)
  - Persona "Bússola, tutora pessoal do CEFIS", máx 4 perguntas
  - Coleta `goal` / `available_minutes_per_day` (+ deadline) / `learning_style` / `weak_area`
  - Pré-popula com `first_name`/`occupation`/`city` de `/me` (CEFIS API)
  - Confirma e persiste em `user_profile` + cria `skill_assessment` da área fraca
  - Mensagem final: "Show, anotei tudo. Vou montar seu plano agora →"
- [x] **Curador** (`src/app/api/curator/generate-plan/route.ts`)
  - Input: perfil + chunks RAG (k=8, threshold≤0.65) + cursos sugeridos (k=5, threshold=0.45)
  - Output `PlanSchema` (Zod): `title`, `rationale`, `items[4..8]` com `day_of_week`, `position`, `duration_minutes`, `source`, `chunk_index`/`course_index`, `rationale`
  - Regra: prioriza `cefis_lesson` com `chunk_index` (destrava deep-link no segundo da explicação)
  - Pós-processamento resolve `chunk_index`→`{course_id,lesson_id,start_seconds}` antes de inserir em `plan_items`
- [x] **Tutor** (`src/lib/tutor-agent.ts`)
  - Tom "professor experiente, Harvard Negotiation Project (Fisher/Ury)" sem ostentar bibliografia
  - Exemplos práticos do mundo do aluno (honorários, sócio, cliente atrasando)
  - Cita momento da aula em `mm:ss` no corpo da resposta (chunks vêm com `[mm:ss=X:YY]` no contexto pra modelo copiar)
  - Cards/links anexados pela aplicação a partir de `used_chunk_indices` (sem URL no texto)
  - Fallback explícito quando nenhum chunk relevante: "Esse tópico ainda não está no nosso catálogo indexado, mas posso te explicar:" + `groundedInCefis=false`
  - `formatTutorForWhatsApp()` monta resposta plain para zap (emojis sutis, links absolutos)

## Pendente (validação manual — pré-demo, depende de OpenAI key configurada)

### Smoke test do tutor (5 perguntas-piloto)

Script automatizado: `scripts/smoke-tutor.ts`. Roda as 5 perguntas via HTTP, valida `groundedInCefis`, presença de citação com `start_seconds > 0`, e regex `mm:ss` no texto da resposta.

```bash
# pré-requisitos: npm run dev rodando + OpenAI key em /admin + ingestão sample rodada
node --experimental-strip-types scripts/smoke-tutor.ts
# ou
bun run scripts/smoke-tutor.ts
```

Critério de aprovação (script sai com exit 0):
- [ ] ≥ 3 das 4 perguntas de negociação retornam `groundedInCefis=true` + ≥1 citação + `start_seconds > 0`
- [ ] "como fazer pão" retorna `groundedInCefis=false`
- [ ] Pelo menos uma das respostas grounded cita `mm:ss` no corpo do texto

### Smoke test do curador

Script: `scripts/smoke-curator.ts`. Pré-requisitos extras: estar logado (precisa do cookie `cefis_session`) e ter completado o onboarding.

```bash
BUSSOLA_COOKIE='cefis_session=<token-do-browser>' \
AVAIL_MIN_PER_DAY=60 \
node --experimental-strip-types scripts/smoke-curator.ts
```

Critério de aprovação:
- [ ] ≥ 50% dos items são `cefis_lesson` com `source_ref` (start_seconds) preenchido
- [ ] Nenhum `day_of_week` excede `AVAIL_MIN_PER_DAY` (sábado/domingo podem ter 2× o cap)

### Tuning (só se smoke test acima falhar)
- [ ] Ajustar `rag_match_threshold` (default 0.7 → testar 0.65 / 0.75) via `/admin`
- [ ] Reduzir `rag_top_k` para 3 se respostas ficarem confusas com 5 chunks
- [ ] Curador já roda com `Math.min(threshold, 0.65)` e k=8 (mais permissivo que tutor) — não mexer salvo necessidade

## NÃO fazer

- ❌ Não trocar de provedor (OpenAI fica)
- ❌ Não implementar streaming custom — usar `useChat` + `toUIMessageStreamResponse`
- ❌ Não retreinar/fine-tunar nada
- ❌ Não inflar embeddings com texto inteiro da aula — chunks são o ponto
- ❌ Não pôr URL/markdown pesado no texto da resposta do tutor — cards/links são montados pela aplicação
