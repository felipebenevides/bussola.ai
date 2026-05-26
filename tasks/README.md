# Tasks — Bússola (Hackathon CEFIS)

Pasta de tracking operacional do dia 2026-05-26 (deadline 23h59 BRT-3).

## Como ler

- **`main.md`** — checklist consolidado do dia, com a ordem de execução recomendada e o que já está pronto.
- Arquivos por contexto (front, back, db, infra, ai, integração CEFIS, whatsapp, pitch) — detalhe granular de cada frente.

## Legenda

- `[x]` — feito e validado
- `[~]` — parcial / em andamento
- `[ ]` — pendente
- `[!]` — bloqueador / depende de coisa externa

## Frentes

| Arquivo | Escopo |
|---|---|
| [main.md](./main.md) | Visão geral do dia, ordem e gate de submissão |
| [backend.md](./backend.md) | Route handlers, agentes server-side, APIs internas |
| [frontend.md](./frontend.md) | Páginas, componentes, UX, streaming |
| [database.md](./database.md) | Schema, migrations, RLS, ingestão de transcrições |
| [infra.md](./infra.md) | Repo, .env, deploy Vercel, gitignore, secrets |
| [ai.md](./ai.md) | Prompts, RAG, embeddings, modelos, citações |
| [integracao-cefis.md](./integracao-cefis.md) | Login real, `/me`, courses, deep-link no timestamp |
| [whatsapp.md](./whatsapp.md) | Evolution API, webhook, OTP, vínculo de usuário |
| [pitch.md](./pitch.md) | Roteiro, screenshots, README, submissão |

## Regra de ouro

Se algo não estiver online em `https://bussola.vercel.app` (ou domínio escolhido) **às 22h00**, corta. Submissão até 23h00 com 1h de buffer.
