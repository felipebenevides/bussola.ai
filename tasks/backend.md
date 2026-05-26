# Backend — Route handlers, agentes e libs server-side

## Concluído

- [x] `lib/settings.ts` — singleton row + cache 60s, server-only
- [x] `lib/supabase.ts` — `supabaseAdmin` (service key) e cliente público
- [x] `lib/ai.ts` — wrapper sobre `@ai-sdk/openai` lendo modelo de `getSettings()`
- [x] `lib/cefis.ts` + `lib/cefis-server.ts` — cliente HTTP do catálogo CEFIS
- [x] `lib/vtt.ts` — parser WebVTT → cues com `startSeconds`/`endSeconds`
- [x] `lib/sample-ingest.ts` — pipeline ingestão (cursos + aulas + chunks com timestamp)
- [x] `lib/tutor-agent.ts` — RAG (chunks + courses) + structured output + citações com deep-link
- [x] `lib/phone.ts` — normalização E.164
- [x] `lib/evolution.ts` — cliente Evolution API
- [x] `/api/admin/settings` — GET com mascaramento + POST com whitelist
- [x] `/api/admin/ingest-sample` — dry-run e ingestão real
- [x] `/api/auth/cefis-login` — POST → seta cookie `cefis_session` httpOnly
- [x] `/api/auth/me` — GET → devolve usuário + perfil CEFIS
- [x] `/api/auth/logout` — POST → limpa cookie
- [x] `/api/whatsapp/link` — POST → gera OTP (envio é feito pelo próprio usuário a partir do número do bot; bot phone vem de `app_settings.evolution_bot_phone`)
- [x] ~~`/api/whatsapp/webhook`~~ — migrado para `services/wa` (Bun + Railway). Rota antiga agora retorna 410. Ver seção "Projeto: Webhook service em Bun + Railway" abaixo.
- [x] `/api/whatsapp/process` — endpoint que recebe payload assinado (HMAC) do serviço Bun e roda OTP/tutor

## Pendente

### Tutor
- [x] `/api/tutor/route.ts` — POST JSON, lê `bussola_cefis_user_id`, chama `askTutor()`, devolve `{ text, citations, suggestedCourses, groundedInCefis }`. Persiste em `tutor_messages` se autenticado.
- [~] Streaming via `toUIMessageStreamResponse` — não usado; tutor-agent é `generateObject` (sem streaming nativo). JSON simples atende a demo.

### Onboarding
- [x] `/api/onboarding/route.ts` — POST turn-based. Recebe `messages[]`, devolve `{ message, complete, profileSaved }`. `generateObject` decide pergunta vs. confirmação final.
- [x] Persiste `user_profile` (goal/minutos/deadline/learning_style) + `skill_assessment` (weak_area como lacuna_critica) quando `complete=true`.
- [x] Enriquece system com nome/ocupação/cidade vindos de `cefis.me()`.

### Curador → plano
- [x] `/api/curator/generate-plan/route.ts` — POST. Lê `user_profile` + `skill_assessment`, embed da query, roda `match_lesson_chunks` + `match_courses`, `generateObject` monta plano (4-7 items), desativa anteriores, insere `study_plan` + `plan_items`, devolve `loadPlan()` enriquecido.
- [x] `/api/plan/[id]/route.ts` — GET, valida ownership, devolve `PlanView` com `deep_link`, título de curso/aula.
- [x] `/api/plan/active/route.ts` — GET do plano ativo do user (atalho pra UI).
- [x] `lib/plan.ts` — `loadPlan()` + `getActivePlanForUser()` reutilizáveis.

### Cortado (não fazer hoje)
- [~] `/api/podcast/generate` — fora de escopo solo
- [~] `/api/quick-learn` — fora de escopo solo
- [~] `/api/diagnostic` — virou 2-3 perguntas no onboarding
- [~] `/api/coach/daily` — fora de escopo solo

