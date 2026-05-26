-- ============================================================
-- Bússola — Migration: grupos de estudo (Plano Empresarial),
-- jornada do herói e throttle de lembretes. Idempotente.
-- ============================================================

-- 1. Grupos de estudo (Plano Empresarial — demo de 7 dias)
CREATE TABLE IF NOT EXISTS bussola.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL REFERENCES bussola.users(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  evolution_group_jid text,                 -- preenchido após sucesso na Evolution
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
                                            -- array de { phone (E.164 sem +), name }
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'failed')),
  evolution_error text,                     -- mensagem do erro caso status='failed'
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL           -- created_at + 7 dias (demo)
);

CREATE INDEX IF NOT EXISTS idx_study_groups_creator
  ON bussola.study_groups(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_status_expires
  ON bussola.study_groups(status, expires_at);

-- 1 grupo ativo por criador — enforce via partial unique index pra não bloquear
-- registros expirados/falhos.
CREATE UNIQUE INDEX IF NOT EXISTS idx_study_groups_one_active_per_user
  ON bussola.study_groups(creator_user_id)
  WHERE status IN ('pending', 'active');

-- 2. Throttle de lembretes (1 lembrete por dia por número)
ALTER TABLE bussola.user_whatsapp
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- 3. XP cache nos users (sourced de tutor_messages + whatsapp_messages, mas
--    cacheado pra UI render rápido sem agregação a cada request)
ALTER TABLE bussola.users
  ADD COLUMN IF NOT EXISTS journey_xp integer NOT NULL DEFAULT 0;

ALTER TABLE bussola.users
  ADD COLUMN IF NOT EXISTS journey_xp_updated_at timestamptz;

-- 4. RLS: service_role já tem bypass; o admin (server) é quem escreve nesses
--    objetos. Sem políticas adicionais — qualquer leitura passa pelo backend.
ALTER TABLE bussola.study_groups ENABLE ROW LEVEL SECURITY;

-- Limpa policies antigas pra ficar idempotente
DROP POLICY IF EXISTS "study_groups_no_anon" ON bussola.study_groups;
CREATE POLICY "study_groups_no_anon" ON bussola.study_groups
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
