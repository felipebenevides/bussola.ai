import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

/**
 * Botão pequeno e consistente "Voltar para a home" — adicione no canto
 * superior esquerdo das páginas que não têm um header próprio.
 */
export function BackToHome({
  label = "Voltar à home",
  variant = "default",
}: {
  label?: string;
  variant?: "default" | "pill";
}) {
  if (variant === "pill") {
    return (
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <ArrowLeft className="h-3 w-3" />
        <Compass className="h-3 w-3 text-emerald-500" />
        {label}
      </Link>
    );
  }
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="flex items-center gap-1">
        <Compass className="h-3.5 w-3.5 text-emerald-500" />
        {label}
      </span>
    </Link>
  );
}
