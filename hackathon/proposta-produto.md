# Proposta de Produto — "Bússola" (CEFIS Tutor)

> A solução que vamos construir no hackathon CEFIS.
> Nome de trabalho: **Bússola** (você tem um destino; a IA te orienta o caminho).

---

## Pitch em 1 frase

> Bússola é um tutor de IA que entende quem você é, onde quer chegar e traça o caminho mais curto para o seu objetivo — usando o catálogo da CEFIS e criando conteúdo sob demanda.

---

## Pitch em 30 segundos (para a banca)

> "Imagine que você quer mudar de carreira para análise de dados, mas tem só 30 minutos por dia. Você abre a Bússola, conversa por 2 minutos sobre seus objetivos e nível atual, e em 30 segundos ela monta seu plano: 'em 3 semanas, baseado em 8 lições do catálogo CEFIS + um resumo em PDF que eu vou gerar pra você + um podcast de 12 minutos para ouvir no caminho do trabalho'. E ela acompanha sua evolução todo dia. Isso é Bússola."

---

## O problema (da perspectiva do aluno)

| Dor | Como o aluno sente |
|---|---|
| "Não sei por onde começar" | Plataforma com 1000 cursos; paralisia de decisão |
| "Não tenho tempo" | 30 min/dia, mas cursos têm 8h |
| "Aprendi mas não fixou" | Sem acompanhamento, conteúdo vira fumaça |
| "Tem coisa que falta no catálogo" | Catálogo grande mas não cobre 100% das necessidades |
| "Não sei se estou evoluindo" | Sem feedback, sem motivação para continuar |
| "Não aprendo lendo, prefiro ouvir" | Catálogo é majoritariamente vídeo/texto |

## A nossa resposta

| Dor | Como a Bússola resolve |
|---|---|
| "Não sei por onde começar" | **Diagnóstico conversacional** monta um plano sob medida em 2 minutos |
| "Não tenho tempo" | Plano respeita o tempo disponível ("10 minutos sobre X") e prioriza o essencial |
| "Aprendi mas não fixou" | **Coach diário** envia revisão rápida + quiz baseado no spaced repetition |
| "Tem coisa que falta no catálogo" | **Curador IA** gera apostila/resumo/quiz quando o catálogo não cobre |
| "Não sei se estou evoluindo" | Dashboard mostra progresso, lacunas resolvidas, próximos passos |
| "Não aprendo lendo, prefiro ouvir" | **Podcast generator** converte qualquer tópico em conversa de áudio (estilo NotebookLM) |

---

## Os 5 fluxos do produto

### 1. Onboarding (60-120 segundos)

**Conversa, não formulário.** Um agente faz 5-7 perguntas em chat:

```
Bússola: "Oi! Sou a Bússola, sua tutora pessoal da CEFIS. Pra começar, qual é
seu objetivo principal nos próximos 3 meses?"

Aluno: "Quero migrar de marketing para análise de dados"

Bússola: "Maravilha! Já mexeu com algo de dados antes? Excel, SQL, Python..."

Aluno: "Excel sim, no nível avançado. Nunca toquei em SQL ou Python."

Bússola: "Perfeito. Quantos minutos por dia você consegue dedicar?"

Aluno: "30 minutos durante a semana, mais 2h no sábado."

Bússola: "Você aprende melhor assistindo, lendo, ou ouvindo?"

Aluno: "Ouvindo, principalmente no carro."

Bússola: "Anotado. Mais uma: alguma deadline? Tem uma vaga em vista?"

Aluno: "Estou me candidatando em 6 semanas."
```

**Saída:** perfil estruturado salvo (`user_profile` table).

### 2. Diagnóstico de lacunas (90 segundos)

**Quiz adaptativo curto.** 8-12 perguntas que ajustam dificuldade em tempo real:

- Começa com perguntas amplas
- Aprofunda nos tópicos onde aluno tem confiança média
- Pula tópicos onde aluno já mostra domínio
- Cada pergunta tem peso por importância para o objetivo

**Saída:** mapa de competências (`skill_assessment` table) — para cada habilidade necessária, score de 0-100.

