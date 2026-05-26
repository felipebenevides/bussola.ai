// Cliente da API CEFIS (v1 + v3).
// IMPORTANTE: v1 usa "Authorization: {key}" sem prefixo Bearer.
//             v3 usa "Authorization: Bearer {key}".

const V1_BASE = "https://cefis.com.br";
const V3_BASE = "https://api-v3.cefis.com.br";

export interface CefisUser {
  id: number;
  name: string;
  first_name: string;
  email: string;
  avatar: string;
  profile?: string;
  birthdate?: string;
  occupation?: string;
  city?: string;
  state?: string;
  activities?: string[];
  is_premium?: boolean;
  is_admin?: boolean;
  is_teacher?: boolean;
}

export interface CefisLoginResponse {
  id: number;
  user_id: number;
  key: string;
  user: CefisUser;
}

export interface CefisCourse {
  id: number;
  title: string;
  subtitle?: string;
  summary?: string;
  banner?: string;
  goals?: string[];
  teacher?: { id: number; name: string; avatar?: string };
  duration?: number;
  keywords?: string;
  lessonCount?: number;
  materialCount?: number;
  categories?: number[];
  ratingQuantity?: number;
  averageRating?: number;
  practiceAverage?: number;
  watchLater?: boolean;
  progress?: { lessonId?: number; percentage?: number } | Record<string, never>;
}

export interface CefisStreamSource {
  quality: "sd" | "hd";
  type: string;
  link_secure: string;
  height: number;
}

export interface CefisLesson {
  id: number;
  title: string;
  position: number;
  duration: number;
  preview_url?: string | null;
  stream_sources: CefisStreamSource[];
  progress?: {
    id: number;
    seconds: number;
    percentage: number;
    lastSecond: number;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CefisTrack {
  id: number;
  user_id: number;
  user: { id: number; name: string; avatar?: string };
  name: string;
  description: string;
  banner?: string;
  public: boolean;
  course_count: number;
  duration: number;
  categories: number[];
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface CefisCertificate {
  idCertificate: number;
  hashCertificate: string;
  courseId: number;
  course: { id: number; title: string; banner?: string; courseAvailable: boolean };
  certificateTotalQuestions: number;
  certificateTotalCorrectAnswers: number;
  accuracy: number;
  certificateUrl: string;
  createdAt: string;
}

interface PagedV3<T> {
  data: T[];
  total?: number;
  pages?: number;
  page?: number;
  limit?: number;
  pagination?: { totalItems: number; perPage: number; currentPage: number; lastPage: number };
}

export class CefisClient {
  constructor(private apiKey: string | null = null) {}

  setKey(key: string) {
    this.apiKey = key;
  }

  hasKey() {
    return !!this.apiKey;
  }

  // ─── AUTH (v1) ─────────────────────────────────────

  async login(email: string, pass: string): Promise<CefisLoginResponse> {
    const res = await fetch(`${V1_BASE}/api/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, pass }),
    });
    if (!res.ok) {
      throw new Error(`CEFIS login failed (${res.status}): ${await res.text()}`);
    }
    const json = await res.json();
    this.apiKey = json.data.key;
    return json.data as CefisLoginResponse;
  }

  async me(): Promise<CefisUser> {
    const data = await this.callV1<{ data: CefisUser }>("GET", "/api/v1/user/me");
    return data.data;
  }

  // ─── CATÁLOGO (v3) ──────────────────────────────────

  async listCourses(params: {
    page?: number;
    count?: number;
    order?: "launchDate" | "title" | "averageRating";
    orderDirection?: "asc" | "desc";
    search?: string;
    categories?: number[];
    filter?: Array<"quick" | "new" | "scored_crc">;
    status?: Array<"todo" | "doing" | "done">;
  } = {}): Promise<PagedV3<CefisCourse>> {
    return this.callV3<PagedV3<CefisCourse>>("GET", "/courses", undefined, params);
  }

  async getCourse(id: number): Promise<{ data: CefisCourse }> {
    return this.callV3<{ data: CefisCourse }>("GET", `/courses/${id}`);
  }

  async listLessons(courseId: number): Promise<{ data: CefisLesson[] }> {
    return this.callV3<{ data: CefisLesson[] }>("GET", `/courses/${courseId}/lessons`);
  }

  // ─── TRILHAS (v3) ───────────────────────────────────

  async listTracks(params: {
    page?: number;
    count?: number;
    categories?: number[];
    filters?: string[];
  } = {}): Promise<PagedV3<CefisTrack>> {
    return this.callV3<PagedV3<CefisTrack>>("GET", "/tracks", undefined, params);
  }

  async getTrack(id: number): Promise<CefisTrack & { courses: CefisCourse[] }> {
    return this.callV3<CefisTrack & { courses: CefisCourse[] }>("GET", `/tracks/${id}`);
  }

  // ─── PROGRESSO (v3) ─────────────────────────────────

  async listCertificates(params: {
    page?: number;
    count?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    orderByAccuracy?: "ASC" | "DESC";
    crc?: boolean;
  } = {}): Promise<PagedV3<CefisCertificate>> {
    return this.callV3<PagedV3<CefisCertificate>>(
      "GET",
      "/performance/certificates",
      undefined,
      params
    );
  }

  // ─── BAIXO NÍVEL ────────────────────────────────────

  private async callV1<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.apiKey) throw new Error("CEFIS: não autenticado (v1)");
    const res = await fetch(`${V1_BASE}${path}`, {
      method,
      headers: {
        Authorization: this.apiKey, // sem Bearer na v1
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`CEFIS v1 ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  private async callV3<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, unknown>
  ): Promise<T> {
    if (!this.apiKey) throw new Error("CEFIS: não autenticado (v3)");
    const url = new URL(`${V3_BASE}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          v.forEach((item) => url.searchParams.append(`${k}[]`, String(item)));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }
    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`, // COM Bearer na v3
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`CEFIS v3 ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }
}

// Helper de retry com backoff exponencial para 429 / 5xx
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String(err);
      const isRetryable = /CEFIS (v[13]) (429|5\d\d)/.test(msg);
      if (!isRetryable || i === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw lastErr;
}
