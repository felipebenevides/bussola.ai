# Database — Schema, RLS, ingestão

## Concluído

- [x] `supabase/schema.sql` — schema completo (app_settings, users, user_profile, courses, lessons, embeddings, study_plan, plan_items, etc.)
- [x] `supabase/schema_whatsapp.sql` — campos e tabelas de WhatsApp (OTP, vínculo)
- [x] Extensions: `vector`, `pg_trgm`
- [x] `app_settings` singleton (id=1) com defaults sensatos
- [x] Ingestão sample funcional via `/api/admin/ingest-sample`
  - 26 cursos / 697 aulas indexados (metadados)
  - 15 VTTs → 577 cues → 58 chunks com `start_seconds`/`end_seconds`

## Pendente

### Rodar em Supabase de prod
- [ ] Criar projeto Supabase de produção (separado do dev se houver)
- [ ] Rodar `schema.sql` inteiro no SQL Editor
- [ ] Rodar `schema_whatsapp.sql` em seguida
- [ ] Confirmar funções `match_lesson_chunks` e `match_courses` existem
- [ ] Validar `SELECT count(*) FROM app_settings` = 1
- [ ] Inserir credenciais via `/admin` (não SQL direto)
- [ ] Rodar ingestão sample em prod: `POST /api/admin/ingest-sample`
- [ ] Validar `SELECT count(*) FROM cefis_lesson_embeddings` ≥ 58

### RLS (security)
- [ ] Confirmar RLS está habilitada nas tabelas sensíveis (`app_settings`, `users`, `user_profile`)
- [ ] Confirmar que `service_role` é o único caminho do server (não usar anon key em rota server)

### Pequenos ajustes possíveis
- [ ] Index em `plan_items(plan_id, position)` se ainda não houver
- [ ] Garantir `ON DELETE CASCADE` em `plan_items.plan_id`

### Backup paranoia (antes da demo)
- [ ] `pg_dump` rápido da tabela `cefis_lesson_embeddings` (caso alguém rode DELETE por engano durante o pitch)
- [ ] Snapshot via Supabase Dashboard

## NÃO fazer

- ❌ Não criar migrations versionadas — hackathon, schema é um SQL único
- ❌ Não cifrar `openai_api_key` client-side — RLS + senha admin é suficiente para o escopo
