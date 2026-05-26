-- ============================================================
-- Bússola — adicionar coluna para OpenRouter API key
-- ============================================================
-- OpenRouter é o provider primário pra chat/LLM; OpenAI fica como
-- fallback (e ainda é o único pra embeddings/Whisper). A key fica
-- no app_settings pra poder rotacionar via /admin sem redeploy.
-- ============================================================

ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS openrouter_api_key text;
