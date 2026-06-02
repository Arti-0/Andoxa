import { createApiHandler, Errors, parseBody } from "@/lib/api";
import type { Database } from "@/lib/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type CampaignJobUpdate = Database["public"]["Tables"]["campaign_jobs"]["Update"];

type BulkOp =
  | { op: "set_status"; id: string; status: "paused" | "running" | "failed" }
  | { op: "delete"; id: string }
  | { op: "duplicate"; id: string };

async function duplicateJobInline(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  id: string,
) {
  const { data: source, error: srcErr } = await supabase
    .from("campaign_jobs")
    .select("*")
    .eq("id", id)
    .eq("organization_id", workspaceId)
    .single();
  if (srcErr || !source) throw new Error("Campagne introuvable");

  const sourceMeta = (source.metadata as Record<string, unknown> | null) ?? {};
  const baseName = (sourceMeta.name as string | undefined)?.trim();
  const newMeta = { ...sourceMeta, name: baseName ? `${baseName} (copie)` : "Copie sans titre" };

  const { data: prospects, error: pErr } = await supabase
    .from("campaign_job_prospects")
    .select("prospect_id")
    .eq("job_id", id);
  if (pErr) throw new Error("Impossible de dupliquer les prospects");

  const prospectIds = (prospects ?? []).map((p) => p.prospect_id).filter(Boolean) as string[];

  const { data: newJob, error: insErr } = await supabase
    .from("campaign_jobs")
    .insert({
      organization_id: workspaceId,
      created_by: userId,
      type: source.type,
      status: "draft",
      total_count: prospectIds.length,
      batch_size: source.batch_size,
      delay_ms: source.delay_ms,
      message_template: source.message_template,
      metadata: newMeta,
    })
    .select()
    .single();
  if (insErr || !newJob) throw new Error("Échec de la duplication");

  if (prospectIds.length > 0) {
    const rows = prospectIds.map((pid) => ({ job_id: newJob.id, prospect_id: pid }));
    const { error: rowsErr } = await supabase.from("campaign_job_prospects").insert(rows);
    if (rowsErr) {
      await supabase.from("campaign_jobs").delete().eq("id", newJob.id);
      throw new Error("Impossible d'associer les prospects dupliqués");
    }
  }

  return newJob;
}

/**
 * POST /api/campaigns/jobs/bulk
 * Batch pause / resume / soft-delete / duplicate for campaign_jobs.
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) throw Errors.badRequest("Workspace required");

  const body = await parseBody<{ operations: BulkOp[] }>(req);
  const operations = Array.isArray(body.operations) ? body.operations : [];
  if (operations.length === 0) {
    throw Errors.validation({ operations: "At least one operation required" });
  }

  type Row = {
    ok: boolean;
    op: BulkOp["op"];
    id: string;
    error?: string;
    new_job_id?: string;
  };

  const results: Row[] = [];
  const supabase = ctx.supabase;
  const ws = ctx.workspaceId;
  const userId = ctx.userId;

  for (const op of operations) {
    try {
      if (op.op === "set_status") {
        if (!["paused", "running", "failed"].includes(op.status)) {
          throw new Error("Statut invalide");
        }
        const updates: CampaignJobUpdate = { status: op.status };
        // Only stamp started_at on the first run — resuming must not reset the
        // campaign's launch date (see jobs/[id] PATCH for rationale).
        if (op.status === "running") {
          const { data: existing } = await supabase
            .from("campaign_jobs")
            .select("started_at")
            .eq("id", op.id)
            .eq("organization_id", ws)
            .single();
          if (!existing?.started_at) updates.started_at = new Date().toISOString();
        }
        const { data, error } = await supabase
          .from("campaign_jobs")
          .update(updates)
          .eq("id", op.id)
          .eq("organization_id", ws)
          .select()
          .single();
        if (error || !data) throw new Error("Campagne introuvable");
        results.push({ ok: true, op: op.op, id: op.id });
      } else if (op.op === "delete") {
        const { data: existing, error: fetchErr } = await supabase
          .from("campaign_jobs")
          .select("created_by")
          .eq("id", op.id)
          .eq("organization_id", ws)
          .single();
        if (fetchErr || !existing) throw new Error("Campagne introuvable");
        if (existing.created_by && existing.created_by !== userId) {
          throw new Error("Réservé au créateur");
        }
        const { error } = await supabase
          .from("campaign_jobs")
          .update({ deleted_at: new Date().toISOString() } as CampaignJobUpdate)
          .eq("id", op.id)
          .eq("organization_id", ws);
        if (error) throw new Error("Suppression impossible");
        results.push({ ok: true, op: op.op, id: op.id });
      } else if (op.op === "duplicate") {
        const nj = await duplicateJobInline(supabase, ws, userId, op.id);
        results.push({ ok: true, op: op.op, id: op.id, new_job_id: nj.id });
      }
    } catch (e: unknown) {
      results.push({
        ok: false,
        op: op.op,
        id: op.id,
        error: e instanceof Error ? e.message : "Erreur",
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const okRows = results.filter((r) => r.ok);

  if (okRows.length === 0 && failed.length > 0) {
    throw Errors.badRequest(failed.map((f) => f.error).join("; "));
  }

  return { results };
});
