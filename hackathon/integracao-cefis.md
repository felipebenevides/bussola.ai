# Integração com a API CEFIS

> Doc canônica baseada em `CEFIS_Hackathon_Docs_Dev.pdf` (oficial da organização).
> Use este arquivo como referência única para todos os endpoints, auth, headers e snippets.

---

## TL;DR — o que muda na nossa estratégia

A documentação oficial **simplificou e fortaleceu** nosso plano:

| Antes | Agora (com docs oficiais) |
|---|---|
| Mock de catálogo (proxy) | **Catálogo real via `/courses`** |
| Scrape de aulas | **Transcrições já disponíveis em ZIP** (link oficial) |
| Auth mock no localStorage | **Auth real via `/api/v1/login`** |
| Plano gerado do zero | **Trilhas existentes (`/tracks`) como base** + plano personalizado |
| Progresso fake | **Progress real por aula** (campos `progress.seconds`, `percentage`, `lastSecond`) |
| Sem certificados | **`/performance/certificates`** mostra histórico real |

**Resultado:** os 25 pts de "Integração CEFIS" ficam muito mais fáceis. **A nota agora depende de **usar bem** os dados reais**, não de simular.

---

## Bases das APIs

Duas APIs distintas com **headers de auth diferentes**:

| API | Base URL | Auth Header |
|---|---|---|
| **v1** (auth + user) | `https://cefis.com.br` | `Authorization: {api_key}` (**sem prefixo**) |
| **v3** (catálogo, trilhas, progresso) | `https://api-v3.cefis.com.br` | `Authorization: Bearer {api_key}` (**com prefixo**) |

Esse detalhe é **crítico**. Errar o prefixo = `401`. Centralize num client TypeScript (snippet abaixo).

---

## 1. Autenticação

### POST `/api/v1/login`

**Base:** `https://cefis.com.br`
**Auth:** nenhuma (esse é o endpoint que retorna a chave)

```http
POST https://cefis.com.br/api/v1/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",   // ou CPF (só dígitos)
  "pass": "senha123"
}
```

**Resposta 200:**

```json
{
  "data": {
    "id": 42,
    "user_id": 123,
    "key": "abc123...",
    "created_at": 1748131200,
    "updated_at": 1748131200,
    "user": {
      "id": 123,
      "name": "Nome Completo",
      "first_name": "Nome",
      "email": "usuario@email.com",
      "avatar": "https://...",
      "profile": "perfil_slug",
      "is_premium": true,
      "is_admin": false
    }
  }
}
```

**Pontos importantes:**
- A `key` **não expira** — salva no banco do Bússola e reaproveita
- O campo `email` aceita CPF também (a API tenta email primeiro, depois CPF)
- Conta gratuita pode ser criada em `cefis.com.br`

**Erros:**
- `400` — email/pass ausentes
- `401` — credenciais incorretas

### GET `/api/v1/user/me`

Dados completos do usuário autenticado.

```http
GET https://cefis.com.br/api/v1/user/me
Authorization: abc123...
```

**Resposta 200:**

```json
{
  "data": {
    "id": 123,
    "name": "Nome Completo",
    "first_name": "Nome",
    "email": "usuario@email.com",
    "avatar": "https://...",
    "profile": "perfil_slug",
    "birthdate": "1990-01-01",
    "occupation": "Cargo",
    "nivel": 1,
    "certified_name": "Nome para Certificado",
    "registered_at": "2022-01-01 00:00:00",
    "activities": ["area1", "area2"],
    "city": "São Paulo",
    "state": "SP",
    "is_premium": true,
    "is_demo_subscriber": false,
    "premium_plan_active": true,
    "is_admin": false,
    "is_teacher": false,
    "is_team_admin": false
  }
}
```

**Use isso para o onboarding** — pré-popule nome, ocupação, cidade, atividades antes de fazer perguntas redundantes.

---

## 2. Catálogo

### GET `/courses` — lista paginada