## Padrões a manter

- Todo handler que toca credencial chama `getSettings()` — **nunca** `process.env.OPENAI_API_KEY` direto
- Cookies sempre `httpOnly: true, secure: prod, sameSite: 'lax'`
- Erros nunca devolvem stack trace — `{ error: 'mensagem amigável' }` + log server-side com prefixo da chave (`sk-abc12…`)
- Inputs sempre validados com Zod no boundary

---

## Projeto: Webhook service em Bun + Railway

### Por que existir um serviço separado

O webhook atual em `/api/whatsapp/webhook` (Next.js) funciona, mas tem três problemas para a demo:

1. **Cold start na Vercel** — Evolution v2 dá retry se a resposta passar de ~5s; cold start de função Next + tutor agent (RAG + GPT) facilmente estoura.
2. **Ack lento ≠ processamento lento** — webhook tem que devolver 200 em <500ms e processar async, mas Next.js route handler bloqueia a resposta até o `return`.
3. **Lifecycle de instância** — criar/conectar/desconectar instância Evolution, gerar QR, monitorar status — hoje não tem nada disso. Precisa quando a gente for além da instância única do hackathon.

Solução: serviço Bun dedicado no Railway. Bun é nativamente rápido para HTTP, Railway tem deploy GitHub-push e custa centavos. O Next.js continua dono da UI/RAG/onboarding; o serviço Bun é o **adapter da Evolution**.

### Arquitetura

```
                 ┌──────────────────┐
  Evolution v2 ──▶│  bussola-wa      │  Bun + Hono em Railway
   (webhook)     │  (este serviço)  │  - valida webhook
                 │                  │  - ack imediato (200 < 50ms)
                 │                  │  - enfileira (Bun queue em memória, ok p/ MVP)
                 │                  │  - chama processo async ↓
                 └──────┬───────────┘
                        │ HTTPS + HMAC interno
                        ▼
                 ┌──────────────────┐
                 │  Next.js         │  /api/whatsapp/process
                 │  (Vercel)        │  - RAG + tutor agent
                 │                  │  - resposta via Bun /send/text
                 └──────────────────┘
                        │
                        ▼
                 ┌──────────────────┐
                 │ bussola-wa /send │  proxy outbound para Evolution
                 │ (este serviço)   │  (centraliza retries/rate-limit)
                 └──────────────────┘
```

A Bun fica como **fronteira única com a Evolution**. Next.js nunca fala com Evolution direto depois desta migração.

### Repositório / layout

Opção recomendada (hackathon): **monorepo simples — pasta `services/wa/` no mesmo repo**. Railway aceita "root directory" e deploya só essa pasta. Evita git submodule e mantém o tipo `EvolutionConfig` compartilhado.

```
bussola.ai/
├── src/            # Next.js (atual)
├── supabase/       # migrations
├── services/
│   └── wa/         # 👈 novo
│       ├── package.json       # type: "module", bun start
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts       # Hono app + Bun.serve
│       │   ├── env.ts         # validação Zod das envs
│       │   ├── webhook.ts     # POST /v1/evolution/webhook
│       │   ├── send.ts        # POST /v1/send/text, /v1/send/audio
│       │   ├── instance.ts    # POST /v1/instance/create|connect|qr|status
│       │   ├── evolution.ts   # client da Evolution (movido de src/lib/evolution.ts)
│       │   ├── hmac.ts        # sign/verify HMAC interno
│       │   └── relay.ts       # dispatch para Next.js (fetch + retry exponencial)
│       └── Dockerfile         # (opcional — Railway usa nixpacks por padrão)
└── tasks/
```

### Endpoints do serviço

**Públicos (Evolution → nós):**
- `POST /v1/evolution/webhook?secret=...` — Evolution v2 entrega aqui. Valida `secret` + header `apikey`, ack 200 imediato, dispara processamento async.

