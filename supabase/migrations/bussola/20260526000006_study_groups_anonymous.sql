-- Permite criação de grupo por usuário anônimo (beta): creator_user_id
-- passa a ser opcional e ganhamos creator_phone como identidade alternativa.

ALTER TABLE bussola.study_groups
  ALTER COLUMN creator_user_id DROP NOT NULL;

ALTER TABLE bussola.study_groups
  ADD COLUMN IF NOT EXISTS creator_phone text;

DROP INDEX IF EXISTS bussola.idx_study_groups_one_active_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_groups_one_active_by_user
  ON bussola.study_groups(creator_user_id)
  WHERE creator_user_id IS NOT NULL AND status IN ('pending', 'active');

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_groups_one_active_by_phone
  ON bussola.study_groups(creator_phone)
  WHERE creator_user_id IS NULL AND creator_phone IS NOT NULL
        AND status IN ('pending', 'active');

ALTER TABLE bussola.study_groups
  ADD CONSTRAINT study_groups_creator_identity_chk
  CHECK (creator_user_id IS NOT NULL OR creator_phone IS NOT NULL)
  NOT VALID;

ALTER TABLE bussola.study_groups
  VALIDATE CONSTRAINT study_groups_creator_identity_chk;
