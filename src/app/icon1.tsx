import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

/**
 * Ícone 192x192 — mínimo exigido por PWA Android.
 * Mesmo conteúdo do 512 (icon2), só muda escala.
 */
export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #34d399 0%, #059669 60%, #047857 100%)",
          fontSize: 130,
          borderRadius: 38,
        }}
      >
        🧭
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
