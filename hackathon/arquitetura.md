# Arquitetura — Bússola (CEFIS Tutor)

> Como vamos implementar tecnicamente. Foco em **velocidade de execução** e **pontos máximos nos critérios**.

---

## Stack final (decisão tomada — não rediscutir no dia)

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  Next.js 15 App Router (RSC + Client Components)         │
│  Tailwind 4 + shadcn/ui                                  │
│  Vercel AI SDK UI (useChat, useCompletion)               │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌────────────────────┐   ┌────────────────────────┐
│  Next.js Route     │   │  Next.js Server Action │
│  Handlers (/api/*) │   │  (forms, mutations)    │
└─────────┬──────────┘   └────────────┬───────────┘
          │                           │
          └─────────────┬─────────────┘
                        ▼
        ┌───────────────────────────────┐
        │  Vercel AI SDK (server)        │
        │  ├─ generateText / streamText  │
        │  ├─ tool() definitions          │
        │  └─ structuredOutput (Zod)      │
        └────┬──────────────────┬───────┘
             │                  │
   ┌─────────▼──────┐  ┌────────▼──────────┐
   │  OpenAI         │  │  Supabase          │
   │  ├─ gpt-4o-mini │  │  ├─ Postgres       │
   │  ├─ embeddings  │  │  ├─ pgvector       │
   │  ├─ tts-1       │  │  ├─ Storage (TTS)  │
   │  └─ vision      │  │  └─ Auth (skip MVP)│
   └─────────────────┘  └────────────────────┘
```

**Deploy:** Vercel. **Tempo de setup:** ~30min. **Custo do dia:** &lt;US$5.

---

## Por que essas escolhas

### Next.js 15 + Vercel AI SDK
- Streaming nativo na UI (`useChat` hook) — sensação de "IA viva"
- `tool()` API abstrai tool calling — você define função, SDK cuida do loop
- `streamText` e `generateText` cuidam de retry, fallback, format
- Deploy 1-clique no Vercel
- **Tempo poupado:** ~4-6h vs implementação from scratch

### Supabase
- Postgres + pgvector + Storage + Auth em um único provedor
- Free tier suficiente para o hackathon
- SDK JS direto no client (para Storage de podcasts)
- Dashboard SQL para você inspecionar dados durante demo
- **Tempo poupado:** ~2-3h vs setup manual

### OpenAI (não Anthropic, não OpenRouter)
- `gpt-4o-mini`: rápido (latência baixa = demo fluida) e barato
- `text-embedding-3-small`: 1536 dims, padrão de indústria
- `tts-1`: 6 vozes nativas pt-BR, sintetiza em ~3s para 1 min de áudio
- Tudo no mesmo provedor = menos chaves para gerenciar

### shadcn/ui
- Copy-paste de componentes (não dependência)
- Customizável via Tailwind
- Botões, Cards, Dialogs, Forms, Toasts prontos
- Tema escuro grátis

---

## Diagrama de domínio

```
┌──────────────────────────────────────────────────────┐
│                      USER                             │
│  (mock: 1 user fixo no localStorage durante hackathon)│
└───────────────────────┬──────────────────────────────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
        ┌─────────┐ ┌───────┐ ┌─────────┐
        │ profile │ │ skill │ │ study   │
        │         │ │ assmt │ │ plan    │
        └─────────┘ └───────┘ └────┬────┘
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                    ┌──────────┐    ┌──────────────┐
                    │ plan_item│    │ progress_log │
                    └────┬─────┘    └──────────────┘
                         │
                ┌────────┴────────┐
                ▼                 ▼
          ┌─────────┐      ┌──────────────┐
          │ CEFIS   │      │ generated    │
          │ lesson  │      │ content      │
          │ (RAG)   │      │ (pdf/podcast)│
          └─────────┘      └──────────────┘

┌──────────────────────────────────────────────────────┐
│                      CATÁLOGO CEFIS                   │
│  (ingestão prévia para RAG)                           │
└───────────────────────┬──────────────────────────────┘
                        ▼
                ┌──────────────────┐
                │ cefis_courses    │
                │ cefis_lessons    │
                │ cefis_lesson_    │
                │   embeddings     │ ← pgvector
                └──────────────────┘
```

---

## Schema SQL (rode no Supabase ao chegar)

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Mock user (durante hackathon, 1 user fixo)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Perfil do aluno
CREATE TABLE user_profile (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal text NOT NULL,                       -- "migrar para análise de dados"
  professional_experience text,             -- "marketing há 8 anos"
  available_minutes_per_day int,            -- 30
  available_hours_weekend int,              -- 2
  learning_style text,                      -- 'visual' | 'auditory' | 'kinesthetic'
  deadline date,                            -- "2026-07-10"
  raw_conversation jsonb,                   -- histórico do chat de onboarding
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mapa de competências (diagnóstico)
CREATE TABLE skill_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  skill_slug text NOT NULL,                 -- "sql_basico"
  skill_label text NOT NULL,                -- "SQL básico"
  score int NOT NULL,                       -- 0-100
  status text NOT NULL,                     -- 'domina' | 'lacuna_parcial' | 'lacuna_critica'
  importance int NOT NULL,                  -- peso para o objetivo (1-10)
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, skill_slug)
);

-- Plano de estudos
CREATE TABLE study_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  total_weeks int NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Item do plano (1 atividade)
CREATE TABLE plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plan(id) ON DELETE CASCADE,
  week int NOT NULL,
  day_of_week int NOT NULL,                 -- 1=mon, 7=sun
  position int NOT NULL,                    -- ordering within day
  title text NOT NULL,
  duration_minutes int NOT NULL,
  source text NOT NULL,                     -- 'cefis_lesson' | 'generated_pdf' | 'generated_podcast' | 'generated_quiz'
  source_ref text,                          -- lesson_id ou generated_content_id
  status text DEFAULT 'pending',            -- 'pending' | 'in_progress' | 'completed' | 'skipped'
  completed_at timestamptz
);

-- Catálogo CEFIS (ingestão prévia)
CREATE TABLE cefis_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  level text,                               -- 'beginner' | 'intermediate' | 'advanced'
  duration_hours numeric,
  url text,                                 -- link para o curso na plataforma
  metadata jsonb
);

CREATE TABLE cefis_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES cefis_courses(id),
  title text NOT NULL,
  content text NOT NULL,                    -- transcrição/texto da aula
  duration_minutes int,
  position int,                             -- ordem dentro do curso
  url text                                  -- deep link
);

-- Embeddings (RAG)
CREATE TABLE cefis_lesson_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES cefis_lessons(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_lesson_embeddings ON cefis_lesson_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_lesson_chunk_trgm ON cefis_lesson_embeddings
  USING gin(chunk_text gin_trgm_ops);

-- Conteúdo gerado pela IA
CREATE TABLE generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,                       -- 'pdf' | 'podcast' | 'quiz' | 'summary'
  title text NOT NULL,
  prompt text,
  body text,                                -- markdown / quiz JSON / podcast script
  audio_url text,                           -- if podcast
  pdf_url text,                             -- if pdf
  source_lesson_ids uuid[],                 -- which CEFIS lessons inspired this
  created_at timestamptz DEFAULT now()
);

-- Progresso e acompanhamento
CREATE TABLE progress_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES plan_items(id),
  event text NOT NULL,                      -- 'started' | 'completed' | 'skipped' | 'quiz_passed' | 'quiz_failed'
  metadata jsonb,                           -- score, time_spent_seconds, etc.
  created_at timestamptz DEFAULT now()
);

-- Tutor chat (Q&amp;A)
CREATE TABLE tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,                       -- 'user' | 'assistant'
  content text NOT NULL,
  citations jsonb,                          -- [{ lesson_id, title, url }]
  created_at timestamptz DEFAULT now()
);

-- RPC para busca vetorial
CREATE OR REPLACE FUNCTION match_lessons(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  lesson_id uuid,
  course_title text,
  lesson_title text,
  chunk_text text,
  similarity float,
  url text
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.lesson_id,
    c.title AS course_title,
    l.title AS lesson_title,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    l.url
  FROM cefis_lesson_embeddings e
  JOIN cefis_lessons l ON l.id = e.lesson_id
  JOIN cefis_courses c ON c.id = l.course_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Arquitetura de agentes

5 agentes especializados, cada um com seu prompt e seu toolset. Coordenação via Vercel AI SDK.

```
┌───────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                           │
│  (entry: /api/agent — recebe contexto e roteia)            │
└────────┬──────┬──────┬──────┬──────┬─────────────────────┘
         │      │      │      │      │
         ▼      ▼      ▼      ▼      ▼
   ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
   │Onboar││Diagn ││Curad ││Tutor ││Coach │
   │ding  ││ostic ││or    ││      ││      │
   └──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘
      │       │       │       │       │
      ▼       ▼       ▼       ▼       ▼
  [tools: askProfile,    [tools: searchCatalog, generateContent,
   saveProfile,           createPlanItem, getProfile, getAssessment,
   generateQuestion,      ragSearch, synthesizePodcast,
   scoreAnswer,           createPdf, createQuiz, assessProgress,
   completeAssessment]    suggestNextStep]
```

### Agent 1: Onboarding Agent

**Job:** conduzir conversa fluida para coletar perfil.

**System prompt (resumo):**
```
Você é Bússola, uma tutora de aprendizado da CEFIS. Sua tarefa nesta conversa
é entender o aluno em 5-7 perguntas naturais. Cole INFORMAÇÕES, não respostas
robóticas. Seja calorosa mas eficiente.

Informações que precisa coletar:
- goal (objetivo de aprendizado)
- professional_experience (background)
- available_minutes_per_day
- learning_style (visual/auditory/kinesthetic)
- deadline (se houver)

Regras:
- 1 pergunta por vez
- Se aluno responder vago, faça follow-up
- Quando tiver todas as infos, chame save_profile e encerre.
```

**Tools:**
- `save_profile({ goal, experience, minutes_per_day, style, deadline })`
- `complete_onboarding()` — sinaliza pronto

### Agent 2: Diagnostic Agent

**Job:** rodar quiz adaptativo curto (8-12 perguntas).

**Estratégia:**
1. Carrega perfil do aluno
2. Mapeia para "skills necessárias" via LLM ("para virar analista de dados, precisa de: SQL, Python, estatística, visualização, storytelling")
3. Para cada skill, faz 1-3 perguntas com dificuldade variável
4. Calcula score 0-100 por skill
5. Classifica: `domina` (&gt;75), `lacuna_parcial` (30-75), `lacuna_critica` (&lt;30)

**Tools:**
- `get_profile()`
- `generate_question({ skill, difficulty, previous_answers })`
- `score_answer({ skill, question, answer })`
- `save_assessment({ skills })`

**Por que adaptativo:**
- Se aluno acerta pergunta difícil de SQL, pulamos perguntas básicas (poupa tempo)
- Se erra, descemos para pergunta mais simples para calibrar

### Agent 3: Curator Agent (gerador de plano)

**Job:** dado perfil + assessment, montar plano semana a semana.

**Algoritmo:**
1. Lista skills com lacuna (parcial ou crítica), ordenadas por importância
2. Para cada skill:
   a. RAG search no catálogo CEFIS por aulas relevantes
   b. Se encontrar aulas (similaridade &gt; 0.7): adiciona ao plano
   c. Se não encontrar ou for insuficiente: gera conteúdo (PDF, podcast)
3. Distribui em semanas respeitando `minutes_per_day` e `learning_style`
4. Salva em `study_plan` + `plan_items`

**Tools:**
- `get_profile()`
- `get_assessment()`
- `search_catalog({ query, limit })` — RAG
- `generate_pdf({ topic, depth, context })`
- `generate_podcast({ topic, duration_min, context })`
- `generate_quiz({ skill, count })`
- `create_plan({ items[] })`

### Agent 4: Tutor Agent (chat de dúvidas)

**Job:** responder perguntas do aluno com RAG no catálogo.

**Fluxo:**
1. Recebe pergunta
2. Busca contexto via RAG (top 5 chunks)
3. Responde citando fontes do catálogo
4. Se nenhuma fonte boa, avisa transparentemente e responde com conhecimento próprio
5. Sugere próxima ação ("quer ver a aula X?")

**Tools:**
- `rag_search({ query, top_k })`
- `get_lesson_detail({ lesson_id })`
- `suggest_lesson({ skill })`

### Agent 5: Coach Agent (acompanhamento diário)

**Job:** análise diária + ajuste de plano.

**Disparo:** rota `/api/coach/daily` ou botão "Como estou indo?".

**Fluxo:**
1. Carrega progresso (`progress_log` últimos 7 dias)
2. Calcula: % do plano completo, atrasos, sucessos em quizzes
3. Gera 1 quiz curto de revisão (spaced repetition)
4. Sugere ajuste: "você terminou SQL antes, antecipei Python"
5. Mensagem motivacional baseada no perfil

**Tools:**
- `get_progress_summary({ days })`
- `generate_review_quiz({ skills })`
- `adjust_plan({ changes })`

---

## RAG — pipeline detalhado

### 1. Ingestão (uma vez, no início do dia)

**Cenário A — Temos acesso a dataset CEFIS:** scrape/import 30-50 aulas reais de 2-3 cursos.
**Cenário B — Não temos:** usa cursos abertos (Khan Academy, MIT OCW, conteúdo público) e diz à banca "demonstrando com proxy enquanto integração final é trivial".

```typescript
// scripts/ingest-catalog.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function ingestLessons(lessons: RawLesson[]) {
  for (const lesson of lessons) {
    // 1. Insert lesson
    const { data: saved } = await supabase
      .from('cefis_lessons')
      .insert(lesson)
      .select().single();

    // 2. Chunk content (overlap 200, size 800)
    const chunks = chunkText(lesson.content, { size: 800, overlap: 200 });

    // 3. Embed in batch
    const embeddings = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks,
    });

    // 4. Save embeddings
    await supabase.from('cefis_lesson_embeddings').insert(
      chunks.map((chunk, i) => ({
        lesson_id: saved!.id,
        chunk_index: i,
        chunk_text: chunk,
        embedding: embeddings.data[i].embedding,
      }))
    );

    console.log(`Indexed: ${lesson.title} (${chunks.length} chunks)`);
  }
}

function chunkText(text: string, { size, overlap }: { size: number; overlap: number }): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}
```

### 2. Busca (em runtime)

```typescript
// lib/rag.ts
export async function ragSearch(query: string, topK = 5) {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  const { data } = await supabase.rpc('match_lessons', {
    query_embedding: embedding.data[0].embedding,
    match_threshold: 0.7,
    match_count: topK,
  });

  return data ?? [];
}
```

### 3. Citação obrigatória

Todo prompt do Tutor Agent termina com:

```
SEMPRE cite as fontes usando o formato:
[Fonte: Curso "X", Aula "Y"](url)

Se nenhuma fonte do catálogo for relevante, comece com:
"Esse tema não está no catálogo CEFIS ainda. Vou responder com conhecimento geral:"
```

---

## Snippets-chave (copie no dia)

### Setup Vercel AI SDK com OpenAI

```typescript
// lib/ai.ts
import { openai } from '@ai-sdk/openai';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

export const model = openai('gpt-4o-mini');
export const modelFast = openai('gpt-4o-mini');
```

### Onboarding Agent — Route handler

```typescript
// app/api/onboarding/route.ts
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: `Você é Bússola, tutora de aprendizado da CEFIS.
Sua tarefa é conhecer o aluno em 5-7 perguntas naturais.
Quando tiver: objetivo, experiência, tempo/dia, estilo de aprendizagem, deadline → chame save_profile.`,
    messages,
    tools: {
      save_profile: tool({
        description: 'Salva o perfil do aluno após coletar todas as informações',
        parameters: z.object({
          goal: z.string(),
          professional_experience: z.string(),
          available_minutes_per_day: z.number(),
          learning_style: z.enum(['visual', 'auditory', 'kinesthetic']),
          deadline: z.string().optional(),
        }),
        execute: async (params) => {
          await supabase.from('user_profile').upsert({
            user_id: USER_ID,
            ...params,
          });
          return { ok: true };
        },
      }),
    },
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
}
```

### Onboarding UI

```tsx
// app/onboarding/page.tsx
'use client';
import { useChat } from 'ai/react';

export default function OnboardingPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/onboarding',
    initialMessages: [
      { id: 'init', role: 'assistant', content: 'Oi! Sou a Bússola, sua tutora da CEFIS. Qual seu objetivo de aprendizado nos próximos meses?' },
    ],
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
              m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          className="flex-1 px-4 py-2 rounded-xl border"
          placeholder="Responda aqui..."
          disabled={isLoading}
        />
        <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground">
          Enviar
        </button>
      </form>
    </div>
  );
}
```

### Tutor Agent com RAG e citações

```typescript
// app/api/tutor/route.ts
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { ragSearch } from '@/lib/rag';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: `Você é Bússola, tutora da CEFIS. Responda dúvidas SEMPRE citando as fontes do catálogo CEFIS quando aplicável.

Use a tool rag_search para buscar contexto antes de responder.

Formato de resposta:
1. Responda diretamente em 1-2 parágrafos
2. Cite fontes assim: "[Curso X — Aula Y](url)"
3. Se nenhuma fonte for relevante, avise: "Esse tema não está no catálogo ainda, mas posso te explicar..."
4. Sugira próximo passo ("Quer ver a aula completa?")`,
    messages,
    tools: {
      rag_search: tool({
        description: 'Busca conteúdo relevante no catálogo CEFIS via RAG',
        parameters: z.object({
          query: z.string().describe('Pergunta do aluno, reformulada para busca'),
        }),
        execute: async ({ query }) => {
          const results = await ragSearch(query, 5);
          return results.map(r => ({
            course: r.course_title,
            lesson: r.lesson_title,
            excerpt: r.chunk_text.slice(0, 300),
            url: r.url,
            similarity: r.similarity,
          }));
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

### Podcast generator

```typescript
// app/api/podcast/generate/route.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import OpenAI from 'openai';

const oai = new OpenAI();

const PodcastScriptSchema = z.object({
  title: z.string(),
  segments: z.array(z.object({
    speaker: z.enum(['ana', 'bruno']),
    text: z.string(),
  })),
});

export async function POST(req: Request) {
  const { topic, duration_minutes = 5 } = await req.json();

  // 1. RAG: pega contexto
  const context = await ragSearch(topic, 5);
  const contextText = context.map(c => `[${c.lesson_title}]: ${c.chunk_text}`).join('\n\n');

  // 2. Gera roteiro estruturado
  const { object: script } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: PodcastScriptSchema,
    prompt: `Gere um roteiro de podcast de ~${duration_minutes} minutos sobre "${topic}".

Dois apresentadores:
- ANA: curiosa, faz perguntas, representa o aluno
- BRUNO: didático, explica com analogias, representa o tutor

Use o contexto abaixo (do catálogo CEFIS):
${contextText}

Regras:
- 8-15 segmentos alternando ANA e BRUNO
- Cada segmento 2-4 frases
- Comece com cumprimento, termine com call-to-action
- Português natural, evite jargão`,
  });

  // 3. Sintetiza áudio segmento por segmento, concatena
  const audioBuffers: Buffer[] = [];
  for (const segment of script.segments) {
    const voice = segment.speaker === 'ana' ? 'nova' : 'onyx';
    const audio = await oai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: segment.text,
      response_format: 'mp3',
    });
    audioBuffers.push(Buffer.from(await audio.arrayBuffer()));
  }

  // 4. Concat MP3 (simple concat works for MP3 frames)
  const fullAudio = Buffer.concat(audioBuffers);

  // 5. Upload to Supabase Storage
  const filename = `podcast-${Date.now()}.mp3`;
  const { data } = await supabase.storage
    .from('podcasts')
    .upload(filename, fullAudio, { contentType: 'audio/mpeg' });

  const { data: { publicUrl } } = supabase.storage
    .from('podcasts').getPublicUrl(filename);

  // 6. Save metadata
  await supabase.from('generated_content').insert({
    user_id: USER_ID,
    kind: 'podcast',
    title: script.title,
    body: JSON.stringify(script),
    audio_url: publicUrl,
    source_lesson_ids: context.map(c => c.lesson_id),
  });

  return Response.json({ audio_url: publicUrl, title: script.title, script });
}
```

### "X minutos para entender Y"

```typescript
// app/api/quick-learn/route.ts
import { generateObject } from 'ai';

const QuickLearnSchema = z.object({
  topic: z.string(),
  key_concepts: z.array(z.string()).max(3),
  summary_markdown: z.string(),
  estimated_read_minutes: z.number(),
  podcast_recommended: z.boolean(),
  sources: z.array(z.object({
    lesson_title: z.string(),
    url: z.string(),
  })),
});

export async function POST(req: Request) {
  const { topic, available_minutes } = await req.json();

  const context = await ragSearch(topic, 5);

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: QuickLearnSchema,
    prompt: `O aluno tem ${available_minutes} minutos para entender "${topic}".

Contexto do catálogo CEFIS:
${context.map(c => `- ${c.lesson_title}: ${c.chunk_text.slice(0, 200)}`).join('\n')}

Monte:
1. Os 3 conceitos mais importantes
2. Um resumo em markdown que cabe no tempo dado (~150 palavras por minuto de leitura)
3. Sugestão de podcast se sobrar tempo

Use ANALOGIAS do dia a dia. Português brasileiro, tom didático e direto.`,
  });

  return Response.json(object);
}
```

---

## Variáveis de ambiente

```bash
# .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Mock user (durante hackathon)
NEXT_PUBLIC_DEMO_USER_ID=00000000-0000-0000-0000-000000000001
```

---

## Custos estimados do dia

| Serviço | Uso estimado | Custo |
|---|---|---|
| OpenAI `gpt-4o-mini` | ~500 calls × 2k tokens | ~US$1 |
| OpenAI `text-embedding-3-small` | 30 aulas × 10 chunks × 800 tokens | ~US$0,05 |
| OpenAI `tts-1` | 10 podcasts × 5 min | ~US$3 |
| Supabase | Free tier | US$0 |
| Vercel | Free tier (Hobby) | US$0 |
| **Total** | | **&lt;US$5** |

---

## Decisões de design importantes

### Por que não streaming everywhere?
- Onboarding e tutor: **streaming** (vibe de "vivo")
- Geração de plano e podcast: **non-streaming + loading UI** (vai demorar, mostra spinner com mensagem "Gerando seu plano...")

### Por que não usar LangChain/LlamaIndex?
- Curva de aprendizado alta para um dia
- Vercel AI SDK faz 90% do que precisamos com menos código
- LangChain seria justificável se precisássemos de chains complexas multi-step, não é nosso caso

### Por que GPT-4o-mini e não GPT-4o?
- Mini é 20x mais barato e ~2x mais rápido
- Para diagnóstico/plano/tutor a qualidade é suficiente
- Se algum agente ficar abaixo do esperado, upgrade só dele

### Por que Vercel e não Cloudflare Pages?
- Vercel AI SDK + Next.js + Vercel = combo otimizado
- Edge functions do Vercel rodam Node nativamente
- Logs e analytics no painel facilitam debug no dia

### Por que pgvector e não Pinecone?
- 1 banco para tudo (Postgres) = menos chaves, menos serviços
- Supabase free tier dá pgvector sem custo
- Para hackathon, 30-100 aulas, ivfflat resolve

---

**Próximo:** [roadmap-dia.md](./roadmap-dia.md) — hora a hora do dia.
