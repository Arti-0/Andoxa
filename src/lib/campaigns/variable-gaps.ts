/**
 * Variables de message campagne = colonnes fiche prospect (aligné avec applyMessageVariables).
 */
export const CAMPAIGN_VARIABLE_KEYS = [
  "firstName",
  "lastName",
  "company",
  "jobTitle",
  "phone",
  "email",
  "bookingLink",
] as const;

export type CampaignVariableKey = (typeof CAMPAIGN_VARIABLE_KEYS)[number];

const KEY_SET = new Set<string>(CAMPAIGN_VARIABLE_KEYS);

/** Libellés + colonne CRM équivalente */
export const CAMPAIGN_VARIABLE_META: Record<
  CampaignVariableKey,
  { label: string; crmColumn: string }
> = {
  firstName: { label: "Prénom", crmColumn: "Nom complet (extrait)" },
  lastName: { label: "Nom", crmColumn: "Nom complet (extrait)" },
  company: { label: "Entreprise", crmColumn: "company" },
  jobTitle: { label: "Poste", crmColumn: "job_title" },
  phone: { label: "Téléphone", crmColumn: "phone" },
  email: { label: "Email", crmColumn: "email" },
  bookingLink: { label: "Lien RDV", crmColumn: "Lien réservation (votre profil)" },
};

export function extractUsedCampaignVariables(template: string): CampaignVariableKey[] {
  const re = /\{\{(\w+)\}\}/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    const k = m[1];
    if (KEY_SET.has(k)) found.add(k);
  }
  return CAMPAIGN_VARIABLE_KEYS.filter((k) => found.has(k));
}

export interface ProspectLikeForVars {
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
}

function nameParts(fullName: string | null): { first: string; last: string } {
  const t = (fullName ?? "").trim();
  if (!t) return { first: "", last: "" };
  const parts = t.split(/\s+/);
  if (parts.length < 2) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

/** Retourne les clés utilisées dans le modèle et absentes sur la fiche. */
export function missingVariablesForProspect(
  prospect: ProspectLikeForVars,
  usedKeys: readonly CampaignVariableKey[],
  hasBookingLink: boolean
): CampaignVariableKey[] {
  const missing: CampaignVariableKey[] = [];
  const { first, last } = nameParts(prospect.full_name);
  for (const key of usedKeys) {
    switch (key) {
      case "firstName":
        if (!first) missing.push(key);
        break;
      case "lastName":
        if (!last) missing.push(key);
        break;
      case "company":
        if (!(prospect.company ?? "").trim()) missing.push(key);
        break;
      case "jobTitle":
        if (!(prospect.job_title ?? "").trim()) missing.push(key);
        break;
      case "phone":
        if (!(prospect.phone ?? "").trim()) missing.push(key);
        break;
      case "email":
        if (!(prospect.email ?? "").trim()) missing.push(key);
        break;
      case "bookingLink":
        if (!hasBookingLink) missing.push(key);
        break;
      default:
        break;
    }
  }
  return missing;
}
