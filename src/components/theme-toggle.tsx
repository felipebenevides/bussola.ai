"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/theme";

/**
 * Botão FAB com sol/lua morfando, halo animado, e disparo da transição
 * circular (View Transitions API) a partir da posição do clique.
 *
 * Esconde no /tutor — lá o toggle aparece embutido no header da sidebar.
 */
export function ThemeToggleFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/tutor")) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 sm:bottom-7 sm:right-7">
      <ThemeToggleButton variant="fab" />
    </div>
  );
}

interface ThemeToggleProps {
  variant?: "fab" | "inline";
  className?: string;
}

export function ThemeToggleButton({ variant = "fab", className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    toggleTheme({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  const baseFab =
    "pointer-events-auto group relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-xl shadow-black/30 ring-1 ring-black/5 backdrop-blur transition-transform duration-300 hover:scale-105 active:scale-95";
  const baseInline =
    "group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-transform duration-300 hover:scale-105 active:scale-95";

  const surface = isDark
    ? "bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950"
    : "bg-gradient-to-br from-amber-200 via-amber-300 to-orange-400";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className={`${variant === "fab" ? baseFab : baseInline} ${surface} ${className}`}
    >
      {/* halo / glow externo */}
      <span
        aria-hidden
        className={`absolute inset-0 -z-10 rounded-full blur-md transition-opacity duration-500 ${
          isDark
            ? "bg-indigo-500/40 opacity-80"
            : "bg-amber-300/70 opacity-80"
        }`}
      />

      {/* Sol/lua morfando */}
      <SunMoonIcon dark={isDark} size={variant === "fab" ? 22 : 18} />

      {/* Estrelinhas (dark) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          isDark ? "opacity-100" : "opacity-0"
        }`}
      >
        <Star className="absolute left-2 top-2 h-1 w-1 animate-pulse" />
        <Star className="absolute right-3 top-3.5 h-[3px] w-[3px] [animation-delay:200ms]" />
        <Star className="absolute bottom-3 left-3.5 h-[2px] w-[2px] [animation-delay:400ms]" />
      </span>

      {/* Raios do sol (light) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          isDark ? "opacity-0" : "opacity-100"
        }`}
      >
        <Ray rotation={0} />
        <Ray rotation={45} />
        <Ray rotation={90} />
        <Ray rotation={135} />
        <Ray rotation={180} />
        <Ray rotation={225} />
        <Ray rotation={270} />
        <Ray rotation={315} />
      </span>

      {/* Anel sutil pulsando no hover */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset transition-all duration-300 group-hover:scale-105 ${
          isDark ? "ring-indigo-400/30" : "ring-amber-50/60"
        }`}
      />
    </button>
  );
}

function SunMoonIcon({ dark, size }: { dark: boolean; size: number }) {
  // Mesma <svg>: sol = círculo cheio com raios externos (gerenciados pelos <Ray/>),
  // lua = círculo com "mordida" via mask que aparece em dark.
  const s = size;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="relative z-10"
      aria-hidden
    >
      <defs>
        <mask id="moon-bite">
          {/* Círculo branco = visível, círculo preto = "mordido" */}
          <rect x="0" y="0" width="24" height="24" fill="black" />
          <circle cx="12" cy="12" r="7" fill="white" />
          <circle
            cx="17"
            cy="9"
            r="6"
            fill="black"
            className={`origin-center transition-transform duration-500 ${
              dark ? "translate-x-0" : "translate-x-4"
            }`}
          />
        </mask>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="7"
        mask="url(#moon-bite)"
        className={`transition-colors duration-500 ${
          dark ? "fill-indigo-100" : "fill-amber-50"
        }`}
      />
    </svg>
  );
}

function Ray({ rotation }: { rotation: number }) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-1/2 h-1 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-50"
      style={{
        transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(-13px)`,
        boxShadow: "0 0 4px rgba(254, 243, 199, 0.8)",
      }}
    />
  );
}

function Star({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`rounded-full bg-indigo-100 shadow-[0_0_4px_rgba(199,210,254,0.9)] ${className}`}
    />
  );
}
