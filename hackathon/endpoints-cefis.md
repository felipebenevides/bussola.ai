# Endpoints CEFIS — Referência Rápida

> Cheatsheet dos endpoints da plataforma CEFIS. Para detalhes de integração e estratégia de uso, ver [`integracao-cefis.md`](./integracao-cefis.md).
> Fonte: `CEFIS_Hackathon_Docs_Dev.pdf` (oficial).

---

## Índice

| # | Endpoint | Auth | API | Descrição |
|---|---|---|---|---|
| 1 | `POST /api/v1/login` | ✗ | v1 | Autentica e retorna API Key |
| 2 | `GET /api/v1/user/me` | ✓ | v1 | Dados do usuário autenticado |
| 3 | `GET /courses` | opcional | v3 | Lista paginada de cursos |
| 4 | `GET /courses/:id` | opcional | v3 | Detalhes de um curso |
| 5 | `GET /courses/:id/lessons` | opcional | v3 | Aulas de um curso (com vídeo + progresso) |
| 6 | `GET /tracks` | opcional | v3 | Lista paginada de trilhas |
| 7 | `GET /tracks/:id` | opcional | v3 | Detalhes de uma trilha com cursos |
| 8 | `GET /performance/certificates` | ✓ | v3 | Certificados do usuário autenticado |

---

## Bases das APIs

| API | Base URL | Header de Auth |
|---|---|---|
| **v1** | `https://cefis.com.br` | `Authorization: {key}` (**sem prefixo**) |
| **v3** | `https://api-v3.cefis.com.br` | `Authorization: Bearer {key}` (**com prefixo**) |

**Headers comuns (todas as requisições):**
```
Accept: application/json
Content-Type: application/json   (quando há body)
```

---

# 1. POST `/api/v1/login`

Autentica o usuário e retorna uma API Key de sessão. A key **não expira**.

### Request

```
POST https://cefis.com.br/api/v1/login
Content-Type: application/json
```

**Body:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `email` | string (≤100) | sim | E-mail ou CPF (apenas dígitos). Tenta email primeiro, depois CPF. |
| `pass` | string (≤100) | sim | Senha |

```json
{
  "email": "usuario@exemplo.com",
  "pass": "senha123"
}
```

### Response — 200 OK

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

### Erros

| Código | Causa |
|---|---|
| `400` | email/pass ausentes ou inválidos |
| `401` | credenciais incorretas |
| `500` | falha ao gerar key |

### curl

```bash
curl -X POST https://cefis.com.br/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@exemplo.com","pass":"senha123"}'
```

### fetch

```typescript
const res = await fetch('https://cefis.com.br/api/v1/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, pass }),
});
const { data } = await res.json();
const apiKey = data.key;
```

---

# 2. GET `/api/v1/user/me`

Dados completos do usuário da sessão atual.

### Request

```
GET https://cefis.com.br/api/v1/user/me
Authorization: {key}
Accept: application/json
```

### Response — 200 OK

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

### Erros

| Código | Causa |
|---|---|
| `401` | não autenticado |
| `500` | erro inesperado |

### curl

```bash
curl https://cefis.com.br/api/v1/user/me \
  -H "Authorization: abc123..." \
  -H "Accept: application/json"
```

### fetch

```typescript
const res = await fetch('https://cefis.com.br/api/v1/user/me', {
  headers: { Authorization: apiKey, Accept: 'application/json' },
});
const { data: user } = await res.json();
```

---

# 3. GET `/courses`

Lista paginada de cursos públicos. Cache Redis de 1h (ignorado quando `search` está presente).

### Request

```
GET https://api-v3.cefis.com.br/courses?...
Authorization: Bearer {key}     (opcional — se presente, retorna progress + watchLater)
Accept: application/json
```

### Query Parameters

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `count` | int | `10` | Itens por página |
| `page` | int | `1` | Página atual |
| `order` | enum | `launchDate` | `launchDate` \| `title` \| `averageRating` |
| `orderDirection` | enum | `desc` | `asc` \| `desc` |
| `search` | string | — | Busca em title, subtitle, id, keywords. **Ignora cache.** |
| `status[]` | enum[] | — | `todo` \| `doing` \| `done` |
| `categories[]` | int[] | — | IDs de categoria (1–7) |
| `filter[]` | enum[] | — | `quick` (&lt;1h), `new` (≤30d), `scored_crc` |

