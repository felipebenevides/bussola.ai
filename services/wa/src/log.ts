import { env } from "./env";

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function emit(level: Level, msg: string, extra?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[env().LOG_LEVEL]) return;
  const line = extra
    ? `[${level}] ${msg} ${JSON.stringify(redact(extra))}`
    : `[${level}] ${msg}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

const REDACTED_KEYS = new Set([
  "apikey",
  "api_key",
  "authorization",
  "x-bussola-signature",
  "audio_base64",
  "base64",
  "text",
  "content",
]);

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) {
      out[k] = typeof v === "string" ? `<redacted:${v.length}ch>` : "<redacted>";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redact(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const log = {
  debug: (m: string, x?: Record<string, unknown>) => emit("debug", m, x),
  info: (m: string, x?: Record<string, unknown>) => emit("info", m, x),
  warn: (m: string, x?: Record<string, unknown>) => emit("warn", m, x),
  error: (m: string, x?: Record<string, unknown>) => emit("error", m, x),
};
