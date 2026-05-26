-- ============================================================
-- Bússola — Schema completo (Supabase / Postgres)
-- Rode UMA VEZ no SQL Editor do Supabase Dashboard.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. App settings (backoffice — singleton row id=1)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1,
  openai_api_key text,
  cefis_demo_api_key text,
  chat_model text DEFAULT 'gpt-4o-mini',
  embedding_model text DEFAULT 'text-embedding-3-small',
  tts_voice_ana text DEFAULT 'nova',
  tts_voice_bruno text DEFAULT 'onyx',
  rag_match_threshold numeric DEFAULT 0.7,
  rag_top_k int DEFAULT 5,
  feature_flags jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Usuários (espelha conta CEFIS)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cefis_user_id int UNIQUE,
  cefis_api_key text,
  email text UNIQUE,
  name text,
  first_name text,
  avatar text,
  occupation text,
  city text,
  state text,
  activities text[],
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Perfil do aluno (resposta do onboarding)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profile (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  goal text NOT NULL,
  professional_experience text,
  available_minutes_per_day int,
  available_hours_weekend int,
  learning_style text CHECK (learning_style IN ('visual','auditory','kinesthetic','mixed')),
  deadline date,
  raw_conversation jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. Mapa de competências
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  skill_slug text NOT NULL,
  skill_label text NOT NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 100),
  status text NOT NULL CHECK (status IN ('domina','lacuna_parcial','lacuna_critica')),
  importance int NOT NULL CHECK (importance BETWEEN 1 AND 10),
  source text DEFAULT 'quiz',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, skill_slug)
);

-- ============================================================
-- 5. Plano de estudos
-- ============================================================
CREATE TABLE IF NOT EXISTS study_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  total_weeks int NOT NULL,
  active boolean DEFAULT true,
  rationale text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES study_plan(id) ON DELETE CASCADE,
  week int NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  position int NOT NULL,
  title text NOT NULL,
  duration_minutes int NOT NULL,
  source text NOT NULL CHECK (source IN ('cefis_lesson','cefis_track','generated_pdf','generated_podcast','generated_quiz','generated_summary')),
  source_ref text,
  cefis_course_id int,
  cefis_lesson_id int,
  cefis_track_id int,
  skill_slug text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_plan_items_plan ON plan_items(plan_id, week, day_of_week, position);

-- ============================================================
-- 6. Catálogo CEFIS espelhado localmente (IDs reais)
-- ============================================================
CREATE TABLE IF NOT EXISTS cefis_courses (
  id int PRIMARY KEY,
  title text NOT NULL,
  subtitle text,
  summary text,
  banner text,
  duration_seconds int,
  keywords text,
  goals text[],
  teacher_name text,
  category_ids int[],
  average_rating numeric,
  rating_quantity int,
  lesson_count int,
  cefis_url text,
  metadata jsonb,
  last_synced_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_categories ON cefis_courses USING gin(category_ids);
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm ON cefis_courses USING gin(title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS cefis_lessons (
  id int PRIMARY KEY,
  course_id int NOT NULL REFERENCES cefis_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  position int NOT NULL,
  duration_seconds int,
  has_transcription boolean DEFAULT false,
  stream_sources jsonb,
  preview_url text,
  cefis_url text,
  last_synced_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON cefis_lessons(course_id, position);

-- ============================================================
-- 7. RAG: embeddings de transcrição + metadados de curso
-- ============================================================
-- Embeddings de aulas (com timestamp — KILLER FEATURE)
CREATE TABLE IF NOT EXISTS cefis_lesson_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id int NOT NULL REFERENCES cefis_lessons(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  start_seconds int,           -- início do trecho na aula (do VTT) — usado para deep-link
  end_seconds int,             -- fim do trecho
  embedding vector(1536) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (lesson_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_lesson_emb_vec ON cefis_lesson_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_lesson_emb_text_trgm ON cefis_lesson_embeddings
  USING gin(chunk_text gin_trgm_ops);

-- Embeddings de curso (RAG light — para os 25 cursos sem VTT)
CREATE TABLE IF NOT EXISTS cefis_course_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id int NOT NULL REFERENCES cefis_courses(id) ON DELETE CASCADE,
  composed_text text NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_emb_vec ON cefis_course_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ============================================================
-- 8. Conteúdo gerado (PDFs, podcasts, quizzes, resumos)
-- ============================================================
CREATE TABLE IF NOT EXISTS generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('pdf','podcast','quiz','summary')),
  title text NOT NULL,
  prompt text,
  body text,
  audio_url text,
  pdf_url text,
  source_lesson_ids int[],
  source_course_ids int[],
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 9. Tutor chat
-- ============================================================
CREATE TABLE IF NOT EXISTS tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  citations jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutor_user_session ON tutor_messages(user_id, session_id, created_at);

-- ============================================================
-- 10. Progress log
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES plan_items(id) ON DELETE SET NULL,
  event text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 11. RPCs de busca (vetorial — com start_seconds para deep-link)
-- ============================================================

-- Busca em transcrições (chunks com timestamp)
CREATE OR REPLACE FUNCTION match_lesson_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  lesson_id int,
  course_id int,
  course_title text,
  lesson_title text,
  lesson_position int,
  chunk_text text,
  start_seconds int,
  end_seconds int,
  similarity float,
  course_cefis_url text,
  lesson_cefis_url text
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.lesson_id,
    l.course_id,
    c.title AS course_title,
    l.title AS lesson_title,
    l.position AS lesson_position,
    e.chunk_text,
    e.start_seconds,
    e.end_seconds,
    1 - (e.embedding <=> query_embedding) AS similarity,
    c.cefis_url AS course_cefis_url,
    l.cefis_url AS lesson_cefis_url
  FROM cefis_lesson_embeddings e
  JOIN cefis_lessons l ON l.id = e.lesson_id
  JOIN cefis_courses c ON c.id = l.course_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Busca em metadados de curso (para sugerir cursos no plano)
CREATE OR REPLACE FUNCTION match_courses(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  course_id int,
  title text,
  subtitle text,
  summary text,
  duration_seconds int,
  lesson_count int,
  category_ids int[],
  cefis_url text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.course_id,
    c.title,
    c.subtitle,
    c.summary,
    c.duration_seconds,
    c.lesson_count,
    c.category_ids,
    c.cefis_url,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM cefis_course_embeddings e
  JOIN cefis_courses c ON c.id = e.course_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
