import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { logStatusChange } from "@/lib/prospect-activity";

/**
 * Campaign-driven pipeline progression.
 *
 * Automation only ever *advances* a prospect: it moves them to a higher-ranked
 * permanent status, never backwards, and never overwrites a status they already
 * reached or a custom one a human set. The ranks below mirror the seed
 * `sort_order` of the permanent statuses the campaigns touch:
 *
 *   Nouveau (10) → Invité (15) → Contacté (20) → RDV (40)
 *
 * Anything else the prospect might be on (Proposition, Signé, Perdu, No-show,
 * or a user-defined custom status) is treated as unranked → at/above any target
 * → left untouched, so a campaign send can't pull a triaged prospect back.
 */
const ADVANCE_RANK: Record<string, number> = {
  new: 10,
  invited: 15,
  contacted: 20,
  rdv: 40,
};

export type AdvanceTargetKey = "invited" | "contacted" | "rdv";

/**
 * Best-effort: resolve the org's target status, and update the prospect's
 * `status` + `status_id` (and log a `status_change`) only when it represents
 * forward movement. Never throws — campaigns/webhooks must not depend on it.
 */
export async function advanceProspectStatus(
  supabase: SupabaseClient<Database>,
  args: {
    organizationId: string;
    prospectId: string;
    actorId: string | null;
    target: AdvanceTargetKey;
  },
): Promise<void> {
  try {
    const targetRank = ADVANCE_RANK[args.target];
    if (targetRank == null) return;

    // Target status row for this org (id + key) — we set both the text column
    // and status_id so the CRM kanban, pills and legacy reads stay in sync.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: target } = await (supabase as any)
      .from("prospect_statuses")
      .select("id, key")
      .eq("organization_id", args.organizationId)
      .eq("key", args.target)
      .maybeSingle();
    if (!target) return;

    const { data: prospect } = await supabase
      .from("prospects")
      .select("status")
      .eq("id", args.prospectId)
      .eq("organization_id", args.organizationId)
      .maybeSingle();
    if (!prospect) return;

    const currentKey = prospect.status ?? null;
    const currentRank =
      currentKey == null
        ? -1
        : ADVANCE_RANK[currentKey] ?? Number.POSITIVE_INFINITY;
    // At or beyond the target (incl. custom/terminal statuses) → leave alone.
    if (currentRank >= targetRank) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("prospects")
      .update({
        status: target.key,
        status_id: target.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.prospectId)
      .eq("organization_id", args.organizationId);
    if (error) {
      console.error("[advance-status] update failed", error.message);
      return;
    }

    await logStatusChange(supabase, {
      organization_id: args.organizationId,
      prospect_id: args.prospectId,
      actor_id: args.actorId,
      from: currentKey,
      to: target.key,
    });
  } catch (e) {
    console.error("[advance-status] exception", e);
  }
}
