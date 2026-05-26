-- ============================================================
-- Bússola — Extensão: WhatsApp via Evolution API
-- Rode DEPOIS de schema.sql. Idempotente.
-- ============================================================

-- 1. Novos campos em app_settings ----------------------------
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS evolution_api_url text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS evolution_api_key text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS evolution_instance text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS evolution_bot_phone text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS evolution_webhook_secret text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS whisper_model text DEFAULT 'whisper-1';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS tts_voice_tutor text DEFAULT 'onyx';

-- 2. Códigos OTP de pareamento -------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_link_codes (
  code text PRIMARY KEY,                    -- 6 caracteres hex (gerado server-side)
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_phone text,                       -- E.164 sem '+', ex: 5511999999999
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_link_codes_user ON whatsapp_link_codes(user_id, used_at);

-- 3. Vínculo número WhatsApp ↔ usuário ----------------------
CREATE TABLE IF NOT EXISTS user_whatsapp (
  phone text PRIMARY KEY,                   -- E.164 sem '+'
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now(),
  last_seen_at timestamptz,
  UNIQUE (user_id)                          -- 1 user ↔ 1 número (por enquanto)
);

CREATE INDEX IF NOT EXISTS idx_user_whatsapp_user ON user_whatsapp(user_id);

-- 4. Log das mensagens WhatsApp -----------------------------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  phone text NOT NULL,                      -- E.164 sem '+'
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  kind text NOT NULL CHECK (kind IN ('text', 'audio', 'image', 'video', 'document', 'unknown')),
  content text,                             -- texto cru (ou transcrição se foi áudio)
  evolution_message_id text,                -- id retornado pela Evolution
  media_url text,                           -- URL do media se for áudio/imagem
  citations jsonb,                          -- para mensagens 'out' do tutor
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user ON whatsapp_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone, created_at);
