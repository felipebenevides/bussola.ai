# AI — Prompts, RAG, embeddings, modelos

## Concluído

- [x] Embedding pipeline (`lib/sample-ingest.ts`) com `text-embedding-3-small` (1536 dims)
- [x] Chunking estratégia: target 800 chars, max 1200, respeitando boundaries do VTT
- [x] Cada chunk carrega `start_seconds` + `end_seconds` (destrava deep-link)
- [x] RAG functions no Postgres:
  - `match_lesson_chunks(embedding, threshold, k)` — RAG profundo no 1132
  - `match_courses(embedding, k)` — RAG light de metadados dos 26 cursos
- [x] Tutor agent (`lib/tutor-agent.ts`) — `generateObject` com Zod schema:
  - Resposta em PT-BR
  - Lista de citações estruturadas
  - Cursos sugeridos
  - Flag `hasContext` (fallback quando RAG não retorna nada relevante)
- [x] Modelos parametrizáveis via `/admin` (chat_model, embedding_model, voices)

## Pendente

### Prompts a escrever

#### Onboarding agent
- [ ] System prompt curto em PT-BR:
  - Persona: "Bússola, tutora pessoal do CEFIS"
  - Tom: acolhedor, direto, sem floreio
  - Máximo 4 perguntas: objetivo, tempo/dia, deadline, área fraca percebida
  - Pre-popula com nome/cidade/ocupação do `/me`
  - Tool `save_profile` obrigatória ao final
  - Fim: "Vou montar seu plano agora →" + botão

#### Curador (síncrono, não agente)
- [ ] System prompt para `generateObject`:
  - Input: perfil + chunks RAG + cursos sugeridos
  - Output schema Zod:
    ```ts
    {
      summary: string,
      week: {
        items: Array<{
          day: 'seg'|'ter'|...,
          minutes: number,
          type: 'cefis_lesson' | 'cefis_track' | 'ia_summary' | 'quiz',
          title: string,
          cefis_course_id?: number,
          cefis_lesson_id?: number,
          start_seconds?: number,
          rationale: string,
        }>
      }
    }
    ```
  - Regra: 5-7 itens, somar ≤ tempo total da semana, priorizar aulas reais com timestamp

#### Tutor (já parcial — confirmar)
- [ ] Revisar system prompt para citar `mm:ss` no corpo da resposta E nos cards
- [ ] Garantir tom "professor experiente, exemplos de negociação Harvard"

### Validações de qualidade
- [ ] Rodar 5 perguntas-piloto no tutor:
  - "qual a melhor abertura numa negociação difícil?"
  - "o que é BATNA?"
  - "como negociar honorários sem perder o cliente?"
  - "como fazer pão" (deve cair em fallback)
  - "diferença entre posição e interesse"
- [ ] Confirmar que ≥ 3 das 4 perguntas de negociação retornam citação com `start_seconds` válido
- [ ] Confirmar fallback elegante para "fazer pão"

### Tuning
- [ ] Ajustar `rag_match_threshold` se citações vierem ruins (start 0.7 → testar 0.65 / 0.75)
- [ ] Considerar `top_k=3` se respostas ficarem confusas com 5 chunks

## NÃO fazer

- ❌ Não trocar de provedor (OpenAI fica)
- ❌ Não implementar streaming custom — usar `useChat` + `toUIMessageStreamResponse`
- ❌ Não retreinar/fine-tunar nada
- ❌ Não inflar embeddings com texto inteiro da aula — chunks são o ponto