**Base:** `https://api-v3.cefis.com.br`

```http
GET /courses?page=1&count=20&order=launchDate&orderDirection=desc&categories[]=1&categories[]=3
Authorization: Bearer abc123...
```

**Query params:**

| Param | Tipo | Valores |
|---|---|---|
| `count` | int | default 10 |
| `page` | int | default 1 |
| `order` | enum | `launchDate` \| `title` \| `averageRating` |
| `orderDirection` | enum | `asc` \| `desc` |
| `search` | string | busca em title, subtitle, id, keywords (ignora cache) |
| `status[]` | enum[] | `todo` \| `doing` \| `done` |
| `categories[]` | int[] | 1-7 |
| `filter[]` | enum[] | `quick` (&lt;1h), `new` (&lt;30d), `scored_crc` |

**Headers opcionais:**
- `x-invalidate-cache: true` — força invalidar cache Redis (cache padrão: 1h)

**Resposta 200:**

```json
{
  "data": [
    {
      "id": 42,
      "title": "Direito Tributário Avançado",
      "subtitle": "Para concursos e OAB",
      "summary": "Resumo",
      "banner": "https://...",
      "goals": ["Objetivo 1"],
      "teacher": { "id": 7, "name": "Prof. João Silva" },
      "duration": 7200,
      "keywords": "tributário;impostos",
      "certificationThreshold": 70,
      "lessonCount": 12,
      "materialCount": 3,
      "categories": [1, 3],
      "ratingQuantity": 150,
      "averageRating": 4.7,
      "practiceAverage": 4.5,
      "trailer": { },
      "crcActive": true,
      "crcCreditHours": 2,
      "crcScore": { },
      "launchDate": "2025-01-10T00:00:00.000Z",
      "recordedAt": "2024-12-01T00:00:00.000Z",
      "createdAt": "2024-11-20T00:00:00.000Z",
      "watchLater": false,
      "progress": { }
    }
  ],
  "total": 120,
  "limit": 10,
  "page": 1,
  "pages": 12
}
```

### GET `/courses/:id` — detalhes do curso

```http
GET /courses/42
Authorization: Bearer abc123...
```

Resposta mesma estrutura do item da lista, mas com mais campos populados (`hasMaterials`, `progress.lessonId + percentage`).

**Erros:**
- `401` — curso de organização e usuário não é membro
- `404` — curso não existe

### GET `/courses/:id/lessons` — aulas com `stream_sources` e `progress`

```http
GET /courses/42/lessons
Authorization: Bearer abc123...
```

**Resposta 200:**

```json
{
  "data": [
    {
      "id": 42,
      "title": "Introdução ao curso",
      "position": 1,
      "duration": 360,
      "preview_url": "https://...",
      "stream_sources": [
        { "quality": "sd", "type": "video/mp4", "link_secure": "https://cdn.../360.mp4", "height": 360 },
        { "quality": "hd", "type": "video/mp4", "link_secure": "https://cdn.../720.mp4", "height": 720 }
      ],
      "progress": {
        "id": 7,
        "seconds": 120,
        "percentage": 33,
        "lastSecond": 120,
        "createdAt": "2026-01-10T14:30:00.000Z",
        "updatedAt": "2026-01-11T09:00:00.000Z"
      }
    }
  ]
}
```

**Use `progress.lastSecond` para mostrar "Continuar de onde parou".**

**Comportamento:**
- Cursos `HIDDEN` ou `SOON` sem auth → retorna `[]`
- Auth sem acesso ao curso → `401`
- Curso não encontrado → `404`

---

## 3. Trilhas (study plans existentes da CEFIS)

### GET `/tracks` — lista paginada

```http
GET /tracks?page=1&count=20&categories[]=1&filters[]=crc
Authorization: Bearer abc123...
```

**Query params:**

| Param | Tipo | Descrição |
|---|---|---|
| `count` | int | default 10 |
| `page` | int | default 1 |
| `categories[]` | int[] | 1-7 |
| `filters[]` | string[] | `crc` (apenas trilhas com cursos CRC) |

