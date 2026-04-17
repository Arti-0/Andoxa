export function extractCleanRole(rawRole: string | null | undefined): string {
  if (!rawRole) return "";
  if (rawRole.length <= 35) return rawRole;

  // Pattern 1: "Title @ Company" or "Title | Company"
  const pipeMatch = rawRole.match(/^([^@|]+?)(?:\s*[@|])/);
  if (pipeMatch && pipeMatch[1].trim().length <= 50) {
    return pipeMatch[1].trim();
  }

  // Pattern 2: "Title chez/at/de/of Company" — extract before the preposition + company
  const prepMatch = rawRole.match(/^(.+?)\s+(?:chez|at|de chez|of|pour|–|—)\s+/i);
  if (prepMatch && prepMatch[1].trim().length <= 50) {
    return prepMatch[1].trim();
  }

  // Pattern 3: last comma-separated segment that looks like a title (e.g. "..., Co-founder & CEO")
  const parts = rawRole
    .split(/[,.]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const titlePart = parts.find(
    (p) =>
      p.length <= 40 &&
      /(?:CEO|CTO|COO|co-fond|fondateur|founder|directeur|manager|engineer|ingénieur|président|associate|consultant)/i.test(
        p
      )
  );
  if (titlePart) return titlePart;

  // Fallback: truncate at last word boundary before 35 chars
  const truncated = rawRole.slice(0, 35);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + "…";
}
