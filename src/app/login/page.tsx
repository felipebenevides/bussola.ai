"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackToHome } from "@/components/back-to-home";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/cefis-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pass }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erro desconhecido" }));
      setError(j.error || `Erro ${res.status}`);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-stretch justify-center gap-4 p-6">
      <div>
        <BackToHome variant="pill" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 text-4xl">🧭</div>
          <CardTitle>Entrar na Bússola</CardTitle>
          <CardDescription>
            Use suas credenciais da CEFIS. Não temos nenhum acesso à sua senha — ela vai direto para
            a API da CEFIS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail ou CPF</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pass">Senha</Label>
              <Input
                id="pass"
                type="password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <p className="text-center text-xs text-zinc-500">
              Não tem conta?{" "}
              <a
                href="https://cefis.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                Criar grátis
              </a>
            </p>
            <p className="text-center text-xs text-zinc-400">
              <Link href="/">Voltar</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
