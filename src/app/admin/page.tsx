"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackToHome } from "@/components/back-to-home";

interface SettingsView {
  openai_api_key: string | null;
  openrouter_api_key: string | null;
  google_api_key: string | null;
  cefis_demo_api_key: string | null;
  chat_model: string;
  embedding_model: string;
  tts_voice_ana: string;
  tts_voice_bruno: string;
  tts_voice_tutor: string;
  whisper_model: string;
  rag_match_threshold: number;
  rag_top_k: number;
  evolution_api_url: string | null;
  evolution_api_key: string | null;
  evolution_instance: string | null;
  evolution_bot_phone: string | null;
  evolution_webhook_secret: string | null;
  _hasOpenAI: boolean;
  _hasOpenRouter: boolean;
  _hasGoogle: boolean;
  _hasCefisDemo: boolean;
  _hasEvolutionKey: boolean;
  _hasEvolutionSecret: boolean;
  _hasEvolutionConfig: boolean;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [settings, setSettings] = useState<SettingsView | null>(null);
  // Inputs em branco = manter o valor atual; preencher = substituir
  const [openaiInput, setOpenaiInput] = useState("");
  const [openrouterInput, setOpenrouterInput] = useState("");
  const [googleInput, setGoogleInput] = useState("");
  const [cefisInput, setCefisInput] = useState("");
  const [chatModel, setChatModel] = useState("gpt-4o-mini");
  const [embeddingModel, setEmbeddingModel] = useState("text-embedding-3-small");
  const [whisperModel, setWhisperModel] = useState("whisper-1");
  const [threshold, setThreshold] = useState(0.7);
  const [topK, setTopK] = useState(5);
  // Evolution
  const [evoUrl, setEvoUrl] = useState("");
  const [evoKeyInput, setEvoKeyInput] = useState("");
  const [evoInstance, setEvoInstance] = useState("");
  const [evoBotPhone, setEvoBotPhone] = useState("");
  const [evoSecretInput, setEvoSecretInput] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"settings" | "analytics">("settings");

