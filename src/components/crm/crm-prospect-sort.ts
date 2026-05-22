import { type Prospect } from "@/lib/types/prospects";
import { parseSilenceDays } from "./crm-shared";

export type ProspectSortKey = "entry" | "lastActivity" | "silence" | "alpha";

export const PROSPECT_SORT_OPTIONS: { id: ProspectSortKey; label: string }[] = [
  { id: "lastActivity", label: "Dernière activité" },
  { id: "entry", label: "Date d'entrée pipeline" },
  { id: "silence", label: "Silence" },
  { id: "alpha", label: "Alphabétique" },
];

function lastActivityLabel(p: Prospect): string {
  return p.last_activity?.label ?? "—";
}

export function compareProspects(
  a: Prospect,
  b: Prospect,
  sortBy: ProspectSortKey,
): number {
  if (sortBy === "alpha") {
    return (a.full_name ?? "").localeCompare(b.full_name ?? "", "fr");
  }
  if (sortBy === "entry") {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  }
  if (sortBy === "silence") {
    return (
      parseSilenceDays(lastActivityLabel(b)) -
      parseSilenceDays(lastActivityLabel(a))
    );
  }
  const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
  const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
  return tb - ta;
}

export function sortProspects(
  rows: Prospect[],
  sortBy: ProspectSortKey,
): Prospect[] {
  return rows.slice().sort((a, b) => compareProspects(a, b, sortBy));
}
