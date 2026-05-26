-- ============================================================
-- Bússola — adicionar Google API key (embeddings via Gemini)
-- ============================================================
-- Provider alternativo de embeddings: Google AI Studio
-- (generativelanguage.googleapis.com), modelo `gemini-embedding-001`
-- com `outputDimensionality=1536` para casar com o schema atual
-- (vector(1536) na coluna cefis_lesson_embeddings.embedding).
--
-- ATENÇÃO: embeddings de providers diferentes NÃO são intercambiáveis.
-- Se você ingerir com Google, queries também precisam ir pela Google.
-- Trocar de provider = re-ingerir tudo.
-- ============================================================

ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS google_api_key text;
