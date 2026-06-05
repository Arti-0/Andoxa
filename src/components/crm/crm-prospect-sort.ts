import { type Prospect } from "@/lib/types/prospects";
import { parseSilenceDays } from "./crm-shared";

export type ProspectSortKey =
  | "entry"
  | "lastActivity"
  | "silence"
  | "alpha"
  | "status"
  | "source";

export type SortDir = "asc" | "desc";

export const PROSPECT_SORT_OPTIONS: { id: ProspectSortKey; label: string }[] = [
  { id: "lastActivity", label: "Dernière activité" },
  { id: "entry", label: "Date d'entrée pipeline" },
  { id: "silence", label: "Silence" },
  { id: "alpha", label: "Alphabétique" },
];

/** Natural default direction when a sort key is first selected. */
export const PROSPECT_SORT_DEFAULT_DIR: Record<ProspectSortKey, SortDir> = {
  lastActivity: "desc", // most recent first
  entry: "desc", // newest in pipeline first
  silence: "desc", // most silent first
  alpha: "asc", // A → Z
  status: "asc", // pipeline order
  source: "asc", // A → Z
};

function lastActivityLabel(p: Prospect): string {
  return p.last_activity?.label ?? "—";
}

/**
 * Ascending comparison for a given key. `sortProspects` applies the direction,
 * so every comparator here returns the natural ascending order.
 */
function compareAsc(
  a: Prospect,
  b: Prospect,
  sortBy: ProspectSortKey,
  statusOrder?: Map<string, number>,
): number {
  switch (sortBy) {
    case "alpha":
      return (a.full_name ?? "").localeCompare(b.full_name ?? "", "fr");
    case "source":
      return (a.source ?? "").localeCompare(b.source ?? "", "fr");
    case "status": {
      const ai = statusOrder?.get(a.status ?? "") ?? Number.MAX_SAFE_INTEGER;
      const bi = statusOrder?.get(b.status ?? "") ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return (a.status ?? "").localeCompare(b.status ?? "", "fr");
    }
    case "entry": {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    }
    case "silence":
      return (
        parseSilenceDays(lastActivityLabel(a)) -
        parseSilenceDays(lastActivityLabel(b))
      );
    case "lastActivity":
    default: {
      // Sort by the *actual* last-activity timestamp the column displays
      // (last_activity.at) — not updated_at, which drifts from the label and
      // put e.g. "Silence 8j" between two "il y a 4 jours". Fall back to
      // updated_at only when no activity timestamp exists.
      const at = (p: Prospect) =>
        p.last_activity?.at
          ? new Date(p.last_activity.at).getTime()
          : p.updated_at
            ? new Date(p.updated_at).getTime()
            : 0;
      return at(a) - at(b);
    }
  }
}

export function sortProspects(
  rows: Prospect[],
  sortBy: ProspectSortKey,
  dir: SortDir = PROSPECT_SORT_DEFAULT_DIR[sortBy],
  statusOrder?: Map<string, number>,
): Prospect[] {
  const factor = dir === "asc" ? 1 : -1;
  return rows
    .slice()
    .sort((a, b) => factor * compareAsc(a, b, sortBy, statusOrder));
}
