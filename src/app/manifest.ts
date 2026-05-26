import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bússola — Tutor de IA CEFIS",
    short_name: "Bússola",
    description:
      "Tutor de IA que conhece seu objetivo, diagnostica lacunas e responde com o vídeo da aula CEFIS no segundo exato.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#10b981",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icon1",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon1",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Tutor",
        short_name: "Tutor",
        description: "Abrir a tutora de IA",
        url: "/tutor",
      },
      {
        name: "Meu plano",
        short_name: "Plano",
        description: "Plano de estudos personalizado",
        url: "/plano",
      },
    ],
  };
}