  async function loadSettings(pwd: string) {
    setError(null);
    const res = await fetch("/api/admin/settings", { headers: { "x-admin-password": pwd } });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erro desconhecido" }));
      setError(j.error || `Erro ${res.status}`);
      return false;
    }
    const data: SettingsView = await res.json();
    setSettings(data);
    setChatModel(data.chat_model);
    setEmbeddingModel(data.embedding_model);
    setWhisperModel(data.whisper_model);
    setThreshold(data.rag_match_threshold);
    setTopK(data.rag_top_k);
    setEvoUrl(data.evolution_api_url ?? "");
    setEvoInstance(data.evolution_instance ?? "");
    setEvoBotPhone(data.evolution_bot_phone ?? "");
    return true;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const ok = await loadSettings(password);
    if (ok) {
      setAuthed(true);
      sessionStorage.setItem("admin_pwd", password);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const body: Record<string, unknown> = {
      chat_model: chatModel,
      embedding_model: embeddingModel,
      whisper_model: whisperModel,
      rag_match_threshold: threshold,
      rag_top_k: topK,
      evolution_api_url: evoUrl || null,
      evolution_instance: evoInstance || null,
      evolution_bot_phone: evoBotPhone || null,
    };
    if (openaiInput.trim()) body.openai_api_key = openaiInput.trim();
    if (openrouterInput.trim()) body.openrouter_api_key = openrouterInput.trim();
    if (googleInput.trim()) body.google_api_key = googleInput.trim();
    if (cefisInput.trim()) body.cefis_demo_api_key = cefisInput.trim();
    if (evoKeyInput.trim()) body.evolution_api_key = evoKeyInput.trim();
    if (evoSecretInput.trim()) body.evolution_webhook_secret = evoSecretInput.trim();

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erro" }));
      setError(j.error || `Erro ${res.status}`);
    } else {
      setMessage("Configurações salvas.");
      setOpenaiInput("");
      setOpenrouterInput("");
      setGoogleInput("");
      setCefisInput("");
      setEvoKeyInput("");
      setEvoSecretInput("");
      await loadSettings(password);
    }
    setLoading(false);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_pwd");
    if (saved) {
      setPassword(saved);
      loadSettings(saved).then((ok) => {
        if (ok) setAuthed(true);
      });
    }
  }, []);

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-stretch justify-center gap-4 p-6">
        <div>
          <BackToHome variant="pill" />
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>🧭 Bússola — Admin</CardTitle>
            <CardDescription>Backoffice de configuração de credenciais e modelos.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pwd">Senha do admin</Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <p className="text-xs text-zinc-500">
                  Definida em <code>ADMIN_PASSWORD</code> no <code>.env.local</code>.
                </p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Verificando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <BackToHome variant="pill" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🧭 Bússola — Admin</h1>
          <p className="text-sm text-zinc-500">Credenciais, parâmetros e acessos do produto.</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            sessionStorage.removeItem("admin_pwd");
            setAuthed(false);
            setSettings(null);
            setPassword("");
          }}
        >
          Sair
        </Button>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("settings")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "settings"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          Configurações
        </button>
        <button
          type="button"
          onClick={() => setTab("analytics")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "analytics"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          Acessos · Analytics
        </button>
      </div>

      {tab === "analytics" ? (
        <AnalyticsPanel password={password} />
      ) : (
      <form onSubmit={handleSave} className="space-y-6">
        {/* Providers IA + CEFIS */}
        <Card>
          <CardHeader>
            <CardTitle>Providers de IA & CEFIS</CardTitle>
            <CardDescription>
              Chat usa <strong>OpenRouter</strong> primeiro; se falhar, cai pra OpenAI direto.
              Embeddings e Whisper (áudio → texto) sempre vão direto na OpenAI — OpenRouter
              não cobre esses endpoints. Chaves vivem no banco e são mascaradas; deixe em branco
              para manter o valor atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openrouter">OpenRouter API Key (primário p/ chat)</Label>
              <Input
                id="openrouter"
                type="password"
                placeholder={
                  settings?._hasOpenRouter
                    ? `Atual: ${settings.openrouter_api_key}`
                    : "sk-or-v1-..."
                }
                value={openrouterInput}
                onChange={(e) => setOpenrouterInput(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                {settings?._hasOpenRouter ? "✓ configurada" : "✗ não configurada"} — fallback automático
                via env <code>OPENROUTER_API_KEY</code> se vazia aqui.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="google">Google API Key (embeddings via Gemini)</Label>
              <Input
                id="google"
                type="password"
                placeholder={
                  settings?._hasGoogle ? `Atual: ${settings.google_api_key}` : "AIza..."
                }
                value={googleInput}
                onChange={(e) => setGoogleInput(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                {settings?._hasGoogle ? "✓ configurada" : "✗ não configurada"} — quando
                presente, embeddings vão pro Google (<code>gemini-embedding-001</code>,{" "}
                <code>outputDimensionality=1536</code>). <strong>Não misture providers</strong> —
                vectors da Google não são comparáveis com os da OpenAI; trocar = re-ingerir.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openai">OpenAI API Key (fallback de chat + Whisper + embeddings)</Label>
              <Input
                id="openai"
                type="password"
                placeholder={settings?._hasOpenAI ? `Atual: ${settings.openai_api_key}` : "sk-..."}
                value={openaiInput}
                onChange={(e) => setOpenaiInput(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                {settings?._hasOpenAI ? "✓ configurada" : "✗ não configurada"} — sempre obrigatória
                para Whisper (áudio → texto). Para embeddings só é usada se Google não estiver
                configurada acima.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cefis">CEFIS — API Key demo (fallback)</Label>
              <Input
                id="cefis"
                type="password"
                placeholder={
                  settings?._hasCefisDemo ? `Atual: ${settings.cefis_demo_api_key}` : "chave demo"
                }
                value={cefisInput}
                onChange={(e) => setCefisInput(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                Usada quando aluno não fez login real.{" "}
                {settings?._hasCefisDemo ? "✓ configurada" : "✗ não configurada"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Modelos */}
        <Card>
          <CardHeader>
            <CardTitle>Modelos & RAG</CardTitle>
            <CardDescription>Pode ser ajustado ao vivo durante a demo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chat">Modelo de chat</Label>
                <Input id="chat" value={chatModel} onChange={(e) => setChatModel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emb">Modelo de embedding</Label>
                <Input
                  id="emb"
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whisper">Modelo Whisper (áudio→texto)</Label>
                <Input
                  id="whisper"
                  value={whisperModel}
                  onChange={(e) => setWhisperModel(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="thr">RAG match threshold</Label>
                <Input
                  id="thr"
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="k">RAG top K</Label>
                <Input
                  id="k"
                  type="number"
                  min="1"
                  max="20"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evolution / WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp (Evolution API v2)</CardTitle>
            <CardDescription>
              Para o tutor conversacional via zap. Configure a URL do seu webhook na Evolution
              como{" "}
              <code>https://&lt;seu-domínio&gt;/api/whatsapp/webhook?secret=&lt;seu-secret&gt;</code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evo-url">URL base da Evolution</Label>
                <Input
                  id="evo-url"
                  value={evoUrl}
                  onChange={(e) => setEvoUrl(e.target.value)}
                  placeholder="https://evolution.seu-dominio.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evo-inst">Nome da instância</Label>
                <Input
                  id="evo-inst"
                  value={evoInstance}
                  onChange={(e) => setEvoInstance(e.target.value)}
                  placeholder="bussola-bot"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evo-key">apikey da instância</Label>
              <Input
                id="evo-key"
                type="password"
                value={evoKeyInput}
                onChange={(e) => setEvoKeyInput(e.target.value)}
                placeholder={
                  settings?._hasEvolutionKey ? `Atual: ${settings.evolution_api_key}` : "apikey..."
                }
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                {settings?._hasEvolutionKey ? "✓ configurada" : "✗ não configurada"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evo-phone">Número do bot (E.164 sem +)</Label>
                <Input
                  id="evo-phone"
                  value={evoBotPhone}
                  onChange={(e) => setEvoBotPhone(e.target.value)}
                  placeholder="5511999999999"
                />
                <p className="text-xs text-zinc-500">
                  Número da instância Evolution que envia as mensagens. O usuário não vê
                  esse número diretamente — o convite é disparado pelo botão{" "}
                  <strong>Receber no WhatsApp</strong> dentro do app.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evo-secret">Webhook secret</Label>
                <Input
                  id="evo-secret"
                  type="password"
                  value={evoSecretInput}
                  onChange={(e) => setEvoSecretInput(e.target.value)}
                  placeholder={
                    settings?._hasEvolutionSecret
                      ? `Atual: ${settings.evolution_webhook_secret}`
                      : "string longa e aleatória"
                  }
                  autoComplete="off"
                />
                <p className="text-xs text-zinc-500">
                  {settings?._hasEvolutionSecret ? "✓ configurado" : "✗ não configurado"} — exigido
                  para aceitar webhooks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// AnalyticsPanel — mostra agregados de /api/analytics/stats
// ────────────────────────────────────────────────────────────────────

interface StatsResponse {
  totals: {
    sessions: number;
    anonymous: number;
    identified: number;
    distinctEmails: number;
    distinctPhones: number;
    events: number;
  };
  topPaths: Array<{ path: string; count: number }>;
  recentIdentified: Array<{
    session_id: string;
    user_id: string | null;
    email: string | null;
    phone: string | null;
    pageViews: number;
    paths: string[];
    firstSeen: string;
    lastSeen: string;
  }>;
}

function AnalyticsPanel({ password }: { password: string }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/stats", {
        headers: { "x-admin-password": password },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `Erro ${res.status}`);
      setData(j as StatsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Cobertura: últimos ~5000 eventos. Atualizado sob demanda.
        </p>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Totais</CardTitle>
              <CardDescription>
                Cada sessão é um cookie (90 dias). &quot;Identificada&quot; = entrou com CEFIS,
                informou e-mail ou telefone no onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Sessões" value={data.totals.sessions} />
                <Stat label="Identificadas" value={data.totals.identified} accent="emerald" />
                <Stat label="Anônimas" value={data.totals.anonymous} />
                <Stat label="E-mails únicos" value={data.totals.distinctEmails} />
                <Stat label="Telefones únicos" value={data.totals.distinctPhones} />
                <Stat label="Eventos totais" value={data.totals.events} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Páginas mais acessadas</CardTitle>
              <CardDescription>Top 12 por número de page views.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topPaths.length === 0 ? (
                <p className="text-sm text-zinc-500">Nada por enquanto.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.topPaths.map((p) => (
                    <li key={p.path} className="flex items-center justify-between py-2 text-sm">
                      <code className="truncate font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {p.path}
                      </code>
                      <span className="ml-3 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {p.count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessões identificadas recentes</CardTitle>
              <CardDescription>
                Últimas 25 sessões que entraram com CEFIS ou informaram contato.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.recentIdentified.length === 0 ? (
                <p className="text-sm text-zinc-500">Nada por enquanto.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="py-2 pr-3">Quem</th>
                      <th className="py-2 pr-3">Páginas</th>
                      <th className="py-2 pr-3">Últ. visita</th>
                      <th className="py-2 pr-3">Caminho recente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.recentIdentified.map((s) => (
                      <tr key={s.session_id} className="align-top">
                        <td className="py-2 pr-3">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {s.email ?? s.phone ?? s.user_id?.slice(0, 8) ?? "—"}
                          </div>
                          {s.email && s.phone && (
                            <div className="text-[10px] text-zinc-500">{s.phone}</div>
                          )}
                          {s.user_id && (
                            <div className="text-[10px] text-zinc-400">
                              user {s.user_id.slice(0, 8)}…
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-3 font-mono">{s.pageViews}</td>
                        <td className="py-2 pr-3 text-zinc-600 dark:text-zinc-400">
                          {formatRelative(s.lastSeen)}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {s.paths.slice(0, 4).map((p) => (
                              <code
                                key={p}
                                className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {p}
                              </code>
                            ))}
                            {s.paths.length > 4 && (
                              <span className="text-[10px] text-zinc-500">
                                +{s.paths.length - 4}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald";
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div
        className={`text-2xl font-bold tabular-nums ${
          accent === "emerald" ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {value.toLocaleString("pt-BR")}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function formatRelative(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s atrás`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
