import { createApiHandler, Errors, parseBody, type ApiContext } from "../../../../lib/api";
import { NextRequest } from "next/server";
import { invalidate } from "@/lib/cache/redis";
import { createNotification } from "@/lib/notifications/create-notification";
import { enrichProspects } from "@/lib/crm/enrich-prospects";
import { logStatusChange } from "@/lib/prospect-activity";
import { emitWorkflowTrigger } from "@/lib/workflows/fire-trigger";
import { findStatusByAny } from "@/lib/prospects/statuses";
import { automationExclusionPatch } from "@/lib/prospects/automation-opt-out";
import type { Prospect } from "@/lib/types/prospects";
import type { Database, Json } from "@/lib/types/supabase";

type ProspectUpdateRow = Database["public"]["Tables"]["prospects"]["Update"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Reusable inner fetch — used by both this route and /api/prospects/[id]/overview
 * so the detail page only auths once.
 */
export async function getProspectById(
  ctx: ApiContext,
  id: string,
): Promise<Prospect> {
  if (!id) throw Errors.notFound("Prospect");
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data, error } = await ctx.supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (error || !data) {
    throw Errors.notFound("Prospect");
  }

  const [enriched] = await enrichProspects(
    ctx.supabase,
    ctx.workspaceId,
    [data as Prospect],
  );
  return (enriched ?? (data as Prospect)) as Prospect;
}

