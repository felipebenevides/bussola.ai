# Database — Schema, RLS, ingestão

## Estrutura

Tudo da Bússola vive no schema **`bussola`** do Postgres. Migrations em
`supabase/migrations/bussola/`, isoladas de qualquer outra coisa que rode
no mesmo projeto Supabase (este projeto compartilha banco com PortalFarma).

```
supabase/
├── README.md
└── migrations/
    └── bussola/
        ├── 20260526000000_init.sql        # tabelas + RPCs + grants
        ├── 20260526000001_whatsapp.sql    # campos + tabelas WhatsApp
        └── 20260526000002_enable_rls.sql  # RLS em todas as 16 tabelas (defense-in-depth)
```

## Concluído

### Migrations aplicadas no Supabase remoto (via MCP, 2026-05-26)
- [x] `20260526000000_init.sql` — schema `bussola` + extensions + 13 tabelas (app_settings, users, user_profile, skill_assessment, study_plan, plan_items, cefis_courses, cefis_lessons, cefis_lesson_embeddings, cefis_course_embeddings, generated_content, tutor_messages, progress_log) + RPCs `match_lesson_chunks` e `match_courses` + GRANTs
- [x] `20260526000001_whatsapp.sql` — +3 tabelas (whatsapp_link_codes, user_whatsapp, whatsapp_messages) + 7 colunas Evolution em app_settings
- [x] `20260526000002_enable_rls.sql` — `ENABLE ROW LEVEL SECURITY` nas 16 tabelas (sem policy = nega tudo para anon/authenticated; service_role faz bypass)
- [x] Banco verificado pós-migração: 16 tabelas, 2 RPCs, 34 índices, RLS=on em todas, linha singleton em `app_settings`

### Código
- [x] `src/lib/supabase.ts` configurado com `db: { schema: 'bussola' }` (BussolaClient tipado)
- [x] SQLs legados `schema.sql` / `schema_whatsapp.sql` removidos (ficaram no histórico do git)
- [x] `supabase/README.md` documentando estrutura, como aplicar e exposed schemas
- [x] MCP Supabase plugado via `.mcp.json` **gitignored** — project_ref nunca vai pro repo
- [x] Código da ingestão sample funcional em `/api/admin/ingest-sample` (executado anteriormente: 26 cursos / 697 aulas / 15 VTTs → 577 cues → 58 chunks — precisa re-rodar contra schema novo)

### Detalhes técnicos da migration (relevantes para futuras alterações)

`vector` e `pg_trgm` vivem no schema **`extensions`** (managed Supabase). O
`search_path` default de PostgREST/anon não inclui `extensions`, então:

- Colunas: `extensions.vector(1536)` (qualificado)
- Operator classes em índice: `extensions.gin_trgm_ops`, `extensions.vector_cosine_ops`
- Operador `<=>` em funções: `OPERATOR(extensions.<=>)`

Sem isso, DDL quebra com `operator class "gin_trgm_ops" does not exist` e RPCs quebram em runtime.

## Pendente (ações manuais — não dá pra automatizar)

### 1. Configurar Dashboard
- [ ] **Settings → API → Exposed schemas** → adicionar `bussola` à lista (sem isso, o client JS retorna 404 em `.from('users')` e `.rpc('match_lesson_chunks')`)

### 2. Popular credenciais
- [ ] Abrir `/admin`, colar:
  - `OPENAI_API_KEY`
  - `cefis_demo_api_key` (token de demo do CEFIS pra ingestão)
  - Evolution: `evolution_api_url`, `evolution_api_key`, `evolution_instance`, `evolution_bot_phone`, `evolution_webhook_secret` (se for demoar WhatsApp)
- Não fazer via SQL direto — `/admin` mascara e centraliza.

### 3. Re-rodar ingestão contra schema novo
- [ ] `POST /api/admin/ingest-sample` (sample limitado ao curso 1132)
- [ ] Validar: `SELECT count(*) FROM bussola.cefis_lesson_embeddings;` deve retornar ≥ 58
- [ ] Validar: `SELECT count(*) FROM bussola.cefis_course_embeddings;` deve retornar ≥ 26

### 4. Backup paranoia (antes da demo)
- [ ] Snapshot via Supabase Dashboard (Database → Backups)
- [ ] (Opcional) `pg_dump --table=bussola.cefis_lesson_embeddings` local — embeddings são caros pra recomputar

## NÃO fazer

- ❌ Não criar migrations versionadas além das duas atuais — hackathon, schema é estável
- ❌ Não cifrar `openai_api_key` client-side — guardada server-side, masking no `/admin`, acesso só via service_role. Cifrar agregaria zero segurança e quebra o backoffice.
- ❌ Não abrir GRANTs em tabela para anon/authenticated sem antes escrever policy RLS explícita — RLS está ativo sem policy, então qualquer GRANT exposto ainda nega tudo, mas a primeira policy criada vai começar a vazar conforme o que ela permitir. Pensar bem antes.
- ❌ Não rodar `apply_migration` com SQL que dependa de `vector`/`gin_trgm_ops` sem qualificar com `extensions.` — quebra em runtime.
