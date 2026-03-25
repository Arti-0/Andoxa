/**
 * Nom d'organisation par défaut à la création (checkout, etc.)
 */
export function formatDefaultOrganizationName(displayNameOrEmail: string): string {
  const base = displayNameOrEmail.trim();
  if (!base) return "Organisation";
  return `Organisation de ${base}`;
}

/**
 * Affichage : convertit l'ancien suffixe anglais stocké en base.
 */
export function displayOrganizationName(name: string | undefined | null): string {
  if (!name?.trim()) return "";
  const legacy = name.trim().match(/^(.+?)'s Organization$/i);
  if (legacy) return `Organisation de ${legacy[1].trim()}`;
  return name.trim();
}
