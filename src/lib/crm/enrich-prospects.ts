import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import type { Prospect } from "@/lib/types/prospects";
import { describeActivity } from "@/lib/prospect-activity";

/**
 * Enriches a list of prospect rows with derived fields used by the CRM
 * Prospects + Pipeline tables and the prospect profile page:
 *
 *   • bdd_name     — name of the list (`bdd.name`) the prospect belongs to     (CRM-11)
 *   • workflow     — current workflow run summary `{ name, step, total }`     (CRM-9)
 *   • convs        — list of channels with an active conversation              (CRM-8)
 *   • last_activity — most recent activity row mapped to a UI label            (CRM-6)
 *
 * All four lookups are batched (single round trip per dimension) and silently
 * fall back to `null` / empty arrays if a side table is missing or empty so a
 * partially-deployed environment never breaks the listing.
 */

export type ProspectChannelKind = "linkedin" | "whatsapp" | "booking";

export interface LastActivity {
  /** "reply" if the most recent action came from the prospect, "outbound" if we last touched them, "silence" if too quiet, "rdv" if last action was scheduling a meeting. */
  type: "reply" | "outbound" | "silence" | "rdv" | "system";
  /** Human-readable French label rendered in the table cells. */
  label: string;
  /** ISO timestamp the label was derived from. */
  at: string | null;
}

export interface ProspectWorkflowSummary {
  name: string;
  step: number;
  total: number;
  /** workflow_runs.id — useful for deep-links to the workflow page. */
  run_id?: string;
}

export interface EnrichedProspect extends Prospect {
  bdd_name: string | null;
  workflow: ProspectWorkflowSummary | null;
  convs: ProspectChannelKind[];
  last_activity: LastActivity;
}

/**
 * Map a prospect_activity action to the row's "Dernière activité" label.
 * Reads the canonical descriptor (kind + dir) from
 * `lib/prospect-activity.ts` so adding a new verb there automatically
 * extends the row labels.
 */
function activityToLabel(
  action: string | null,
  ageDays: number,
): { type: LastActivity["type"]; label: string } {
  const desc = action ? describeActivity(action) : null;

  // RDV / booking events
  if (desc?.kind === "rdv") {
    return {
      type: "rdv",
      label: ageDays === 0 ? "RDV aujourd’hui" : `RDV il y a ${ageDays}j`,
    };
  }
  // Inbound message → reply
  if (desc?.dir === "received") {
    if (ageDays === 0) return { type: "reply", label: "Réponse aujourd’hui" };
    if (ageDays === 1) return { type: "reply", label: "Réponse hier" };
    return { type: "reply", label: `Réponse il y a ${ageDays}j` };
  }
  // Outbound message
  if (desc?.dir === "sent") {
    if (ageDays === 0) return { type: "outbound", label: "Envoyé aujourd’hui" };
    if (ageDays === 1) return { type: "outbound", label: "Envoyé hier" };
    return { type: "outbound", label: `Envoyé il y a ${ageDays}j` };
  }
  // Anything else: silence threshold first, then a soft "Activité…" fallback.
  if (ageDays >= 7) return { type: "silence", label: `Silence ${ageDays}j` };
  if (ageDays === 0) return { type: "system", label: "Activité aujourd’hui" };
  if (ageDays === 1) return { type: "system", label: "Activité hier" };
  return { type: "system", label: `Activité il y a ${ageDays}j` };
}

function fallbackLabel(p: Prospect): LastActivity {
  const at = p.updated_at ?? p.created_at ?? null;
  if (!at) return { type: "system", label: "—", at: null };
  const days = Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 86400000));
  const sub = activityToLabel(null, days);
  return { ...sub, at };
}

export async function enrichProspects(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  items: Prospect[],
): Promise<EnrichedProspect[]> {
  if (items.length === 0) return [];

  const ids = items.map((p) => p.id);
  const bddIds = Array.from(
    new Set(items.map((p) => p.bdd_id).filter((v): v is string => !!v)),
  );

  /* ---- bdd_name lookup (CRM-11) ----------------------------------------- */
  const bddNames = new Map<string, string>();
  if (bddIds.length > 0) {
    const { data } = await supabase
      .from("bdd")
      .select("id, name")
      .in("id", bddIds)
      .eq("organization_id", workspaceId);
    for (const row of data ?? []) {
      bddNames.set(row.id, row.name);
    }
  }

  /* ---- workflow run + version (CRM-9) ----------------------------------- */
  const workflowByProspect = new Map<string, ProspectWorkflowSummary>();
  {
    const { data: runs } = await supabase
      .from("workflow_runs")
      .select(
        "id, prospect_id, current_step_index, status, workflow_id, definition_snapshot",
      )
      .eq("organization_id", workspaceId)
      .in("prospect_id", ids)
      .in("status", ["pending", "running", "paused"])
      .order("created_at", { ascending: false });

    if (runs && runs.length > 0) {
      const wfIds = Array.from(new Set(runs.map((r) => r.workflow_id)));
      const { data: wfs } = await supabase
        .from("workflows")
        .select("id, name")
        .in("id", wfIds);
      const wfNames = new Map((wfs ?? []).map((w) => [w.id, w.name]));
      // Multiple active runs per prospect are possible — keep the most recent.
      for (const run of runs) {
        if (workflowByProspect.has(run.prospect_id)) continue;
        const snapshot = run.definition_snapshot as
          | { steps?: unknown[] }
          | null;
        const total = Array.isArray(snapshot?.steps)
          ? (snapshot!.steps as unknown[]).length
          : 0;
        workflowByProspect.set(run.prospect_id, {
          run_id: run.id,
          name: wfNames.get(run.workflow_id) ?? "Parcours",
          step: (run.current_step_index ?? 0) + 1,
          total,
        });
      }
    }
  }

  /* ---- channel inventory (CRM-8) ---------------------------------------- */
  const convsByProspect = new Map<string, ProspectChannelKind[]>();
  {
    // LinkedIn — any unipile_chat_prospects row counts.
    const { data: chats } = await supabase
      .from("unipile_chat_prospects")
      .select("prospect_id")
      .eq("organization_id", workspaceId)
      .in("prospect_id", ids);
    for (const row of chats ?? []) {
      const arr = convsByProspect.get(row.prospect_id) ?? [];
      if (!arr.includes("linkedin")) arr.push("linkedin");
      convsByProspect.set(row.prospect_id, arr);
    }
    // TODO(future): WhatsApp + Booking once those tables expose prospect_id.
  }

  /* ---- last activity (CRM-6) -------------------------------------------- */
  const activityByProspect = new Map<string, LastActivity>();
  {
    const { data: rows } = await supabase
      .from("prospect_activity")
      .select("prospect_id, action, created_at")
      .eq("organization_id", workspaceId)
      .in("prospect_id", ids)
      .order("created_at", { ascending: false });
    for (const row of rows ?? []) {
      if (!row.prospect_id) continue;
      if (activityByProspect.has(row.prospect_id)) continue;
      const at = row.created_at;
      const days = at
        ? Math.max(0, Math.floor((Date.now() - new Date(at).getTime()) / 86400000))
        : 0;
      const sub = activityToLabel(row.action, days);
      activityByProspect.set(row.prospect_id, { ...sub, at });
    }
  }

  return items.map((p) => ({
    ...p,
    bdd_name: p.bdd_id ? (bddNames.get(p.bdd_id) ?? null) : null,
    workflow: workflowByProspect.get(p.id) ?? null,
    convs: convsByProspect.get(p.id) ?? [],
    last_activity: activityByProspect.get(p.id) ?? fallbackLabel(p),
  }));
}
