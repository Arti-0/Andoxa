import { createApiHandler, Errors, parseBody } from "../../../../lib/api";
import { NextRequest } from "next/server";

type EventUpdateBody = {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  prospect_id?: string;
};

function getIdFromRequest(req: NextRequest): string | null {
  const id = req.nextUrl.pathname.split("/").pop();
  return id && id !== "events" ? id : null;
}

/**
 * PATCH /api/events/[id]
 * Update an event
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const id = getIdFromRequest(req);
  if (!id) {
    throw Errors.notFound("Événement");
  }

  const body = await parseBody<EventUpdateBody>(req);
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.start_time !== undefined) updates.start_time = body.start_time;
  if (body.end_time !== undefined) updates.end_time = body.end_time;
  if (body.location !== undefined) updates.location = body.location;
  if (body.prospect_id !== undefined) updates.prospect_id = body.prospect_id;

  if (Object.keys(updates).length === 0) {
    throw Errors.validation({ _: "Aucune modification fournie" });
  }

  const { data, error } = await ctx.supabase
    .from("events")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") throw Errors.notFound("Événement");
    throw Errors.internal("Failed to update event");
  }

  return data;
});

/**
 * DELETE /api/events/[id]
 * Delete an event
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const id = getIdFromRequest(req);
  if (!id) {
    throw Errors.notFound("Événement");
  }

  const { error } = await ctx.supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) {
    throw Errors.internal("Failed to delete event");
  }

  return { success: true };
});
