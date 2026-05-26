# Supabase — Bússola

Tudo da Bússola vive em um schema dedicado **`bussola`** dentro do Postgres do
Supabase. As migrations ficam isoladas em `supabase/migrations/bussola/` e não
se misturam com migrations de outros schemas que possam compartilhar o mesmo
projeto Supabase.

## Estrutura

```
supabase/
└── migrations/
    └── bussola/
        ├── 20260526000000_init.sql       # tabelas + RPCs + grants
        └── 20260526000001_whatsapp.sql   # integração Evolution
```

## Como aplicar

### Via Supabase MCP (já configurado neste projeto)

O MCP server do Supabase está conectado via `.mcp.json` (gitignored).
A partir de Claude Code rodando neste diretório, peça para o agente executar
as migrations — ele tem acesso ao banco via MCP.

### Via Supabase CLI

```bash
# Login e link (uma vez)
supabase login
supabase link --project-ref <PROJECT_REF>

# Aplicar uma migration específica do schema bussola
supabase db push --include-all  # se nenhum outro schema versionado no mesmo dir
# ou copiar conteúdo e rodar no SQL Editor do Dashboard
```

### Via SQL Editor do Dashboard (mais simples para hackathon)

1. Abrir Supabase Dashboard → SQL Editor
2. Colar `20260526000000_init.sql` → Run
3. Colar `20260526000001_whatsapp.sql` → Run
4. Conferir: `select count(*) from bussola.app_settings;` retorna 1

## Configuração obrigatória no Dashboard

Após rodar a migration inicial, expor o schema `bussola` para a API REST do
Supabase (para o cliente JS poder chamar RPCs e tabelas):

**Settings → API → Exposed schemas** → adicionar `bussola` à lista.

Sem isso, o cliente `@supabase/supabase-js` retorna 404 ao chamar
`.from('users')` ou `.rpc('match_lesson_chunks')`.

## Cliente JS

O cliente está configurado em `src/lib/supabase.ts` com
`db: { schema: 'bussola' }`. Isso é **só configuração de namespace do
cliente** — não altera o banco. Outros apps com seu próprio `createClient`
continuam acessando seus schemas normalmente.

```ts
const supabase = supabaseAdmin();
await supabase.from("users").select("*");          // bussola.users
await supabase.rpc("match_lesson_chunks", { ... }); // bussola.match_lesson_chunks
```

## Segurança

- **service_role** tem `ALL` em todas as tabelas/RPCs/sequences do schema `bussola`.
- **anon/authenticated** têm apenas `USAGE` no schema (sem acesso a tabelas).
  Todo acesso passa pelo backend Next.js usando `SUPABASE_SERVICE_KEY`.
- RLS pode ser ativada depois para liberar leituras client-side específicas.

## Project ref

Não está aqui. O `project_ref` do Supabase usado pelo MCP fica em `.mcp.json`,
que está no `.gitignore` — não vai pro repositório. Cada dev configura o seu
localmente via:

```bash
claude mcp add --scope project --transport http supabase \
  "https://mcp.supabase.com/mcp?project_ref=<SEU_REF>"
```
