-- ============================================================
-- Bússola — Telefone do aluno no profile
-- ============================================================
-- Coletado no onboarding (5ª pergunta) e usado pra qualquer fluxo
-- WhatsApp iniciado pela tutora. Substitui a coleta de phone em
-- modais soltos — a fonte de verdade fica em user_profile.
-- ============================================================

ALTER TABLE bussola.user_profile
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN bussola.user_profile.phone IS
  'WhatsApp em formato E.164 sem o "+" (ex: 5511999999999). Coletado no onboarding e usado pra disparar mensagens da Bussola via canal WhatsApp.';

CREATE INDEX IF NOT EXISTS idx_user_profile_phone
  ON bussola.user_profile(phone)
  WHERE phone IS NOT NULL;
