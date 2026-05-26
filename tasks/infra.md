# Infra — Repo, env, deploy, secrets

## Concluído

- [x] Projeto Next.js 15 + TypeScript + Tailwind 4 com `src/` dir
- [x] `.gitignore` cobrindo `.env*`, `/data/`, `.claude/`, `.vercel`, `node_modules`
- [x] `.env.example` documentando só Supabase + ADMIN_PASSWORD (zero secrets sensíveis no repo)
- [x] `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`
- [x] Política: toda key real vive em `app_settings` no DB via `/admin`

## Pendente — pré-deploy

- [x] `git status` validado, `.env.local` confirmado como ignorado (git ls-files --others --ignored)
- [x] `git config user.email/name` ok (Felipe Benevides / felipebenevides@outlook.com)
- [x] Scan de secrets (sk-, eyJ, api_key=) — zero vazamentos
- [x] **Primeiro commit feito**: `8e695da` chore: initial commit — Bússola MVP for CEFIS hackathon (815 files, +39987 lines)
- [x] Remote `origin` já configurado: github.com/felipebenevides/bussola.ai.git
- [ ] **Pendente:** `git push -u origin main` (commit local feito, não publicado ainda)

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