```json
{
  "objetivo": "analista_de_dados_pleno",
  "habilidades": {
    "excel_avancado": { "score": 85, "status": "domina" },
    "sql_basico": { "score": 0, "status": "lacuna_critica" },
    "python_basico": { "score": 0, "status": "lacuna_critica" },
    "estatistica_descritiva": { "score": 35, "status": "lacuna_parcial" },
    "visualizacao_dados": { "score": 20, "status": "lacuna_parcial" },
    "storytelling_dados": { "score": 50, "status": "lacuna_parcial" }
  }
}
```

### 3. Plano de estudos (15 segundos)

**Curador agente** recebe:
- Perfil do aluno
- Mapa de lacunas
- Tempo disponível
- Estilo de aprendizagem
- Conteúdo CEFIS (via RAG)

E monta um plano semana a semana:

```
Semana 1 — SQL básico (10h disponíveis)
├── Seg (30min) 🎙️ Podcast Bússola: "SQL em 25 min para quem só sabe Excel"
├── Ter (30min) 📺 [CEFIS] Curso "SQL para Iniciantes" — Aulas 1-3
├── Qua (30min) 📺 [CEFIS] Curso "SQL para Iniciantes" — Aulas 4-6
├── Qui (30min) 📝 [Bússola] Resumo PDF: "Joins explicados com analogia"
├── Sex (30min) ❓ [Bússola] Quiz adaptativo: 10 perguntas de SQL
└── Sáb (2h) 🛠️ [Bússola] Projeto guiado: "Analise o dataset Olist em SQL"
```

**Saída:** `study_plan` table com items (`plan_items`).

### 4. Tutor conversacional (sempre disponível)

Aluno pode tirar dúvidas a qualquer hora:

```
Aluno: "Qual a diferença entre INNER JOIN e LEFT JOIN?"

Bússola: "Imagina duas tabelas: Clientes e Pedidos.
- INNER JOIN: só mostra clientes que TÊM pedidos.
- LEFT JOIN: mostra TODOS os clientes, e quando não tem pedido,
  preenche com NULL.

Esse conceito é cobrado na sua trilha. Quer ver o exemplo prático da
aula 4 do curso 'SQL para Iniciantes' da CEFIS? Tem 6 minutos."

[📺 Assistir trecho da aula]
```

**Toda resposta** usa RAG sobre o catálogo CEFIS + cita a aula/curso fonte.

### 5. Coach diário (acompanhamento contínuo)

Todo dia (configurável), o aluno recebe:

- Quão fez ontem (vs. plano)
- 1 quiz rápido de revisão (spaced repetition)
- Ajuste do plano se necessário ("você terminou SQL básico antes do esperado, antecipei Python para a semana 2")
- Mensagem motivacional baseada no perfil

---

## As 3 inovações que vão ganhar 15 pts

### 1. "X minutos para entender Y"

Comando direto no chat: **"tenho 10 minutos para entender astronomia"**.

A Bússola:
1. Identifica os 3 conceitos mais importantes do tema
2. Monta um micro-resumo que cabe em 10 minutos
3. Oferece formato: leitura (3 min), podcast (10 min) ou flashcards (5 min)
4. Mostra de onde tirou (cita curso CEFIS quando aplicável, gera quando não)

Demo poderosa para a banca — é um wow imediato.

### 2. Podcast generator (estilo NotebookLM)

Dois "apresentadores" IA conversam sobre o tema do dia. Implementação:

```typescript
// 1. Pega contexto do tema (RAG do catálogo CEFIS)
const context = await ragSearch(tema, topK: 5);

// 2. Gera roteiro de podcast (2 vozes alternando)
const script = await generatePodcastScript({
  topic: tema,
  context,
  duration_minutes: 10,
  hosts: [
    { name: "Ana", voice: "nova", persona: "curiosa, faz perguntas" },
    { name: "Bruno", voice: "onyx", persona: "didático, explica" },
  ],
});

// 3. Sintetiza áudio com OpenAI TTS, intercalando vozes
const audioBuffer = await synthesizePodcast(script);

// 4. Salva em Storage, retorna URL
return await uploadToStorage(audioBuffer);
```

Resultado: aluno baixa o podcast e ouve no caminho do trabalho. **Killer feature.**

### 3. Diagnóstico via conversa (não formulário)

A maioria dos concorrentes vai fazer um formulário. Nós fazemos uma **conversa adaptativa** que parece humana. O agente decide a próxima pergunta com base na anterior. Sente como falar com um mentor de verdade — porque é.

---

## Telas que vamos construir (priorizado)

### Críticas (devem funcionar)

