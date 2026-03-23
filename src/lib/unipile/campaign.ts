/**
 * Unipile Campaign utilities – variable replacement, LinkedIn slug extraction
 */

export interface ProspectForVariables {
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone?: string | null;
  email?: string | null;
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
  return result;
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
