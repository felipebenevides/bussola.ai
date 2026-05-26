# Infra — Repo, env, deploy, secrets

## Concluído

- [x] Projeto Next.js 15 + TypeScript + Tailwind 4 com `src/` dir
- [x] `.gitignore` cobrindo `.env*`, `/data/`, `.claude/`, `.vercel`, `node_modules`
- [x] `.env.example` documentando só Supabase + ADMIN_PASSWORD (zero secrets sensíveis no repo)
- [x] `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`
- [x] Política: toda key real vive em `app_settings` no DB via `/admin`

## Pendente — pré-deploy

- [ ] Validar `git status` — todos arquivos atualmente `??` precisam estar limpos antes do primeiro commit
- [ ] `git init` já está feito (branch `main` existe sem commits)
- [ ] Configurar `git config user.email` e `user.name` se necessário
- [ ] Verificar que nenhum `.env.local` ficou rastreado (`git status --ignored`)
- [ ] Primeiro commit: tudo de `src/`, `supabase/`, `hackathon/`, `tasks/`, configs
- [ ] Criar repo público `bussola-cefis` no GitHub
- [ ] `git remote add origin` + `git push -u origin main`

## Pendente — deploy Vercel

- [ ] `vercel login` (se ainda não logado)
- [ ] `vercel link` no diretório → criar projeto novo
- [ ] Adicionar env vars no Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_KEY`
  - `ADMIN_PASSWORD` (senha forte, ≥20 chars)
- [ ] Primeiro deploy `vercel --prod`
- [ ] Smoke test: `/admin` abre, senha funciona

## Pendente — pós-deploy

- [ ] Configurar credenciais via `/admin` em prod:
  - OpenAI API key
  - CEFIS demo API key
  - Evolution API URL + key + instance + bot phone + webhook secret (se for usar WhatsApp na demo)
  - Modelos (manter defaults: `gpt-4o-mini`, `text-embedding-3-small`)
- [ ] Apontar webhook Evolution para `https://<vercel-url>/api/whatsapp/webhook` (se for usar)
- [ ] Rodar `/api/admin/ingest-sample` em prod uma vez (com sample do repo)
- [ ] Validar fluxo completo em produção (login → onboarding → plano → tutor com citação)

## Checklist de segurança antes do push

- [ ] `git grep -i "sk-"` retorna vazio
- [ ] `git grep -iE "(api[_-]?key|secret|password)\s*=\s*['\"]"` só mostra placeholder
- [ ] `.env.local` não está em `git ls-files`
- [ ] Nenhum arquivo em `/trascriptions_sample/` foi adicionado ao commit (manter no repo apenas se forem dados públicos — confirmar)

## NÃO fazer

- ❌ Nunca commitar `.env.local`, `.env.production`
- ❌ Nunca colocar key em `next.config.ts` (vaza no client bundle)
- ❌ Nunca usar `--force` no push para `main` antes da demo
- ❌ Não desabilitar `httpOnly` em cookie de sessão "só pra testar"
