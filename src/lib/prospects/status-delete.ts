import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countProspectsOnStatus,
  getProspectStatusRow,
  getStatusUsage,
  rewriteDefinitionStatusKey,
  rewriteTriggerConfigStatusId,
  toDbError,
} from "./status-usage";

/**
 * A user-actionable problem with the delete/transfer request itself — a missing
 * status, or a replacement that's missing/identical. The message is clean,
 * French, and safe to show end users (the route surfaces it as a 400). Distinct
 * from the wrapped Postgres errors from `toDbError`, which are logged but never
 * shown raw.
 */
export class StatusActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusActionError";
  }
}

export async function transferProspectsAndRewriteWorkflows(
  supabase: SupabaseClient,
  organizationId: string,
  fromStatusId: string,
  toStatusId: string,
): Promise<{ prospectsUpdated: number; workflowsUpdated: number }> {
  if (fromStatusId === toStatusId) {
    throw new StatusActionError("Le statut de remplacement doit être différent");
  }

  const [fromStatus, toStatus] = await Promise.all([
    getProspectStatusRow(supabase, organizationId, fromStatusId),
    getProspectStatusRow(supabase, organizationId, toStatusId),
  ]);
  if (!fromStatus) throw new StatusActionError("Statut introuvable");
  if (!toStatus) {
    throw new StatusActionError("Statut de remplacement introuvable");
  }
  if (toStatus.id === fromStatus.id) {
    throw new StatusActionError("Le statut de remplacement doit être différent");
  }

  const prospectCount = await countProspectsOnStatus(
    supabase,
    organizationId,
    fromStatusId,
    fromStatus.key,
  );

  let prospectsUpdated = 0;
  if (prospectCount > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("prospects")
      .update({
        status_id: toStatus.id,
        status: toStatus.key,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId)
      // Intentionally NOT filtering on deleted_at: soft-deleted prospects also
      // hold a status_id/status referencing this row. We must reassign them too,
      // otherwise their `status` text is stranded on a now-deleted key (status_id
      // is FK ON DELETE SET NULL, but the text column has no such safety net).
      .or(`status_id.eq.${fromStatusId},status.eq.${fromStatus.key}`)
      .select("id");
    if (error) throw toDbError("Transfert des prospects échoué", error);
    prospectsUpdated = (data ?? []).length;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workflows, error: wfError } = await (supabase as any)
    .from("workflows")
    .select(
      "id, trigger_kind, trigger_config, draft_definition, published_definition",
    )
    .eq("organization_id", organizationId);
  if (wfError) throw toDbError("Lecture des workflows échouée", wfError);

  let workflowsUpdated = 0;
  const workflowFailures: string[] = [];
  for (const wf of workflows ?? []) {
    const updates: Record<string, unknown> = {};
    const triggerRewrite = rewriteTriggerConfigStatusId(
      wf.trigger_kind,
      wf.trigger_config,
      fromStatusId,
      toStatusId,
    );
    if (triggerRewrite.changed) {
      updates.trigger_config = triggerRewrite.config;
    }

    const draftRewrite = rewriteDefinitionStatusKey(
      wf.draft_definition,
      fromStatus.key,
      toStatus.key,
    );
    if (draftRewrite.changed) {
      updates.draft_definition = draftRewrite.definition;
    }

    const publishedRewrite = rewriteDefinitionStatusKey(
      wf.published_definition,
      fromStatus.key,
      toStatus.key,
    );
    if (publishedRewrite.changed) {
      updates.published_definition = publishedRewrite.definition;
    }

    if (Object.keys(updates).length === 0) continue;

    updates.updated_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("workflows")
      .update(updates)
      .eq("id", wf.id)
      .eq("organization_id", organizationId);
    if (error) {
      // A single un-updatable workflow row — e.g. a legacy row whose
      // `trigger_kind` violates a newer CHECK constraint — must NOT block
      // deleting the status and transferring prospects (Postgres re-validates
      // CHECK constraints on every UPDATE, even for columns we don't touch).
      // Skip it and carry on; the dangling status reference is recoverable.
      console.error(
        `[status-delete] workflow ${wf.id} rewrite skipped: ${error.message}`,
      );
      workflowFailures.push(wf.id);
      continue;
    }
    workflowsUpdated += 1;
  }

  if (workflowFailures.length > 0) {
    console.warn(
      `[status-delete] ${workflowFailures.length} workflow(s) could not be rewritten: ${workflowFailures.join(", ")}`,
    );
  }

  return { prospectsUpdated, workflowsUpdated };
}

export async function deleteProspectStatus(
  supabase: SupabaseClient,
  organizationId: string,
  statusId: string,
  transferToId?: string | null,
): Promise<{ prospectsUpdated: number; workflowsUpdated: number }> {
  // Permanent (system) statuses can't be deleted — the CRM and campaign
  // automation rely on them. Renaming/recolouring stays available via PATCH.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sysRow } = await (supabase as any)
    .from("prospect_statuses")
    .select("is_system")
    .eq("id", statusId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (sysRow?.is_system) {
    throw new StatusActionError(
      "Ce statut est permanent et ne peut pas être supprimé.",
    );
  }

  const usage = await getStatusUsage(supabase, organizationId, statusId);
  if (!usage) throw new StatusActionError("Statut introuvable");

  const needsTransfer =
    usage.prospectCount > 0 || usage.workflows.length > 0;

  if (needsTransfer) {
    if (!transferToId) {
      throw new StatusActionError(
        "Choisissez un statut de remplacement pour transférer les prospects et mettre à jour les workflows.",
      );
    }
    const result = await transferProspectsAndRewriteWorkflows(
      supabase,
      organizationId,
      statusId,
      transferToId,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("prospect_statuses")
      .delete()
      .eq("id", statusId)
      .eq("organization_id", organizationId);
    if (error) throw toDbError("Suppression du statut en base échouée", error);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("prospect_statuses")
    .delete()
    .eq("id", statusId)
    .eq("organization_id", organizationId);
  if (error) throw toDbError("Suppression du statut en base échouée", error);
  return { prospectsUpdated: 0, workflowsUpdated: 0 };
}
