-- ============================================================
-- Bússola — Migration: integração WhatsApp (Evolution API)
-- Aplicar APÓS 20260526000000_init.sql. Idempotente.
-- ============================================================

-- 1. Novos campos em app_settings
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS evolution_api_url text;
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS evolution_api_key text;
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS evolution_instance text;
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS evolution_bot_phone text;
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS evolution_webhook_secret text;
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS whisper_model text DEFAULT 'whisper-1';
ALTER TABLE bussola.app_settings ADD COLUMN IF NOT EXISTS tts_voice_tutor text DEFAULT 'onyx';

-- 2. Códigos OTP de pareamento
CREATE TABLE IF NOT EXISTS bussola.whatsapp_link_codes (
  code text PRIMARY KEY,                    -- 6 caracteres hex (gerado server-side)
  user_id uuid NOT NULL REFERENCES bussola.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_phone text,                       -- E.164 sem '+', ex: 5511999999999
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_codes_user ON bussola.whatsapp_link_codes(user_id, used_at);

-- 3. Vínculo número WhatsApp ↔ usuário
CREATE TABLE IF NOT EXISTS bussola.user_whatsapp (
  phone text PRIMARY KEY,                   -- E.164 sem '+'
  user_id uuid NOT NULL REFERENCES bussola.users(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_user ON bussola.user_whatsapp(user_id);

-- 4. Log das mensagens WhatsApp
CREATE TABLE IF NOT EXISTS bussola.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES bussola.users(id) ON DELETE SET NULL,
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  kind text NOT NULL CHECK (kind IN ('text', 'audio', 'image', 'video', 'document', 'unknown')),
  content text,
  evolution_message_id text,
  media_url text,
  citations jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user ON bussola.whatsapp_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON bussola.whatsapp_messages(phone, created_at);

-- 5. Permissões (apenas service_role escreve/lê)
GRANT ALL ON bussola.whatsapp_link_codes TO service_role;
GRANT ALL ON bussola.user_whatsapp TO service_role;
GRANT ALL ON bussola.whatsapp_messages TO service_role;
