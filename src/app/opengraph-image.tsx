import { ImageResponse } from "next/og";

// Railway self-host: edge runtime depende de Vercel infra. Em Node runtime
// next/og funciona igualzinho via @vercel/og em modo Node — sem Vercel.
export const runtime = "nodejs";
export const alt = "Bússola — tutor de IA CEFIS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #052e26 0%, #064e3b 50%, #065f46 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 140, marginBottom: 24, lineHeight: 1 }}>🧭</div>
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.02em" }}>Bússola</div>
        <div
          style={{
            fontSize: 36,
            marginTop: 16,
            opacity: 0.85,
            maxWidth: 880,
            lineHeight: 1.25,
          }}
        >
          Tutor de IA que cita o segundo exato da aula CEFIS
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 80,
            fontSize: 24,
            opacity: 0.6,
          }}
        >
          Hackathon CEFIS · 2026
        </div>
      </div>
    ),
    { ...size }
  );
}
