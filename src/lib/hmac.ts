import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const HMAC_HEADER = "x-bussola-signature";
const PREFIX = "sha256=";

export function signBody(body: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(body).digest("hex");
  return `${PREFIX}${mac}`;
}

export function verifySignature(body: string, header: string | null, secret: string): boolean {
  if (!header || !header.startsWith(PREFIX)) return false;
  const expected = signBody(body, secret);
  if (header.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getInternalSecret(): string {
  const s = process.env.INTERNAL_HMAC_SECRET;
  if (!s || s.length < 32) {
    throw new Error("INTERNAL_HMAC_SECRET ausente ou curto demais (>=32 chars)");
  }
  return s;
}
