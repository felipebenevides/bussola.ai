"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GeneratePlanButtonProps {
  label?: string;
  variant?: "default" | "outline";
  className?: string;
}

export function GeneratePlanButton({
  label = "Gerar meu plano",
  variant = "default",
  className,
}: GeneratePlanButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/curator/generate-plan", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        variant={variant}
        size="lg"
      >
        {loading ? "Montando…" : label}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
