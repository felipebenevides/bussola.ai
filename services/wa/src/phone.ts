/**
 * Normaliza JID/input para E.164 sem '+'. Cópia leve da impl em src/lib/phone.ts.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const stripped = input.split("@")[0]!.replace(/\D/g, "");
  if (stripped.length < 10) return null;
  return stripped;
}
