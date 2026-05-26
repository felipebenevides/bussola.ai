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
- [x] `/api/whatsapp/link` — POST → gera OTP e envia via Evolution
- [x] `/api/whatsapp/webhook` — validação por secret + match OTP → vincula `users.whatsapp_phone`

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
