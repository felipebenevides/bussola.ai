-- Refaz grants em todas as tabelas do schema bussola pro service_role.
-- Necessário porque tabelas novas (study_groups, generated_content com
-- plan_item_id, etc.) não herdam defaults automaticamente quando o
-- schema já existia.

GRANT USAGE ON SCHEMA bussola TO postgres, service_role, authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA bussola TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA bussola TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA bussola TO service_role;

-- Garante grants para tabelas futuras criadas via owner=postgres
ALTER DEFAULT PRIVILEGES IN SCHEMA bussola
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA bussola
  GRANT SELECT ON TABLES TO authenticated;

NOTIFY pgrst, 'reload schema';
