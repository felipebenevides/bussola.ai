import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
          fontSize: 22,
          borderRadius: 6,
        }}
      >
        🧭
      </div>
    ),
    { ...size, emoji: "twemoji" }
  );
}