**Internos (Next.js → nós, autenticados via HMAC):**
- `POST /v1/send/text` — body `{ phone, text }`, retorna `{ message_id }`. Centraliza retry + rate limit Evolution.
- `POST /v1/send/audio` — body `{ phone, audio_base64, mimetype }`.
- `POST /v1/instance/create` — body `{ name }`, retorna `{ instance_id, qr_code }`.
- `GET /v1/instance/:name/status` — retorna `{ connected, phone }`.
- `POST /v1/instance/:name/connect` — pede QR de reconexão.

**Saída (nós → Next.js, autenticados via HMAC):**
- `POST $NEXTJS_PROCESS_URL` — body `{ phone, text, audio_base64?, pushName, evolution_message_id }`. Bun assina, Next.js valida assinatura antes de chamar `askTutor()`.

### Segurança

- Webhook público continua validando `secret` (query) + `apikey` (header), mesma lógica do `lib/evolution.ts` atual — copiar para `services/wa/src/evolution.ts`.
- HMAC entre Bun ↔ Next.js: cabeçalho `X-Bussola-Signature: sha256=<hex>`, segredo em env (`INTERNAL_HMAC_SECRET`) gerado uma vez, mesmo valor nos dois lados. Comparação constant-time.
- Bun service NUNCA aceita request sem secret (webhook) ou sem HMAC válido (interno) — 403 silencioso, log com IP.
- `service_role` do Supabase só no Bun se ele for persistir (recomendado: Bun escreve raw incoming em `whatsapp_messages` para auditoria + ack rápido, depois delega ao Next.js o trabalho cognitivo).

### Variáveis de ambiente (Railway)

```
EVOLUTION_API_URL=https://evolution.cefis.com.br
EVOLUTION_API_KEY=<vem da Evolution>
EVOLUTION_INSTANCE=bussola
EVOLUTION_WEBHOOK_SECRET=<gerar com `openssl rand -hex 24`>
NEXTJS_PROCESS_URL=https://bussola.app/api/whatsapp/process
INTERNAL_HMAC_SECRET=<gerar com `openssl rand -hex 32`>
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role>
PORT=3000
LOG_LEVEL=info
```

Decisão importante: **as credenciais da Evolution saem do `app_settings` no banco** para esse serviço — Bun lê de env. Motivo: simplifica deploy, evita round-trip ao Supabase para configuração estática, e o `/admin` continua sendo só pro Next.js (que pode até deixar de saber a Evolution key se quisermos zerar superfície). Re-avaliar se aparecer multi-instância.

### Deploy no Railway

- [ ] Conectar repo no Railway, criar service apontando para `services/wa/`
- [ ] Build command: `bun install`
- [ ] Start command: `bun run src/index.ts`
- [ ] Health check: `GET /health` (devolve `{ ok: true, instance, evolutionReachable }`)
- [ ] Custom domain: `wa.bussola.app` (ou usar o `*.up.railway.app` no MVP)
- [ ] Setar env vars acima
- [ ] No painel da Evolution, apontar webhook URL para `https://wa.bussola.app/v1/evolution/webhook?secret=$EVOLUTION_WEBHOOK_SECRET` com eventos `messages.upsert`, `connection.update`

### Plano de execução (ordem recomendada)

1. [x] Scaffold `services/wa/` com Hono, tsconfig strict, Railway config, README, `.env.example`
2. [x] `services/wa/src/evolution.ts` — client adaptado a env (sem `server-only`, sem `getSettings`)
3. [x] `POST /v1/evolution/webhook` — valida secret+apikey, persistência raw em `whatsapp_messages`, ack imediato, relay async via `queueMicrotask`
4. [x] `POST /v1/send/text`, `/v1/send/audio`, `/v1/media/download` — proxies com retry exponencial 3x em 5xx
5. [x] `services/wa/src/hmac.ts` (sign+verify constant-time) + middleware Hono que valida HMAC em todos os endpoints internos
6. [x] `/api/whatsapp/process/route.ts` no Next.js — recebe payload assinado, valida HMAC, roda OTP/tutor, responde via `waSendText()`
7. [x] `src/app/api/whatsapp/webhook/route.ts` retorna `410 Gone` (Evolution para de retentar); `src/lib/evolution.ts` deletado (ninguém mais importa)
8. [ ] Smoke test local: subir Bun (`cd services/wa && bun run dev`) + Next (`npm run dev`), enviar payload de teste via `curl` com `?secret=...`
9. [ ] Deploy no Railway: conectar repo, root directory `services/wa`, colar envs, gerar domínio, repontar webhook na Evolution

