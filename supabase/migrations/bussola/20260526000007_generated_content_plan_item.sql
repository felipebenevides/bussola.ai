-- Liga generated_content a plan_items pra suportar "Revisar" / "Gerar
-- novamente" por aula. Cada plan_item pode ter no máximo 1 estudo salvo
-- (enforce no app — DELETE antes do INSERT no endpoint).

ALTER TABLE bussola.generated_content
  ADD COLUMN IF NOT EXISTS plan_item_id uuid
  REFERENCES bussola.plan_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_generated_content_plan_item
  ON bussola.generated_content(plan_item_id)
  WHERE plan_item_id IS NOT NULL;
