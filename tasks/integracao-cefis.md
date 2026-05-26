# Integração CEFIS — 25pts no critério

## Concluído

- [x] `lib/cefis.ts` + `lib/cefis-server.ts` — cliente HTTP autenticado com `cefis_demo_api_key`
- [x] `POST /api/auth/cefis-login` — login real contra API CEFIS, retorna user + key
- [x] Cookie `cefis_session` httpOnly após login
- [x] `GET /api/auth/me` — busca perfil real via `/api/v1/user/me`
- [x] `POST /api/auth/logout` — limpa cookie
- [x] Ingestão de catálogo: 26 cursos / 697 aulas com `cefis_course_id`/`cefis_lesson_id` corretos

## Pendente

### Validar formato do deep-link
- [ ] Logar no CEFIS manualmente, abrir uma aula do curso 1132, pegar URL real
- [ ] Confirmar se é `?t=222` (segundos) ou `?start=00:03:42` ou `#t=222`
- [ ] Atualizar `buildDeepLink()` em `lib/tutor-agent.ts` se necessário
- [ ] **Bloqueador da demo se errado** — citação que não abre quebra o pitch

### Endpoints adicionais para o curador
- [ ] `GET /tracks?categories[]=N` — listar trilhas CEFIS relevantes ao perfil
  - Se a API responder, adicionar 1 "🎯 Trilha CEFIS recomendada" no plano
  - Se não responder ou der erro, skip silencioso (não bloquear plano)
- [ ] `GET /performance/certificates` — pular skills já dominadas
  - Demo: contador com certificado em contabilidade básica → onboarding pula essa pergunta

### Persistência
- [ ] Garantir que `users.cefis_user_id` está populado após login
- [ ] Garantir que `users.cefis_api_key` é guardado encrypted-at-rest (ou ao menos isolado em row protegida por RLS)

### Documentação
- [ ] No README, citar quais endpoints CEFIS estão consumidos (impressiona banca):
  - `POST /api/v1/login`
  - `GET /api/v1/user/me`
  - `GET /api/v1/courses` (lista)
  - `GET /api/v1/courses/:id/lessons` (ingestão)
  - `GET /api/v1/tracks?categories[]=...` (se implementado)
  - `GET /api/v1/performance/certificates` (se implementado)

## NÃO fazer

- ❌ Não mockar login com `localStorage` "para ganhar tempo" — login real **é** a entrega do critério
- ❌ Não cachear `me` muito agressivo — perfil pode mudar e demo precisa parecer fresh
- ❌ Não expor `cefis_api_key` em response JSON (mascarar como já fazemos)
