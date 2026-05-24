/**
 * Prospect-level opt-out from automatic outreach.
 *
 * A solo founder running campaigns + workflows needs an escape hatch: some
 * prospects are too sensitive to be touched by batch sends (active deals,
 * VIPs, friends-of-friends), and a single forgotten exclusion can blow up
 * a relationship. The flag lives on `prospects.metadata.automation_excluded`
 * so we don't need a schema migration to ship it — the import pipeline at
 * `app/api/prospects/import/route.ts` already namespaces CSV extras under
 * metadata, and `automation_excluded` is a reserved key the import path
 * never writes.
 *
 * Producers (the toggle UI, the bulk-action bar) write `true` to opt out.
 * Consumers:
 *   - `app/api/campaigns/jobs/route.ts` filters excluded prospects out of new
 *     campaign jobs and reports them in the `skipped[]` envelope with reason
 *     `"automation_excluded"`.
 *   - Workflow enrollment paths should call `isProspectAutomationExcluded`
 *     before enqueueing a run (TODO when we wire it through).
 *
 * UX: the campaign modal surfaces the count via a toast so the user
 * understands why the batch shrank — see CampaignModal handleSave().
 */

const RESERVED_KEY = "automation_excluded";

type ProspectMetadataLike = Record<string, unknown> | null | undefined;

export interface ProspectWithMetadata {
  metadata?: unknown;
}

/** True iff metadata explicitly opts the prospect out of automation. */
export function isProspectAutomationExcluded(
  prospect: ProspectWithMetadata | null | undefined
): boolean {
  const meta = prospect?.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const raw = (meta as Record<string, unknown>)[RESERVED_KEY];
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

/** Build a metadata patch that toggles the opt-out flag. Use with `update`. */
export function automationExclusionPatch(
  existing: ProspectMetadataLike,
  excluded: boolean
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (excluded) {
    base[RESERVED_KEY] = true;
  } else {
    delete base[RESERVED_KEY];
  }
  return base;
}

export const AUTOMATION_EXCLUDED_KEY = RESERVED_KEY;