**Resposta 200:**

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 10,
      "user": { "id": 10, "name": "CEFIS", "avatar": "https://..." },
      "name": "Trilha de Direito Civil",
      "description": "Descrição da trilha",
      "banner": "https://...",
      "public": true,
      "shared_team": false,
      "course_count": 5,
      "duration": 18000,
      "following": false,
      "categories": [1, 3],
      "rating": 4.7,
      "created_at": "2025-01-10T10:00:00.000Z",
      "updated_at": "2025-06-01T12:00:00.000Z"
    }
  ],
  "pagination": { "totalItems": 32, "perPage": 10, "currentPage": 1, "lastPage": 4 }
}
```

### GET `/tracks/:id` — detalhes com lista de cursos

```http
GET /tracks/1
Authorization: Bearer abc123...
```

**Resposta 200** — `courses[]` contém cursos ordenados por posição, cada um com `progress`, `teacher`, `trailer`, `crcScore`.

**Por que isso importa para nós:**

A CEFIS **já tem trilhas curadas por especialistas humanos**. Para o Bússola:

1. **Modo "Trilha CEFIS"** — o aluno pode adotar uma trilha pronta como ponto de partida
2. **Modo "Bússola personalizada"** — geramos plano sob medida (nossa diferenciação)
3. **Modo híbrido (melhor)** — usamos trilhas relevantes como **inspiração de ordem** e personalizamos com base no perfil

**Pitch insight:** mostrar lado a lado "Trilha CEFIS genérica" vs "Plano Bússola para Maria" é uma **demonstração visual incrível** do valor da personalização.

---

## 4. Progresso do Aluno

### GET `/performance/certificates` — certificados conquistados

```http
GET /performance/certificates?page=1&count=10&orderByAccuracy=DESC
Authorization: Bearer abc123...
```

**Query params:**

| Param | Tipo | Descrição |
|---|---|---|
| `count` | int | default 10 |
| `page` | int | default 1 |
| `search` | string | filtra por título do curso |
| `startDate` / `endDate` | ISO 8601 | intervalo de emissão |
| `orderByAccuracy` | enum | `ASC` \| `DESC` (aplica só na página atual) |
| `crc` | bool | apenas com pontuação CRC |

**Resposta 200:**

```json
{
  "data": [
    {
      "idCertificate": 123,
      "hashCertificate": "abc123xyz",
      "courseId": 42,
      "course": {
        "id": 42,
        "title": "Nome do Curso",
        "banner": "https://...",
        "crcScore": { "id": 5, "crc_score": 8.5 },
        "courseAvailable": true
      },
      "certificateTotalQuestions": 10,
      "certificateTotalCorrectAnswers": 8,
      "accuracy": 80,
      "certificateUrl": "https://...",
      "createdAt": "2026-01-10T14:30:00.000Z",
      "crcSentAt": null
    }
  ],
  "pagination": { "totalItems": 45, "perPage": 10, "currentPage": 1, "lastPage": 5 }
}
```

**Use `accuracy` para o diagnóstico** — se aluno já tem certificado com 90% em "SQL básico", **não pergunta de novo no quiz**. Pula direto para SQL avançado.

---

## 5. Transcrições para RAG

**Link oficial:** `https://drive.google.com/file/d/1FQ5grEzobP26ipRwKzq0A4kkeJ7jWs7-/view?usp=sharing`

**Formato:** ZIP com transcrições estruturadas de todas as aulas.

**🚨 PRIORIDADE MÁXIMA NO INÍCIO DO DIA:**

A própria doc oficial diz:

> "Indexar as transcrições localmente é o passo mais demorado. **Comece por isso logo no início do hackathon** enquanto o restante do time estrutura a interface."

**Estratégia:**
1. Baixar ZIP nos primeiros 10 min
2. Subir script de ingestão **antes** de começar UI
3. Esse processo pode levar 30-60 min para milhares de aulas (embed → pgvector)
4. Roda em background enquanto o time desenvolve