/**
 * GET /api/prospects/[id]
 * Returns a single prospect with the same enrichments the listing page
 * receives (bdd_name, workflow, convs, last_activity) so the profile
 * banner can render the list pill, channel inventory and the workflow
 * progress card without extra round-trips.
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw Errors.notFound("Prospect");
  return getProspectById(ctx, id);
});

/**
 * PATCH /api/prospects/[id]
 * Update a prospect
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    throw Errors.notFound("Prospect");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    full_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    job_title?: string;
    linkedin_url?: string;
    linkedin?: string;
    website?: string;
    status?: string;
    notes?: string;
    industry?: string;
    employees?: string;
    location?: string;
    budget?: string;
    source?: string;
    /**
     * Toggle the prospect's automation opt-out flag. Translated server-side
     * into a `metadata.automation_excluded` patch via automationExclusionPatch
     * so clients never write raw metadata. Filtered by the campaign + workflow
     * enrollment paths (see lib/prospects/automation-opt-out.ts).
     */
    automation_excluded?: boolean;
  }>(req);

  // Fetch current prospect to detect status changes
  let previousStatus: string | null = null;
  if (body.status) {
    const { data: current } = await ctx.supabase
      .from("prospects")
      .select("status")
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .single();
    previousStatus = (current as { status?: string } | null)?.status ?? null;
  }

  const { linkedin_url, ...rest } = body;
  const updateData: ProspectUpdateRow = {
    updated_at: new Date().toISOString(),
  };
  if (rest.full_name !== undefined) {
    updateData.full_name = rest.full_name.trim() || null;
  }
  if (rest.email !== undefined) {
    updateData.email = rest.email.trim() || null;
  }
  if (rest.phone !== undefined) {
    updateData.phone = rest.phone.trim() || null;
  }
  if (rest.company !== undefined) {
    updateData.company = rest.company.trim() || null;
  }
  if (rest.job_title !== undefined) {
    updateData.job_title = rest.job_title.trim() || null;
  }
  if (rest.linkedin !== undefined) {
    updateData.linkedin = rest.linkedin.trim() || null;
  }
  if (rest.website !== undefined) {
    updateData.website = rest.website.trim() || null;
  }
  if (rest.status !== undefined) {
    updateData.status = rest.status.trim() || null;
  }
  if (rest.notes !== undefined) {
    updateData.notes = rest.notes.trim() || null;
  }
  if (rest.industry !== undefined) {
    updateData.industry = rest.industry.trim() || null;
  }
  if (rest.employees !== undefined) {
    updateData.employees = rest.employees.trim() || null;
  }
  if (rest.location !== undefined) {
    updateData.location = rest.location.trim() || null;
  }
  if (rest.budget !== undefined) {
    updateData.budget = rest.budget.trim() || null;
  }
  if (rest.source !== undefined) {
    updateData.source = rest.source.trim() || null;
  }
  if (linkedin_url !== undefined) {
    updateData.linkedin = linkedin_url.trim() || null;
  }

  // Automation opt-out toggle. Read current metadata once, apply the patch
  // helper, write it back as part of the same update so the toggle and any
  // other field changes commit atomically.
  if (body.automation_excluded !== undefined) {
    const { data: existing, error: metaErr } = await ctx.supabase
      .from("prospects")
      .select("metadata")
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .single();
    if (metaErr || !existing) {
      throw Errors.notFound("Prospect");
    }
    const nextMeta = automationExclusionPatch(
      (existing as { metadata?: Record<string, unknown> | null }).metadata,
      body.automation_excluded
    );
    updateData.metadata =
      (Object.keys(nextMeta).length === 0 ? null : nextMeta) as Json | null;
  }

  const { data, error } = await ctx.supabase
    .from("prospects")
    .update(updateData)
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw Errors.notFound("Prospect");
  }

  if (body.status && previousStatus && body.status !== previousStatus) {
    await logStatusChange(ctx.supabase, {
      organization_id: ctx.workspaceId,
      prospect_id: id,
      actor_id: ctx.userId ?? null,
      from: previousStatus,
      to: body.status,
    });

    // Notification: prospect converted to client. Canonical status is
    // "won"; "closed" was a legacy alias that never matched the actual
    // values written elsewhere (see docs/TAGS_AUDIT.md §1).
    if (body.status === "won") {
      const prospectName = (data as { full_name?: string | null }).full_name?.trim() || "Ce prospect";
      await createNotification(ctx.supabase, {
        title: "Prospect converti 🎉",
        message: `${prospectName} a été marqué comme client`,
        category: "prospect",
        action_type: "prospect_updated",
        actor_id: ctx.userId ?? null,
        organization_id: ctx.workspaceId,
        target_url: `/prospect/${id}`,
        dedupe_key: `prospect:won:${id}`,
      });
    }

    // Fire `on_status_change` workflow trigger. Best-effort: never throw out
    // to the caller — a workflow emitter failure must not break the CRM
    // mutation. The trigger_config's targetStatusId (if set) is checked
    // inside emitWorkflowTrigger via matchesConfig().
    try {
      const incoming = body.status;
      const previous = previousStatus;
      // Resolve incoming and outgoing status rows so we send the canonical
      // ids in the payload — workflow trigger_config stores targetStatusId.
      const [newStatusRow, prevStatusRow] = await Promise.all([
        findStatusByAny(ctx.supabase, ctx.workspaceId, incoming),
        previous
          ? findStatusByAny(ctx.supabase, ctx.workspaceId, previous)
          : Promise.resolve(null),
      ]);
      if (newStatusRow) {
        await emitWorkflowTrigger(ctx.supabase, {
          organizationId: ctx.workspaceId,
          prospectId: id,
          startedByUserId: ctx.userId ?? null,
          payload: {
            kind: "on_status_change",
            statusId: newStatusRow.id,
            fromStatusId: prevStatusRow?.id ?? null,
          },
        });
      }
    } catch {
      // Swallow — Sentry capture happens inside emitWorkflowTrigger.
    }
  }

  await invalidate.prospects(ctx.workspaceId);

  return data;
});

/**
 * DELETE /api/prospects/[id]
 * Soft-delete a prospect (sets deleted_at instead of removing the row)
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    throw Errors.notFound("Prospect");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { error } = await ctx.supabase
    .from("prospects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) {
    throw Errors.internal("Failed to delete prospect");
  }

  await invalidate.prospects(ctx.workspaceId);

  return { deleted: true };
});
