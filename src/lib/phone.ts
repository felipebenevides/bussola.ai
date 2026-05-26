/**
 * Normaliza um número de telefone (input livre ou JID do WhatsApp)
 * para formato E.164 sem o '+'. Ex: "5511999999999".
 * Sem dependência de libphonenumber para manter footprint pequeno.
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  // Remove sufixo do WhatsApp (@s.whatsapp.net, @g.us etc) e prefixos comuns
  const stripped = input.split("@")[0].replace(/\D/g, "");
  if (stripped.length < 10) return null;
  return stripped;
}

/**
 * Versão amigável para exibição: "+55 11 99999-9999"
 */
export function formatPhoneBR(phone: string): string {
  const p = normalizePhone(phone);
  if (!p) return phone;
  if (p.length === 13 && p.startsWith("55")) {
    return `+55 ${p.slice(2, 4)} ${p.slice(4, 9)}-${p.slice(9)}`;
  }
  if (p.length === 12 && p.startsWith("55")) {
    return `+55 ${p.slice(2, 4)} ${p.slice(4, 8)}-${p.slice(8)}`;
  }
  return `+${p}`;
}