---

## 6. Cliente TypeScript pronto

Cole em `lib/cefis.ts` no início do dia:

```typescript
// lib/cefis.ts
const V1_BASE = 'https://cefis.com.br';
const V3_BASE = 'https://api-v3.cefis.com.br';

export class CefisClient {
  constructor(private apiKey: string | null = null) {}

  // ──────────────────────────────────────────────────
  // AUTH
  // ──────────────────────────────────────────────────

  async login(email: string, pass: string) {
    const res = await fetch(`${V1_BASE}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, pass }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const json = await res.json();
    this.apiKey = json.data.key;
    return json.data;
  }

  async me() {
    return this.callV1('GET', '/api/v1/user/me');
  }

  // ──────────────────────────────────────────────────
  // CATÁLOGO
  // ──────────────────────────────────────────────────

  async listCourses(params: {
    page?: number;
    count?: number;
    order?: 'launchDate' | 'title' | 'averageRating';
    orderDirection?: 'asc' | 'desc';
    search?: string;
    categories?: number[];
    filter?: Array<'quick' | 'new' | 'scored_crc'>;
    status?: Array<'todo' | 'doing' | 'done'>;
  } = {}) {
    return this.callV3('GET', '/courses', null, params);
  }

  async getCourse(id: number) {
    return this.callV3('GET', `/courses/${id}`);
  }

  async listLessons(courseId: number) {
    return this.callV3('GET', `/courses/${courseId}/lessons`);
  }

  // ──────────────────────────────────────────────────
  // TRILHAS
  // ──────────────────────────────────────────────────

  async listTracks(params: {
    page?: number;
    count?: number;
    categories?: number[];
    filters?: string[];
  } = {}) {
    return this.callV3('GET', '/tracks', null, params);
  }

  async getTrack(id: number) {
    return this.callV3('GET', `/tracks/${id}`);
  }

  // ──────────────────────────────────────────────────
  // PROGRESSO
  // ──────────────────────────────────────────────────

  async listCertificates(params: {
    page?: number;
    count?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    orderByAccuracy?: 'ASC' | 'DESC';
    crc?: boolean;
  } = {}) {
    return this.callV3('GET', '/performance/certificates', null, params);
  }

  // ──────────────────────────────────────────────────
  // LOWER LEVEL
  // ──────────────────────────────────────────────────

  private async callV1(method: string, path: string, body?: unknown) {
    if (!this.apiKey) throw new Error('Not authenticated');
    const res = await fetch(`${V1_BASE}${path}`, {
      method,
      headers: {
        Authorization: this.apiKey,  // sem Bearer na v1
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await this.makeError(res);
    return (await res.json()).data;
  }

  private async callV3(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>
  ) {
    if (!this.apiKey) throw new Error('Not authenticated');
    const url = new URL(`${V3_BASE}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          v.forEach(item => url.searchParams.append(`${k}[]`, String(item)));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,   // COM Bearer na v3
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await this.makeError(res);
    return await res.json();  // v3 retorna { data, pagination } direto
  }

  private async makeError(res: Response) {
    const body = await res.text();
    return new Error(`CEFIS ${res.status}: ${body}`);
  }
}

// Singleton com chave do .env
export const cefis = new CefisClient(process.env.CEFIS_API_KEY ?? null);
```

**Uso:**

```typescript
// Para o backend (server-only)
import { cefis } from '@/lib/cefis';

const courses = await cefis.listCourses({ search: 'SQL', count: 5 });
const lessons = await cefis.listLessons(42);
const me = await cefis.me();
const certs = await cefis.listCertificates({ orderByAccuracy: 'DESC' });
```

---

## 7. Estratégia de uso por feature do Bússola

### Onboarding
- **Login real**: `POST /api/v1/login` → salva `key` em sessão
- **Pré-popular perfil**: `GET /api/v1/user/me` → preenche nome, ocupação, atividades, cidade
- **Pré-popular skill assessment**: `GET /performance/certificates` → se aluno já tem certificados com alta accuracy, marca como `domina` antes de perguntar

### Diagnóstico
- Carrega certificados existentes → não pergunta sobre skills já provadas
- Foca quiz nas lacunas

### Curador (geração de plano)
- **Etapa 1 — RAG nas transcrições** já indexadas no nosso pgvector → encontra lições relevantes
- **Etapa 2 — Cruzar com `/tracks`** → checa se existe uma trilha pronta da CEFIS que cobre o tópico (acelera plano + dá credibilidade)
- **Etapa 3 — Listar cursos com `GET /courses?search=...&filter[]=quick`** para "tenho 10 min" (filter `quick` retorna cursos &lt;1h)
- **Etapa 4 — Para gaps não cobertos pelo catálogo**: gera conteúdo (PDF/podcast)

### Tutor
- RAG sobre transcrições → resposta + citação
- Cada citação inclui `course_id` e `lesson_id` → link no formato `https://cefis.com.br/curso/{id}` (verificar formato real)
- Botão "Continuar a aula" — usa `GET /courses/:id/lessons` para pegar `stream_sources[0].link_secure` e `progress.lastSecond`

### Acompanhamento
- Sincroniza progresso a cada visita: `GET /courses/:id/lessons` retorna `progress.seconds`, `percentage`
- Certificados conquistados via `/performance/certificates`
- Coach usa esses dados para gerar mensagem ("você concluiu 2 cursos esta semana, parabéns")

### Player de vídeo (opcional, ganha pontos de UX)
- `stream_sources[].link_secure` é o vídeo direto
- Salve `currentTime` localmente, comece em `progress.lastSecond` quando retomar
- Para hackathon, não precisamos chamar endpoint para "salvar progresso" (a doc oficial não expõe esse endpoint) — apenas LEITURA do progresso

---

## 8. Categorias da plataforma (1-7)

A doc não detalha o mapeamento de category_id → label. **Descubra on-the-fly** chamando `GET /courses` e agrupando por `categories[]`. Provavelmente algo como:

| ID | Provável (a confirmar) |
|---|---|
| 1 | Direito |
| 2 | Contabilidade |
| 3 | Tributário |
| 4 | Trabalhista |
| 5 | OAB |
| 6 | Concursos |
| 7 | Outros |

> ⚠️ **Importante:** A CEFIS é forte em **direito, contabilidade, tributário, OAB, concursos**. Isso muda a persona da demo: nossa **Maria** virou um(a) profissional querendo passar na OAB / concurso público / migrar para análise tributária — não análise de dados em geral.

### Personas atualizadas

- **João, 28, advogado júnior** — quer passar na OAB em 6 meses
- **Marina, 35, contadora** — quer dominar tributário para escritório próprio
- **Carlos, 24, estagiário** — quer entender direito trabalhista para concurso

Toda a UX e copy deve refletir esse contexto.

---

## 9. Rate limiting e erros

| Código | Significado |
|---|---|
| `200` | OK |
| `400` | Body/query inválido |
| `401` | Token ausente/inválido/expirado |
| `403` | Sem permissão |
| `404` | Recurso não existe |
| `422` | Formato OK mas semanticamente inválido |
| `429` | **Rate limit — aguardar e tentar novamente** |
| `500` | Erro inesperado |

**Formato do erro:**

```json
{
  "error": "unauthorized",
  "message": "Token inválido ou expirado.",
  "status": 401
}
```

**Implementar:**

```typescript
// utility com backoff
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err);
      const is429 = msg.includes('429');
      const is5xx = msg.match(/CEFIS 5\d\d/);
      if ((is429 || is5xx) && i < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}
```

---

## 10. Setup de credenciais para o hackathon

### Opção A — Conta de demo do time

1. Cada membro cria uma conta em `cefis.com.br`
2. **Um dos membros** faz `POST /login` no início do dia, copia a `key`
3. Salva em `.env.local`:
   ```
   CEFIS_API_KEY=abc123...
   ```
4. Backend usa essa key para todos os calls

**Vantagem:** todos veem o mesmo perfil de "aluno demo".
**Desvantagem:** uma conta única para times — se rate limit bater, todo mundo para.

### Opção B — Login real no Bússola (recomendado)

1. Tela `/login` do Bússola pede email + senha CEFIS
2. POST `/api/v1/login` → guarda `key` em cookie HttpOnly + session
3. Cada aluno do hackathon usa **sua própria conta** CEFIS
4. Personalização real desde o segundo 1

**Vantagem:** demo mostra integração completa com auth real.
**Desvantagem:** depende de o aluno ter conta (criar é rápido — gratuito).

**Decisão recomendada:** **Opção B** com fallback para conta demo do time (`.env`) se o usuário não quiser logar.

```tsx
// app/login/page.tsx
'use client';
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/cefis-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass }),
    });
    if (!res.ok) return toast.error('Login falhou');
    location.href = '/onboarding';
  };

  return (
    <form onSubmit={handle} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Entrar na Bússola</h1>
      <p className="text-sm text-muted-foreground">Use suas credenciais da CEFIS</p>

      <input type="email" placeholder="E-mail ou CPF" value={email}
             onChange={e => setEmail(e.target.value)} className="..." />
      <input type="password" placeholder="Senha" value={pass}
             onChange={e => setPass(e.target.value)} className="..." />

      <button type="submit" className="...">Entrar</button>

      <p className="text-xs text-muted-foreground">
        Não tem conta? <a href="https://cefis.com.br" target="_blank">Criar grátis</a>
      </p>
    </form>
  );
}
```

```typescript
// app/api/auth/cefis-login/route.ts
import { cookies } from 'next/headers';
import { CefisClient } from '@/lib/cefis';

export async function POST(req: Request) {
  const { email, pass } = await req.json();
  const client = new CefisClient();
  const data = await client.login(email, pass);

  // Persist key in HttpOnly cookie
  cookies().set('cefis_key', data.key, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,  // 1 ano (key não expira)
  });

  // Save user reference in our DB
  await supabase.from('users').upsert({
    cefis_user_id: data.user.id,
    email: data.user.email,
    name: data.user.name,
    avatar: data.user.avatar,
    is_premium: data.user.is_premium,
  });

  return Response.json({ ok: true, user: data.user });
}
```

```typescript
// lib/cefis-server.ts (server-side helper)
import { cookies } from 'next/headers';
import { CefisClient } from './cefis';

export async function getCefisClient(): Promise<CefisClient> {
  const key = cookies().get('cefis_key')?.value
    ?? process.env.CEFIS_DEMO_API_KEY;
  if (!key) throw new Error('NOT_AUTHENTICATED');
  return new CefisClient(key);
}
```

---

## 11. Script de ingestão do ZIP de transcrições

**Rode logo na primeira hora** — leva 30-60 min para concluir.

```typescript
// scripts/ingest-transcriptions.ts
import fs from 'fs/promises';
import path from 'path';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

interface TranscriptionFile {
  course_id: number;
  course_title: string;
  lesson_id: number;
  lesson_title: string;
  content: string;          // ou structure depends on actual format
  duration?: number;
}

async function main() {
  const dir = './data/transcricoes';  // extracted from zip
  const files = await fs.readdir(dir);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const raw = await fs.readFile(path.join(dir, file), 'utf-8');
    const data = JSON.parse(raw) as TranscriptionFile | TranscriptionFile[];
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      await ingestOne(item);
    }
  }
}

async function ingestOne(item: TranscriptionFile) {
  // 1. Upsert course
  await supabase.from('cefis_courses').upsert({
    id: item.course_id,
    title: item.course_title,
  }, { onConflict: 'id' });

  // 2. Upsert lesson
  await supabase.from('cefis_lessons').upsert({
    id: item.lesson_id,
    course_id: item.course_id,
    title: item.lesson_title,
    content: item.content,
    duration_minutes: item.duration ? Math.round(item.duration / 60) : null,
  }, { onConflict: 'id' });

  // 3. Chunk content
  const chunks = chunkText(item.content, { size: 800, overlap: 200 });
  if (chunks.length === 0) return;

  // 4. Batch embeddings
  const embedRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  // 5. Insert embeddings (delete old first to allow re-runs)
  await supabase.from('cefis_lesson_embeddings').delete().eq('lesson_id', item.lesson_id);
  await supabase.from('cefis_lesson_embeddings').insert(
    chunks.map((chunk, i) => ({
      lesson_id: item.lesson_id,
      chunk_index: i,
      chunk_text: chunk,
      embedding: embedRes.data[i].embedding,
    }))
  );

  console.log(`[${item.course_id}] ${item.lesson_title} — ${chunks.length} chunks`);
}

function chunkText(text: string, { size, overlap }: { size: number; overlap: number }): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

main().catch(err => { console.error(err); process.exit(1); });
```

**Rodar:**

```bash
# baixar ZIP via UI (Drive link)
unzip transcricoes.zip -d data/transcricoes
npx tsx scripts/ingest-transcriptions.ts
```

> ⚠️ **Faça isso em paralelo com setup do projeto**. Não bloqueie o time esperando ingestão terminar.

---

## 12. RPC e schema atualizado

Atualização do schema RAG para refletir IDs da CEFIS (use `integer` em vez de `uuid`):

```sql
-- Tabela de cursos espelhada (read-only cache local)
CREATE TABLE cefis_courses (
  id integer PRIMARY KEY,           -- ID real da CEFIS
  title text NOT NULL,
  subtitle text,
  summary text,
  banner text,
  duration int,
  keywords text,
  category_ids int[],
  average_rating numeric,
  cefis_url text,                   -- link público (descobrir formato)
  last_synced_at timestamptz DEFAULT now()
);

CREATE TABLE cefis_lessons (
  id integer PRIMARY KEY,           -- ID real da CEFIS
  course_id integer REFERENCES cefis_courses(id),
  title text NOT NULL,
  content text NOT NULL,            -- transcrição
  duration_minutes int,
  position int,
  cefis_url text,
  last_synced_at timestamptz DEFAULT now()
);

CREATE TABLE cefis_lesson_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id integer REFERENCES cefis_lessons(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_lesson_emb ON cefis_lesson_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RPC de busca com mais info para citação
CREATE OR REPLACE FUNCTION match_lessons(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  lesson_id integer,
  course_id integer,
  course_title text,
  lesson_title text,
  chunk_text text,
  similarity float,
  cefis_url text
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.lesson_id,
    l.course_id,
    c.title AS course_title,
    l.title AS lesson_title,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    l.cefis_url
  FROM cefis_lesson_embeddings e
  JOIN cefis_lessons l ON l.id = e.lesson_id
  JOIN cefis_courses c ON c.id = l.course_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## 13. Checklist antes da apresentação

- [ ] `.env.local` com `CEFIS_DEMO_API_KEY` (fallback)
- [ ] `lib/cefis.ts` testado contra os 6 endpoints
- [ ] Transcrições ingeridas (`SELECT count(*) FROM cefis_lesson_embeddings` > 1000)
- [ ] Login real funcionando (`/login` → /onboarding)
- [ ] `/me` pré-populando perfil
- [ ] Tutor cita aulas com link real (formato confirmado)
- [ ] Player de vídeo abre com `stream_sources[0].link_secure`
- [ ] Certificados aparecem em `/dashboard` (se sobrar tempo)

---

**Próximo:** [arquitetura.md](./arquitetura.md) (atualizada para usar API real) · [roadmap-dia.md](./roadmap-dia.md) (com ingestão na hora 0) · [pitch-banca.md](./pitch-banca.md) (com integração real para destacar).