### Headers Opcionais

| Header | Valor | Efeito |
|---|---|---|
| `x-invalidate-cache` | `true` ou `1` | Força recarga do cache Redis |

### Response — 200 OK

```json
{
  "data": [
    {
      "id": 42,
      "title": "Nome do curso",
      "subtitle": "Subtítulo",
      "summary": "Resumo",
      "banner": "https://...",
      "goals": ["Objetivo 1"],
      "teacher": { "id": 7, "name": "Prof. João Silva" },
      "duration": 7200,
      "keywords": "keyword1;keyword2",
      "certificationThreshold": 70,
      "lessonCount": 12,
      "materialCount": 3,
      "categories": [1, 3],
      "ratingQuantity": 150,
      "averageRating": 4.7,
      "practiceAverage": 4.5,
      "trailer": { "id": 99, "url": "https://..." },
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

> `progress` e `watchLater` só aparecem se autenticado.

### curl

```bash
# básico
curl "https://api-v3.cefis.com.br/courses?page=1&count=10" \
  -H "Authorization: Bearer abc123..."

# com filtros
curl "https://api-v3.cefis.com.br/courses?search=tributario&filter[]=quick&categories[]=1" \
  -H "Authorization: Bearer abc123..."

# forçar invalidação do cache
curl "https://api-v3.cefis.com.br/courses" \
  -H "Authorization: Bearer abc123..." \
  -H "x-invalidate-cache: true"
```

### fetch

```typescript
const url = new URL('https://api-v3.cefis.com.br/courses');
url.searchParams.set('search', 'tributário');
url.searchParams.set('count', '20');
['quick'].forEach(f => url.searchParams.append('filter[]', f));
[1, 3].forEach(c => url.searchParams.append('categories[]', String(c)));

const res = await fetch(url, {
  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
});
const { data: courses, total, pages } = await res.json();
```

---

# 4. GET `/courses/:id`

Detalhes completos de um curso.

### Request

```
GET https://api-v3.cefis.com.br/courses/{id}
Authorization: Bearer {key}    (opcional)
```

### Path Parameters

| Param | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do curso |

### Response — 200 OK

```json
{
  "data": {
    "id": 42,
    "title": "Direito Tributário Avançado",
    "subtitle": "Para concursos e OAB",
    "summary": "Conteúdo completo de tributário...",
    "banner": "https://cefis.com.br/images/banner.jpg",
    "goals": ["Dominar o CTN"],
    "duration": 3600,
    "keywords": "tributário, impostos, concurso",
    "certificationThreshold": 70,
    "lessonCount": 48,
    "materialCount": 12,
    "hasMaterials": true,
    "categories": [1, 5],
    "ratingQuantity": 320,
    "averageRating": 4.8,
    "practiceAverage": 72.5,
    "crcActive": true,
    "crcCreditHours": 20,
    "launchDate": "2024-01-15T00:00:00.000Z",
    "recordedAt": "2023-12-01T00:00:00.000Z",
    "createdAt": "2023-11-20T10:00:00.000Z",
    "teacher": { "id": 7, "name": "Prof. João Silva" },
    "trailer": { "id": 99, "url": "https://..." },
    "crcScore": {
      "id": 1,
      "courseId": 42,
      "crcCode": "ABC123",
      "data": 85,
      "year": 2025
    },
    "watchLater": false,
    "progress": { "lessonId": 10, "percentage": 45 }
  }
}
```

### Erros

| Código | Causa |
|---|---|
| `401` | curso de organização sem permissão |
| `404` | curso não encontrado |

### curl

```bash
curl https://api-v3.cefis.com.br/courses/42 \
  -H "Authorization: Bearer abc123..."
