"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";

const STORAGE_KEY = "bussola-theme";

interface ThemeCtx {
  theme: Theme;
  toggleTheme: (origin?: { x: number; y: number }) => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // O script no-flash em layout.tsx já aplicou .dark antes da hidratação,
  // então lemos do DOM pra inicializar sem mismatch.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  const animating = useRef(false);

  const applyTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage indisponível — segue sem persistir
    }
    setThemeState(next);
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      applyTheme(t);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(
    (origin?: { x: number; y: number }) => {
      if (animating.current) return;
      const next: Theme = theme === "dark" ? "light" : "dark";

      const supportsVT =
        typeof document !== "undefined" &&
        typeof (document as Document & { startViewTransition?: unknown })
          .startViewTransition === "function";

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      if (!supportsVT || prefersReducedMotion) {
        applyTheme(next);
        return;
      }

      animating.current = true;
      const { innerWidth: w, innerHeight: h } = window;
      const x = origin?.x ?? w - 56;
      const y = origin?.y ?? h - 56;
      const endRadius = Math.hypot(
        Math.max(x, w - x),
        Math.max(y, h - y)
      );

      const transition = (
        document as Document & {
          startViewTransition: (cb: () => void) => { ready: Promise<void> };
        }
      ).startViewTransition(() => {
        flushSync(() => applyTheme(next));
      });

      transition.ready
        .then(() => {
          const clipPath = [
            `circle(0 at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ];
          document.documentElement.animate(
            { clipPath },
            {
              duration: 520,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        })
        .finally(() => {
          animating.current = false;
        });
    },
    [theme, applyTheme]
  );

  // Sincroniza com mudanças externas de prefers-color-scheme se o usuário
  // nunca clicou (ou apagou) o storage — assim respeitamos o SO.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return; // já tem preferência manual
      } catch {
        return;
      }
      applyTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de <ThemeProvider>.");
  }
  return ctx;
}

/**
 * Script inline a ser injetado no <head> ANTES da hidratação.
 * Evita flash incorreto na primeira pintura.
 * Light é o default — só aplica .dark se o usuário explicitamente escolheu.
 */
export const NO_FLASH_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (!t) {
      // Sem preferência explícita: light é default.
      // (Se quiser respeitar SO, descomente abaixo.)
      // if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      //   document.documentElement.classList.add('dark');
      // }
    }
  } catch (e) {}
})();
`;
