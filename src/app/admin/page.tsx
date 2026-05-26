"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsView {
  openai_api_key: string | null;
  openrouter_api_key: string | null;
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
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center p-6">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🧭 Bússola — Admin</h1>
          <p className="text-sm text-zinc-500">Credenciais e parâmetros do produto.</p>
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
              <Label htmlFor="openai">OpenAI API Key (fallback de chat + embeddings/Whisper)</Label>
              <Input
                id="openai"
                type="password"
                placeholder={settings?._hasOpenAI ? `Atual: ${settings.openai_api_key}` : "sk-..."}
                value={openaiInput}
                onChange={(e) => setOpenaiInput(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-500">
                {settings?._hasOpenAI ? "✓ configurada" : "✗ não configurada"} — obrigatória para
                embeddings/Whisper mesmo com OpenRouter ativo.
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
                  Aparece em <code>/conectar-whatsapp</code> como destino do código de pareamento.
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
    </div>
  );
}
