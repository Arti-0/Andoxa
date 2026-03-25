/**
 * Unipile Campaign utilities – variable replacement, LinkedIn slug extraction
 */

export interface ProspectForVariables {
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone?: string | null;
  email?: string | null;
  /**
   * Champs supplémentaires d’import (CSV/XLSX) sur la fiche contact.
   * Remplacements `{{NomExactColonne}}` appliqués après les variables standard (limite ci-dessous).
   */
  metadata?: unknown;
}

const MAX_IMPORT_METADATA_KEYS = 40;
const MAX_IMPORT_METADATA_KEY_LEN = 80;
const MAX_IMPORT_METADATA_VALUE_LEN = 500;

/**
 * Remplace les placeholders dont le nom correspond à une clé du metadata import (ordre alphabétique, max 40 clés).
 */
export function applyImportMetadataVariables(template: string, metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return template;
  }
  const obj = metadata as Record<string, unknown>;
  const entries = Object.entries(obj)
    .filter(
      ([k]) =>
        typeof k === "string" &&
        k.length > 0 &&
        k.length <= MAX_IMPORT_METADATA_KEY_LEN
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, MAX_IMPORT_METADATA_KEYS);

  let result = template;
  for (const [key, raw] of entries) {
    const val = String(raw ?? "").slice(0, MAX_IMPORT_METADATA_VALUE_LEN);
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try {
      const re = new RegExp(`\\{\\{${escaped}\\}\\}`, "g");
      result = result.replace(re, val);
    } catch {
      /* clé produisant une regexp invalide — ignorée */
    }
  }
  return result;
}

export interface MessageVariablesContext {
  /** Full URL for the sender's booking page (lien de prise de RDV) */
  bookingLink?: string | null;
}

function deriveNameParts(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName?.trim()) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function applyMessageVariables(
  template: string,
  prospect: ProspectForVariables,
  context?: MessageVariablesContext
): string {
  const { firstName, lastName } = deriveNameParts(prospect.full_name);
  let result = template
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{company\}\}/g, prospect.company ?? "")
    .replace(/\{\{jobTitle\}\}/g, prospect.job_title ?? "")
    .replace(/\{\{phone\}\}/g, prospect.phone ?? "")
    .replace(/\{\{email\}\}/g, prospect.email ?? "")
    .replace(/\{\{bookingLink\}\}/g, context?.bookingLink ?? "");
  return applyImportMetadataVariables(result, prospect.metadata);
}

const LINKEDIN_SLUG_RE = /linkedin\.com\/in\/([^/?]+)/i;

/**
 * Extract LinkedIn profile slug from URL (e.g. "john-doe" from linkedin.com/in/john-doe)
 */
export function extractLinkedInSlug(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const m = url.match(LINKEDIN_SLUG_RE);
  return m ? m[1].replace(/\/$/, "") : null;
}
