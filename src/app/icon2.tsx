import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Ícone 512x512 — usado no install Android, splash screen iOS-fallback e store listings.
 */
export default function Icon512() {
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
          fontSize: 350,
          borderRadius: 100,
        }}
      >
        🧭
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