```

---

# 5. GET `/courses/:id/lessons`

Aulas de um curso, ordenadas por posição. Inclui **fontes de vídeo** e (se autenticado) **progresso de cada aula**.

### Request

```
GET https://api-v3.cefis.com.br/courses/{id}/lessons
Authorization: Bearer {key}    (opcional)
```

### Path Parameters

| Param | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do curso |

### Response — 200 OK

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
        {
          "quality": "sd",
          "type": "video/mp4",
          "link_secure": "https://cdn.example.com/path/to/360.mp4",
          "height": 360
        },
        {
          "quality": "hd",
          "type": "video/mp4",
          "link_secure": "https://cdn.example.com/path/to/720.mp4",
          "height": 720
        }
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

### Campos — aula (data[])

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID da aula |
| `title` | string | Título |
| `position` | int | Ordem da aula no curso |
| `duration` | int | Duração em segundos |
| `preview_url` | string \| null | Thumbnail |
| `stream_sources` | array | Fontes de vídeo (ver abaixo) |
| `progress` | object \| null | Progresso do usuário (ausente se não autenticado) |

### Campos — stream_sources[]

| Campo | Tipo | Descrição |
|---|---|---|
| `quality` | `sd` \| `hd` | Qualidade |
| `type` | string | MIME type (`video/mp4`) |
| `link_secure` | string | URL do vídeo no CDN |
| `height` | int | `360` \| `480` \| `720` \| `1080`. Fallback 720p se nenhuma estiver disponível. |

### Campos — progress

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID do registro |
| `seconds` | int | Total assistido |
| `percentage` | int | 0–100 |
| `lastSecond` | int | **Último segundo assistido — use para retomar** |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601 |

### Comportamento

| Situação | Resultado |
|---|---|
| Curso `HIDDEN`/`SOON` sem autenticação | `[]` |
| Curso `HIDDEN`/`SOON` autenticado sem permissão | `[]` |
| Autenticado sem acesso ao curso | `401` |
| Curso não encontrado | `404` |

### curl

```bash
curl https://api-v3.cefis.com.br/courses/42/lessons \
  -H "Authorization: Bearer abc123..."
```

---

# 6. GET `/tracks`

Lista paginada de trilhas (study plans curados pela CEFIS).

### Request

```
GET https://api-v3.cefis.com.br/tracks?...
Authorization: Bearer {key}    (opcional)
```

### Query Parameters

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `count` | int | `10` | Itens por página |
| `page` | int | `1` | Página atual |
| `categories[]` | int[] | — | IDs (1–7) |
| `filters[]` | string[] | — | `crc` (só trilhas com cursos CRC) |

### Response — 200 OK

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
  "pagination": {
    "totalItems": 32,
    "perPage": 10,
    "currentPage": 1,
    "lastPage": 4
  }
}
```

### Campos — data[]

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int | ID da trilha |
| `user_id` | int | ID do criador |
| `user` | object | Criador (id, name, avatar) |
| `name` | string | Nome |
| `description` | string | Descrição |
| `banner` | string | URL |
| `public` | bool | Se é pública |
| `shared_team` | bool | Compartilhada com equipe |
| `course_count` | int | Quantos cursos |
| `duration` | int | Duração total (segundos) |
| `following` | bool | Se o usuário autenticado segue |
| `categories` | int[] | IDs de categoria |
| `rating` | number \| null | Avaliação média |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |

> O array `courses` **não** é retornado aqui. Para os cursos, use `GET /tracks/:id`.

### curl

```bash
curl "https://api-v3.cefis.com.br/tracks?categories[]=1&filters[]=crc" \
  -H "Authorization: Bearer abc123..."
```

---

# 7. GET `/tracks/:id`

Detalhes de uma trilha **com lista completa de cursos**.

### Request

```
GET https://api-v3.cefis.com.br/tracks/{id}
Authorization: Bearer {key}    (opcional — obrigatória se a trilha é privada)
```

### Path Parameters

| Param | Tipo | Descrição |
|---|---|---|
| `id` | int | ID da trilha |

### Response — 200 OK

