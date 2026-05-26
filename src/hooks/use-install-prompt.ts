"use client";

import { useEffect, useState } from "react";

/**
 * Evento `beforeinstallprompt` (Chrome/Edge/Android). Não está no
 * lib.dom padrão — declaramos a forma mínima que usamos.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type Platform = "android" | "ios" | "desktop" | "other";

export interface InstallPromptHook {
  /** Plataforma detectada (best-effort via UA). */
  platform: Platform;
  /** True quando o browser já reportou suporte a install nativo. */
  canInstall: boolean;
  /** True se a app já está rodando em modo standalone. */
  installed: boolean;
  /** Dispara o prompt nativo de install (Android/Chrome). No iOS é no-op. */
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function useInstallPrompt(): InstallPromptHook {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    // Detecta plataforma + standalone
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : isMobile ? "other" : "desktop");

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari legacy
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    function onBIP(e: Event) {
      // Sem preventDefault o Chrome pode mostrar o mini-infobar duplicado.
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!event) return "unavailable";
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === "accepted") setInstalled(true);
    return outcome;
  }

  return {
    platform,
    canInstall: !!event && !installed,
    installed,
    install,
  };
}
