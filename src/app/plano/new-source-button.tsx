"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import { NewSourceModal } from "@/components/new-source-modal";

/**
 * Wrapper client pra usar o NewSourceModal dentro do /plano (server).
 * Ao escolher "Curso CEFIS", navega pro /tutor com ?newSource=1 — o
 * Tutor reabre o modal de lá e o agente de onboarding cuida do flow.
 */
export function NewSourceButton({ variant = "primary" }: { variant?: "primary" | "ghost" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const className =
    variant === "primary"
      ? "inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 px-3 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:text-sm"
      : "inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:text-sm";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Plus className="h-3.5 w-3.5" />
        <span>Novo curso</span>
        {variant === "primary" && <Sparkles className="h-3 w-3 opacity-70" />}
      </button>
      <NewSourceModal
        open={open}
        onClose={() => setOpen(false)}
        onCefis={() => {
          setOpen(false);
          router.push("/tutor?newSource=1");
        }}
      />
    </>
  );
}