```json
{
  "id": 1,
  "user_id": 10,
  "user": { "id": 10, "name": "CEFIS", "avatar": "https://..." },
  "name": "Trilha de Direito Civil",
  "description": "Descrição da trilha",
  "banner": "https://...",
  "public": true,
  "shared_team": false,
  "following": true,
  "categories": [1, 3],
  "rating": 4.7,
  "courses": [
    {
      "id": 42,
      "title": "Direito Civil I",
      "subtitle": "Parte geral",
      "duration": 7200,
      "lessonCount": 20,
      "materialCount": 3,
      "categories": [1],
      "watchLater": false,
      "averageRating": 4.8,
      "practiceAverage": 85.0,
      "crcActive": true,
      "crcCreditHours": 10,
      "teacher": { "id": 5, "name": "Prof. Fulano", "avatar": "https://..." },
      "progress": {
        "id": 99,
        "seconds": 3600,
        "percentage": 50,
        "completed": false,
        "completedAt": null,
        "updatedAt": "2026-05-01T10:00:00.000Z"
      }
    }
  ],
  "created_at": "2025-01-10T10:00:00.000Z",
  "updated_at": "2025-06-01T12:00:00.000Z"
}
```

### Campos extras vs `GET /tracks`

| Campo | Tipo | Descrição |
|---|---|---|
| `courses` | array | Cursos da trilha, ordenados por posição. Só inclui cursos `public`. |
| `courses[].progress` | object \| null | Progresso do usuário no curso |
| `courses[].teacher` | object \| null | Professor |
| `courses[].trailer` | object \| null | Trailer |
| `courses[].crcScore` | object \| null | CRC do ano de emissão |

### Regras de acesso

| Situação | Resultado |
|---|---|
| Trilha pública CEFIS | OK sem auth |
| Trilha privada sem auth | `401` |
| Trilha privada de outro usuário (sem shared_team) | `401` |
| Trilha não existe | `404` |

### curl

```bash
curl https://api-v3.cefis.com.br/tracks/1 \
  -H "Authorization: Bearer abc123..."
```

---

# 8. GET `/performance/certificates`

Certificados conquistados pelo usuário autenticado, ordenados por `createdAt DESC`.

### Request

```
GET https://api-v3.cefis.com.br/performance/certificates?...
Authorization: Bearer {key}    (obrigatório)
```

### Query Parameters

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `count` | int | `10` | Itens por página |
| `page` | int | `1` | Página atual |
| `search` | string | — | Filtra por título do curso |
| `startDate` | ISO date | — | Início do intervalo (00:00:00) |
| `endDate` | ISO date | — | Fim do intervalo (23:59:59) |
| `orderByAccuracy` | `ASC` \| `DESC` | — | Ordena por % de acerto (aplicado **após** paginação) |
| `crc` | bool | — | Só certificados com CRC no ano de emissão |

### Response — 200 OK

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
        "banner": "https://cdn.example.com/banner.jpg",
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
  "pagination": {
    "totalItems": 45,
    "perPage": 10,
    "currentPage": 1,
    "lastPage": 5
  }
}
```

### Campos — data[]

| Campo | Tipo | Descrição |
|---|---|---|
| `idCertificate` | int | ID |
| `hashCertificate` | string | Hash único |
| `courseId` | int | ID do curso |
| `course.id` | int | ID do curso |
| `course.title` | string | Título |
| `course.banner` | string | URL |
| `course.crcScore` | object \| null | CRC do ano (null se não houver) |
| `course.crcScore.id` | int | ID do registro CRC |
| `course.crcScore.crc_score` | number | Pontuação CRC |
| `course.courseAvailable` | bool | Curso público e não deletado |
| `certificateTotalQuestions` | int | Total respondidas |
| `certificateTotalCorrectAnswers` | int | Total acertadas |
| `accuracy` | number | % de acerto (0–100) |
| `certificateUrl` | string | URL para download |
| `createdAt` | string | ISO 8601 |
| `crcSentAt` | string \| null | Quando enviado ao CRC |

### Campos — pagination

| Campo | Tipo | Descrição |
|---|---|---|
| `totalItems` | int | Total |
| `perPage` | int | Por página |
| `currentPage` | int | Página atual |
| `lastPage` | int | Última página |

### curl

```bash
curl "https://api-v3.cefis.com.br/performance/certificates?orderByAccuracy=DESC&crc=true" \
  -H "Authorization: Bearer abc123..."
