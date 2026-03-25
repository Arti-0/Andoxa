import { createApiHandler, Errors, parseBody } from "../../../../lib/api";
import { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/prospects/[id]
 * Get a single prospect
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    throw Errors.notFound("Prospect");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data, error } = await ctx.supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (error || !data) {
    throw Errors.notFound("Prospect");
  }

  return data;
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
  const updateData: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };
  if (linkedin_url !== undefined) {
    updateData.linkedin = linkedin_url;
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
    await ctx.supabase.from("prospect_activity").insert({
      organization_id: ctx.workspaceId,
      prospect_id: id,
      workflow_id: null,
      actor_id: ctx.userId ?? null,
      action: "status_change",
      details: { from: previousStatus, to: body.status },
    });
  }

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

  return { deleted: true };
});
