import type { Context, Next } from "hono";
import { env } from "./env";
import { verifySignature, HMAC_HEADER } from "./hmac";
import { log } from "./log";

declare module "hono" {
  interface ContextVariableMap {
    rawBody: string;
  }
}

/**
 * Exige HMAC válido em `X-Bussola-Signature` calculado sobre o body raw.
 * Como `c.req.text()` consome o body, expomos o texto via `c.get('rawBody')`
 * para os handlers reaproveitarem (ex.: `JSON.parse(c.get('rawBody'))`).
 */
export async function hmacMiddleware(c: Context, next: Next) {
  const sig = c.req.header(HMAC_HEADER);
  const body = await c.req.text();
  const { INTERNAL_HMAC_SECRET } = env();
  if (!verifySignature(body, sig ?? null, INTERNAL_HMAC_SECRET)) {
    log.warn("hmac.invalid", { path: c.req.path });
    return c.json({ error: "forbidden" }, 403);
  }
  c.set("rawBody", body);
  await next();
}

export function parseBody<T>(c: Context): T | null {
  const raw = c.get("rawBody");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