```

---

# Códigos de Erro (todos os endpoints)

| Código | Tipo | Significado |
|---|---|---|
| `200` | OK | Sucesso |
| `400` | Bad Request | Parâmetros inválidos/ausentes |
| `401` | Unauthorized | Token ausente/inválido/expirado |
| `403` | Forbidden | Sem permissão para o recurso |
| `404` | Not Found | Recurso não existe |
| `422` | Unprocessable Entity | Dados semanticamente inválidos |
| `429` | Too Many Requests | **Rate limit — aguardar e tentar novamente** |
| `500` | Internal Server Error | Erro inesperado |

### Formato do erro

```json
{
  "error": "unauthorized",
  "message": "Token inválido ou expirado.",
  "status": 401
}
```

---

# Arquivos para download (oficiais)

| Arquivo | Tipo | Link |
|---|---|---|
| `transcricoes.zip` | ZIP/JSON | [Drive — Transcrições completas das aulas](https://drive.google.com/file/d/1FQ5grEzobP26ipRwKzq0A4kkeJ7jWs7-/view?usp=sharing) |

> 💡 **Dica oficial da CEFIS:** "Indexar as transcrições localmente é o passo mais demorado. Comece por isso logo no início do hackathon enquanto o restante do time estrutura a interface."

---

# Padrões de uso (resumo prático)

| Quero... | Endpoint | Snippet |
|---|---|---|
| **Logar** | `POST /login` (v1) | `{ email, pass }` → `data.key` |
| **Saber quem é o usuário** | `GET /me` (v1) | header `Authorization: {key}` |
| **Listar cursos** | `GET /courses` (v3) | `?search=tributario&filter[]=quick` |
| **Detalhe de um curso** | `GET /courses/:id` (v3) | — |
| **Aulas + vídeo + onde parou** | `GET /courses/:id/lessons` (v3) | use `stream_sources[*].link_secure` e `progress.lastSecond` |
| **Trilhas curadas** | `GET /tracks` (v3) | filtro por `categories[]` |
| **Cursos de uma trilha** | `GET /tracks/:id` (v3) | retorna `courses[]` ordenados |
| **Histórico de certificados** | `GET /performance/certificates` (v3) | use `accuracy` para inferir domínio |

---

# Caveats (gotchas para não tropeçar)

1. **v1 vs v3 têm prefixos de auth diferentes** — `Authorization: {key}` vs `Authorization: Bearer {key}`. Centralize no cliente.

2. **Cache do `/courses` é agressivo (1h)** — adicione `x-invalidate-cache: true` se precisar de dados frescos. O parâmetro `search` ignora cache.

3. **Cursos `HIDDEN`/`SOON` retornam `[]` em `/lessons`**, não `404`. Trate como "sem aulas disponíveis" no UI.

4. **`progress` e `watchLater`** só aparecem quando autenticado. Code defensivamente.

5. **`stream_sources` tem fallback 720p** se nenhuma resolução estiver disponível. Sempre pegue a maior `height` que faça sentido.

6. **`orderByAccuracy` em `/certificates`** ordena **apenas a página atual**, não o total. Para top global, fetch tudo e ordene client-side.

7. **`/tracks` lista NÃO retorna `courses[]`** — só metadados. Use `/tracks/:id` para o conteúdo.

8. **Rate limit (429)** existe — implemente backoff exponencial (1s → 2s → 4s).

9. **API key não expira** — pode persistir indefinidamente (`maxAge` de 1 ano no cookie é seguro).

10. **`email` no login aceita CPF** (só dígitos). Útil se o usuário só lembrar do CPF.

---

**Relacionados:**
- [`integracao-cefis.md`](./integracao-cefis.md) — Cliente TypeScript pronto + estratégia de uso por feature
- [`arquitetura.md`](./arquitetura.md) — Como esses endpoints alimentam o RAG + agentes
