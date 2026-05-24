export interface ProspectForVariables {
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone?: string | null;
  email?: string | null;
  metadata?: unknown;
}

export interface MessageVariablesContext {
  bookingLink?: string | null;
  meetLink?: string | null;
  date?: string | null;
  time?: string | null;
  name?: string | null;
}

const MAX_IMPORT_METADATA_KEYS = 40;
const MAX_IMPORT_METADATA_KEY_LEN = 80;
const MAX_IMPORT_METADATA_VALUE_LEN = 500;

const FRENCH_ALIASES: Record<string, string> = {
  prénom: "firstName",
  prenom: "firstName",
  nom: "lastName",
  entreprise: "company",
  poste: "jobTitle",
  lien_booking: "bookingLink",
  lien_visio: "meetLink",
  lien_meet: "meetLink",
  téléphone: "phone",
  telephone: "phone",
  mail: "email",
};

export function normalizeTemplateSyntax(template: string): string {
  let result = template;
  for (const [fr, canonical] of Object.entries(FRENCH_ALIASES)) {
    result = result.replace(
      new RegExp(`\\{${fr}\\}`, "gi"),
      `{{${canonical}}}`
    );
  }
  result = result.replace(/\{\{fullName\}\}/gi, "{{firstName}} {{lastName}}");
  return result;
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
      /* invalid key */
    }
  }
  return result;
}

/**
 * Strip a trailing " chez X" / " at X" / " @ X" suffix from `jobTitle` when
 * `X` matches the prospect's company. LinkedIn headlines sneak the company
 * into the title field ("CTO chez Anthropic"), which then collides with
 * templates like "{{Poste}} chez {{company}}" — producing
 * "CTO chez Anthropic chez Anthropic".
 */
function stripCompanyFromJobTitle(
  jobTitle: string | null | undefined,
  company: string | null | undefined
): string | null | undefined {
  if (!jobTitle?.trim() || !company?.trim()) return jobTitle;
  const escaped = company.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `\\s+(?:chez|at|@|pour|with)\\s+${escaped}\\s*\\.?\\s*$`,
    "i"
  );
  const stripped = jobTitle.replace(pattern, "").trim();
  return stripped.length > 0 ? stripped : jobTitle;
}

export function applyMessageVariables(
  template: string,
  prospect: ProspectForVariables,
  context?: MessageVariablesContext
): string {
  const normalized = normalizeTemplateSyntax(template);
  const { firstName, lastName } = deriveNameParts(prospect.full_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const jobTitle = stripCompanyFromJobTitle(prospect.job_title, prospect.company);
  const replaceIfPresent = (
    input: string,
    token: string,
    value: string | null | undefined
  ): string => {
    if (value == null || value === "") return input;
    return input.replace(new RegExp(`\\{\\{${token}\\}\\}`, "g"), value);
  };

  let result = normalized;
  result = replaceIfPresent(result, "firstName", firstName);
  result = replaceIfPresent(result, "lastName", lastName);
  result = replaceIfPresent(result, "name", context?.name ?? (fullName || firstName));
  result = replaceIfPresent(result, "company", prospect.company);
  result = replaceIfPresent(result, "jobTitle", jobTitle);
  result = replaceIfPresent(result, "phone", prospect.phone);
  result = replaceIfPresent(result, "email", prospect.email);
  result = replaceIfPresent(result, "bookingLink", context?.bookingLink);
  result = replaceIfPresent(result, "meetLink", context?.meetLink);
  result = replaceIfPresent(result, "date", context?.date);
  result = replaceIfPresent(result, "time", context?.time);

  return applyImportMetadataVariables(result, prospect.metadata);
}

/** Shared sample data for template authoring previews (messagerie, campaigns UI). */
export const TEMPLATE_PREVIEW_PROSPECT: ProspectForVariables = {
  full_name: "Andréas Bodin",
  company: "Andoxa",
  job_title: "Co-fondateur",
  phone: "+33 6 24 18 92 47",
  email: "andreas@example.com",
};

export const TEMPLATE_PREVIEW_BOOKING_LINK = "andoxa.app/book/marie-dubois";

export function applyTemplatePreview(
  template: string,
  bookingLink: string = TEMPLATE_PREVIEW_BOOKING_LINK
): string {
  return applyMessageVariables(template, TEMPLATE_PREVIEW_PROSPECT, {
    bookingLink,
  });
}
