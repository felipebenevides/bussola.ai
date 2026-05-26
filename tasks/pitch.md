# Pitch & submissão

## Concluído

- [x] `hackathon/pitch-banca.md` — roteiro escrito
- [x] `hackathon/proposta-produto.md` — narrativa do produto
- [x] `hackathon/arquitetura.md` — diagrama de domínio

## Pendente

### Materiais
- [ ] README do repo `bussola-cefis`:
  - Pitch de 1 frase
  - Demo URL (Vercel)
  - Stack
  - Setup local (clone, npm i, env, supabase, /admin, ingest, npm run dev)
  - Endpoints CEFIS consumidos (lista que impressiona)
  - Print do tutor com citação + deep-link
- [ ] 4 screenshots backup em `hackathon/screenshots/`:
  - `01-login.png`
  - `02-onboarding.png`
  - `03-plano.png`
  - `04-tutor-com-citacao.png` (o mais importante — killer feature)
- [ ] 1 slide de arquitetura (Excalidraw ou tldraw, export PNG)
- [ ] 1 slide de métricas (26 cursos, 58 chunks, 4 endpoints CEFIS, 1 killer feature)

### Roteiro (5 min)
- [ ] Re-ler `hackathon/pitch-banca.md` 3x
- [ ] Adaptar para persona de **contador querendo negociar** (não Marina/tributário da proposta antiga)
- [ ] Decorar abertura (30s) e fechamento (30s)
- [ ] Demo central (3 min):
  - Login real CEFIS (10s)
  - Onboarding 3 perguntas (40s)
  - Plano gerado com badges (30s)
  - Tutor: pergunta de negociação Harvard → resposta com citação → **clica → abre player CEFIS no segundo exato** (90s — esse é o wow)
- [ ] Slide arquitetura (30s) — multi-agent + RAG com timestamp
- [ ] Convidar banca a fazer pergunta ao vivo no tutor (30s)

### Ensaios
- [ ] Rodar 2x ponta a ponta cronometrando (alvo: 4min30s para sobrar buffer)
- [ ] Testar em rede do evento (mobile hotspot como fallback)
- [ ] Gravar tela do tutor + clique no deep-link como **vídeo de backup** se demo falhar

### Submissão
- [ ] Identificar canal/formulário oficial
- [ ] Preencher com:
  - Nome do projeto: **Bússola**
  - Time: Felipe Benevides (solo)
  - Repo URL: github.com/<user>/bussola-cefis
  - Demo URL: bussola.vercel.app (ou similar)
  - Vídeo: link do backup (se exigido)
- [ ] **Submeter até 23h00** (1h de buffer)

## Pontos a martelar no pitch

| Critério (peso) | Como provar em 5 min |
|---|---|
| Funcionalidade (30) | Login + onboarding + plano + tutor — fluxo inteiro funcional online |
| Integração CEFIS (25) | "Logo na frente: login real CEFIS, perfil via `/me`, catálogo de 26 cursos indexado, links abrem na plataforma deles" |
| IA (20) | Multi-agent (onboarding + tutor) + RAG com `pgvector` + chunks com timestamp |
| Inovação (15) | "Quando a Bússola cita uma aula, ela cita o **segundo exato** — clica e abre lá" (demo ao vivo) |
| UX (10) | Conversa real, mobile-first, latência baixa |

## NÃO fazer

- ❌ Não tentar features novas após 21h
- ❌ Não fazer slide bonito demais (perde tempo, banca quer ver produto)
- ❌ Não falar "se desse tempo a gente faria X" — só fala do que fez
- ❌ Não esperar 23h59 para submeter
