# bussola-wa

Adapter da Evolution API v2 para a Bússola. Roda em Bun, deploya em Railway.
É a fronteira única entre o Next.js (`bussola.app`) e a Evolution — Next.js
não fala mais com a Evolution direto depois desta migração.

## Por que separado

- Evolution exige ack de webhook em <5s; Next.js na Vercel sofre com cold start.
- Centraliza retries/rate-limit de saída.
- Gerencia ciclo de vida de instância (criar, conectar, QR, status).

## Arquitetura

```
Evolution v2 ─[webhook]─▶ Bun (este serviço) ─[HMAC HTTP]─▶ Next.js /api/whatsapp/process
                              ▲                                       │
                              └──[HMAC HTTP /v1/send/text]────────────┘
```

## Endpoints

**Públicos:**
- `GET /health` — liveness + `evolutionReachable`
- `POST /v1/evolution/webhook?secret=...` — Evolution entrega aqui

**Internos (Next.js → Bun, exigem HMAC):**
- `POST /v1/send/text` — `{ phone, text }` → `{ messageId }`
- `POST /v1/send/audio` — `{ phone, audio_base64, mimetype }`
- `POST /v1/media/download` — `{ id, remoteJid, fromMe }` → `{ base64, mimetype }`
- `POST /v1/instance/create` — `{ name }` → `{ instance, qr }`
- `GET  /v1/instance/:name/status`
- `POST /v1/instance/:name/connect` — força reconexão (devolve QR)

## HMAC

Cabeçalho `X-Bussola-Signature: sha256=<hex>` em todas as chamadas internas.
Body: hash do corpo JSON cru. Mesmo segredo `INTERNAL_HMAC_SECRET` nos dois
lados. Comparação constant-time.

## Rodar local

```bash
cd services/wa
cp .env.example .env
# preencher EVOLUTION_*, SUPABASE_*, INTERNAL_HMAC_SECRET
bun install
bun run dev
```

Apontar `NEXTJS_PROCESS_URL` para `http://localhost:3000/api/whatsapp/process` (Next.js dev).

## Deploy Railway

1. New project → Deploy from GitHub → escolher repo `bussola.ai`
2. Settings → "Root Directory" → `services/wa`
3. Variables → colar `.env` correspondente (sem `.env.local`)
4. Deploy
5. Domínio: settings → Networking → Generate domain (ex: `bussola-wa.up.railway.app`)
6. Painel Evolution → Webhook URL: `https://bussola-wa.up.railway.app/v1/evolution/webhook?secret=$EVOLUTION_WEBHOOK_SECRET`
   - Eventos: `messages.upsert`, `connection.update`

## Logging

Não logamos: conteúdo de mensagem do usuário, áudio em base64, `apikey`,
`INTERNAL_HMAC_SECRET`. Stack traces ficam só no servidor — resposta HTTP
nunca contém detalhes internos.
