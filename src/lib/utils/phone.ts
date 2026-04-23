/**
 * Normalise un numéro de téléphone pour l'envoi WhatsApp via Unipile.
 *
 * Rules:
 * - Strip spaces, hyphens, dots, parentheses, and leading +
 * - Replace leading "00" → no prefix (already a country code)
 * - If starts with a single "0" (French mobile/landline) → prepend "33" (France)
 * - Leaves international numbers (already starting with country code) untouched
 */
export function normalizePhoneForWhatsApp(raw: string): string {
  // Remove all formatting characters and leading +
  let phone = raw.replace(/[\s\-().+]/g, "");

  // "0033..." → "33..."
  phone = phone.replace(/^00/, "");

  // French local format "06...", "07...", "01...", etc. → "336...", "337...", "331..."
  if (/^0\d/.test(phone)) {
    phone = "33" + phone.slice(1);
  }

  return phone;
}
