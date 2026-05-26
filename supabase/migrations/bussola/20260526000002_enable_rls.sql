-- ============================================================
-- Bússola — Defense-in-depth: RLS em todas as tabelas
-- ============================================================
-- service_role faz bypass de RLS por padrão, então o backend
-- Next.js (que só usa service_role) continua funcionando normal.
--
-- Sem policy = nega tudo para anon/authenticated. Combinado com
-- os GRANTs já fechados (só USAGE no schema), é dupla camada de
-- proteção: mesmo que alguém abra GRANT por engano no futuro, o
-- RLS continua bloqueando.
--
-- Silencia também o advisor `rls_disabled` do Supabase.
-- ============================================================

ALTER TABLE bussola.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.skill_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.study_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.cefis_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.cefis_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.cefis_lesson_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.cefis_course_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.whatsapp_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.user_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE bussola.whatsapp_messages ENABLE ROW LEVEL SECURITY;
