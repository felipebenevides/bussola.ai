# WhatsApp — Evolution API (opcional para a demo)

> Esta frente é "bonus de inovação". Se faltar tempo no dia, **NÃO bloqueia a entrega**.
> O fluxo principal (web) precisa funcionar primeiro.

## Concluído

- [x] `lib/phone.ts` — normalização para E.164
- [x] `lib/evolution.ts` — cliente HTTP da Evolution API
- [x] `supabase/schema_whatsapp.sql` — campos `users.whatsapp_phone`, tabela de OTP
- [x] `POST /api/whatsapp/link` — gera OTP (6 dígitos, TTL 10min, uso único), envia via Evolution
- [x] `POST /api/whatsapp/webhook` — valida assinatura/secret, faz match do OTP, vincula `users.whatsapp_phone`
- [x] `/conectar-whatsapp/page.tsx` — UI do fluxo de OTP
- [x] Settings de Evolution em `/admin` (URL, key, instance, bot phone, webhook secret)

## Pendente (se houver tempo)

### Cenário "tutor pelo WhatsApp" (decidir se mostra na demo)
- [ ] No webhook, se a mensagem recebida **não é OTP** e o `from` está vinculado:
  - Chamar `tutorAgent.answer(text, { userId })`
  - Responder no WhatsApp com texto + lista de citações ("📺 Aula X aos 3:42 → link")
- [ ] Limitar 1 mensagem a cada 30s por número (proteção contra loop)
- [ ] Log estruturado (sem PII no conteúdo)

### Operacional
- [ ] Configurar webhook na instância Evolution apontando para prod
- [ ] Testar com WhatsApp real (1 número) ponta a ponta

## Decisão pré-demo

- [ ] **Vai mostrar WhatsApp no pitch?** Sim → tem que estar 100% confiável. Não → tirar item do roteiro e deixar como "também temos integração com WhatsApp, mas não vou abrir agora".

## NÃO fazer

- ❌ Não aceitar webhook sem validação de secret (já está validado — manter)
- ❌ Não logar `from` + `body` juntos
- ❌ Não responder loop "olá" → criar guard de rate-limit
