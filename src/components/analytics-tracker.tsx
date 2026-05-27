"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Dispara um page_view a cada mudança de rota. O endpoint server-side gerencia
 * o cookie de sessão anônima (UUID) e identifica o user automaticamente quando
 * houver login CEFIS ativo.
 *
 * Best-effort: silenciamos erros pra nunca poluir a UI.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const referrerRef = useRef<string | null>(null);

  // Captura referrer só uma vez na primeira montagem
  useEffect(() => {
    referrerRef.current = typeof document !== "undefined" ? document.referrer || null : null;
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (lastPath.current === pathname) return;
    const previous = lastPath.current;
    lastPath.current = pathname;

    // Não tracka /api/* nem rotas internas
    if (pathname.startsWith("/api/")) return;

    const referrer = previous
      ? `${typeof window !== "undefined" ? window.location.origin : ""}${previous}`
      : referrerRef.current;

    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "page_view",
        path: pathname,
        referrer,
      }),
      keepalive: true,
    }).catch(() => {
      /* silencioso */
    });
  }, [pathname]);

  return null;
}
