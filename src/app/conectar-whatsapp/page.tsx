"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LinkPayload {
  code: string;
  botPhone: string;
  expiresAt: string;
  ttlMinutes: number;
}

function formatPhone(phone: string): string {
  // 5511999999999 → "+55 11 99999-9999"
  if (phone.length === 13 && phone.startsWith("55")) {
    return `+55 ${phone.slice(2, 4)} ${phone.slice(4, 9)}-${phone.slice(9)}`;
  }
  return `+${phone}`;
}

export default function ConectarWhatsappPage() {
  const [payload, setPayload] = useState<LinkPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  async function requestCode() {
    setLoading(true);
    setError(null);
    setPayload(null);
    const res = await fetch("/api/whatsapp/link", { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erro" }));
      setError(j.error || `Erro ${res.status}`);
    } else {
      const data: LinkPayload = await res.json();
      setPayload(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!payload) return;
    const tick = () => {
      const left = Math.floor((new Date(payload.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, left));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [payload]);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 text-4xl">💬</div>
          <CardTitle>Conectar WhatsApp à Bússola</CardTitle>
          <CardDescription>
            Receba o tutor e o coach direto no zap. Sem aplicativo extra, sem cadastro novo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Clique em &quot;Gerar código&quot;.</li>
            <li>
              Abra uma conversa no WhatsApp com o número da Bússola e envie o código exato que
              aparecer abaixo.
            </li>
            <li>Pronto — você pode mandar dúvidas e áudios pelo zap.</li>
          </ol>

          {!payload && (
            <Button onClick={requestCode} disabled={loading} className="w-full">
              {loading ? "Gerando..." : "Gerar código"}
            </Button>
          )}

          {payload && (
            <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Seu código</p>
                <p className="my-1 font-mono text-3xl font-bold tracking-widest">
                  {payload.code}
                </p>
                <p className="text-xs text-zinc-500">
                  Válido por {secondsLeft != null ? `${secondsLeft}s` : `${payload.ttlMinutes} min`}
                </p>
              </div>
              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Envie para</p>
                <p className="font-mono text-base">{formatPhone(payload.botPhone)}</p>
              </div>
              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Mensagem exata</p>
                <code className="block rounded bg-zinc-100 p-2 text-sm dark:bg-zinc-950">
                  {payload.code}
                </code>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-center text-xs text-zinc-400">
            <Link href="/">Voltar ao início</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