1. **`/`** — Landing com CTA "Começar diagnóstico" (5 min)
2. **`/onboarding`** — Chat de onboarding (estilo conversa) (90 min)
3. **`/diagnostico`** — Quiz adaptativo (60 min)
4. **`/plano`** — Plano de estudos visual (90 min)
5. **`/tutor`** — Chat de dúvidas com RAG (60 min)

### Importantes (entregar se der tempo)

6. **`/aula/[id]`** — Player de conteúdo (vídeo CEFIS ou conteúdo gerado) (45 min)
7. **`/podcast`** — Página de geração e player de podcast (60 min)
8. **`/dashboard`** — Progresso + coach diário (45 min)

### Bonus (só se sobrar tempo)

9. **`/biblioteca`** — Conteúdos gerados anteriores (PDFs, podcasts, resumos)
10. **`/admin`** — Visão da banca: quantos alunos, qual perfil, quais lacunas

---

## Personagem da banca

> 📌 **Persona atualizada com base no catálogo real da CEFIS** — a plataforma é forte em **direito, contabilidade, OAB, tributário, concursos públicos**. Demo precisa refletir isso.

Vamos contar uma história real durante o pitch:

> **Marina, 28 anos, contadora recém-formada**
> Quer dominar Direito Tributário para abrir escritório próprio em 4 meses. Já tem certificado em Contabilidade Básica na CEFIS (90% accuracy). Tem 45 min/dia + 3h no sábado.

Demo:
1. Marina **faz login com sua conta CEFIS real** (`POST /api/v1/login`)
2. Bússola já chama `GET /api/v1/user/me` → "Oi Marina! Vi que você é contadora em SP. Qual seu objetivo agora?"
3. Onboarding em 4 perguntas (não 7 — porque já tem perfil)
4. Diagnóstico **pula Contabilidade Básica** porque viu certificado com 90% via `GET /performance/certificates`
5. Bússola identifica trilha relevante via `GET /tracks?categories[]=3` (Tributário) e mostra plano combinando:
   - 8 aulas da trilha CEFIS "Direito Tributário Avançado" (link real para `cefis.com.br`)
   - Resumo PDF gerado pela IA cobrindo gap específico
   - 2 podcasts para ouvir no caminho (10 min cada)
6. Marina pede: "tenho 15 min agora, me dá o essencial de ICMS" → Bússola gera + cita aulas CEFIS
7. Marina pergunta: "diferença entre crédito tributário e débito tributário?" → tutor responde com RAG nas transcrições reais
8. Volta no dia seguinte → coach mostra progresso (já tem 30 min assistidos, salvo via `progress.lastSecond`)

---

## O que NÃO vamos fazer (foco é tudo)

- ❌ Autenticação real (mock com `localStorage`)
- ❌ Pagamento, planos, billing
- ❌ Multi-tenancy
- ❌ Mobile app (web responsivo serve)
- ❌ Backend separado (tudo Next.js routes)
- ❌ Mais de 8 telas (qualidade &gt; quantidade)
- ❌ Features que não cabem no pitch de 5 min

---

## Diferenciais que vamos VENDER (e por quê)

| Diferencial | Pega que critério | Como provamos no pitch |
|---|---|---|
| RAG sobre catálogo CEFIS real | Integração CEFIS (25pts) | Demo: aluno pergunta, IA cita curso X aula Y |
| Multi-agent com 5 especialistas | Qualidade IA (20pts) | Slide explicando arquitetura |
| Podcast generator | Inovação (15pts) | Demo ao vivo: tema → áudio em 30s |
| "X min para entender Y" | Inovação (15pts) | Demo ao vivo: comando direto |
| Diagnóstico por conversa | UX (10pts) + Qualidade IA (20pts) | Demo: parece falar com humano |
| Coach diário com spaced repetition | Funcionalidade (30pts) | Slide + 1 screenshot |

---

## Métricas que dão "wow" na banca

Plotar no dashboard final do pitch:

- **5 agents especializados** em produção
- **N lições CEFIS indexadas** (mostrar número real do RAG)
- **3 formatos de conteúdo** (vídeo, PDF, podcast)
- **&lt; 30s** do diagnóstico ao plano pronto
- **Tempo de resposta médio do tutor:** &lt;2s

---

**Próximo passo:** [arquitetura.md](./arquitetura.md) — como construir isso em código.