### Critérios de aceite

- [ ] Mensagem WhatsApp → resposta do tutor com citação em ≤ 8s (p50), ≤ 15s (p95)
- [ ] Evolution recebe 200 do webhook em <500ms sempre (ack pré-processamento)
- [ ] Reinício do Next.js (cold start) não perde mensagens — Bun re-tenta `/api/whatsapp/process` 3x antes de desistir
- [ ] Logs do Railway não contêm `apikey`, conteúdo de mensagem do user, nem áudio em base64

### Implementação — onde olhar

| Coisa | Arquivo |
|---|---|
| Hono app + boot | `services/wa/src/index.ts` |
| Validação de env (Zod) | `services/wa/src/env.ts` |
| Webhook Evolution (ack rápido + relay) | `services/wa/src/webhook.ts` |
| Send proxies (HMAC required) | `services/wa/src/send.ts` |
| Instance lifecycle | `services/wa/src/instance.ts` |
| Client Evolution (env-based) | `services/wa/src/evolution.ts` |
| HMAC sign/verify | `services/wa/src/hmac.ts` + middleware em `middleware.ts` |
| Relay para Next.js c/ retry | `services/wa/src/relay.ts` |
| Logger c/ redaction de PII/secrets | `services/wa/src/log.ts` |
| Endpoint que recebe relay no Next.js | `src/app/api/whatsapp/process/route.ts` |
| HMAC compartilhado no Next.js | `src/lib/hmac.ts` |
| Cliente p/ chamar Bun (`/v1/send/*`) | `src/lib/wa-client.ts` |

### Envs novas no Next.js (Vercel)

```
WA_SERVICE_URL=https://<railway>.up.railway.app
INTERNAL_HMAC_SECRET=<mesmo valor do Bun, openssl rand -hex 32>
```

### Como testar local (sem Railway)

```bash
# Terminal 1 — Bun
cd services/wa
cp .env.example .env  # preencher EVOLUTION_*, SUPABASE_*, INTERNAL_HMAC_SECRET
bun install
bun run dev   # PORT=3001 sugerido pra não colidir com Next

# Terminal 2 — Next.js
# em .env.local adicionar WA_SERVICE_URL=http://localhost:3001 e INTERNAL_HMAC_SECRET=<mesmo>
npm run dev

# Terminal 3 — Simular webhook da Evolution
curl -X POST "http://localhost:3001/v1/evolution/webhook?secret=$EVOLUTION_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{"event":"messages.upsert","instance":"bussola","data":{"key":{"remoteJid":"5511999999999@s.whatsapp.net","fromMe":false,"id":"X1"},"message":{"conversation":"o que é BATNA?"},"pushName":"Test"}}'
```

### NÃO fazer (no escopo deste serviço)

- ❌ Não embutir o tutor agent / RAG no Bun — fica no Next.js. Bun é só adapter.
- ❌ Não usar fila externa (Redis/SQS) — Bun in-memory + retry HTTP é suficiente pra demo. Anotar como dívida pós-MVP.
- ❌ Não duplicar lógica de transcrição Whisper — fica no Next.js process endpoint.
- ❌ Não usar Node.js — Bun é o ponto. Hono roda nativo no Bun via `Bun.serve`.
