import { createApiHandler, Errors, parseBody } from "../../../../lib/api";
import { NextRequest } from "next/server";
import {
  getValidGoogleAccessToken,
  updateGoogleCalendarEvent,
} from "@/lib/google/calendar";
import * as Sentry from "@sentry/nextjs";
import { insertProspectActivity } from "@/lib/prospect-activity";
import { emitWorkflowTrigger } from "@/lib/workflows/fire-trigger";

type EventUpdateBody = {
  title?: string;
  description?: string;
  /** Host-only notes — never pushed to Google Calendar. */
  internal_notes?: string | null;
  start_time?: string;
  end_time?: string;
  location?: string;
  prospect_id?: string;
  status?: string;
  event_type?: string | null;
  meeting_kind?: string;
  wa_workflow?: boolean;
  pipeline_stage?: string | null;
  attendee_user_ids?: string[];
  is_all_day?: boolean;
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

  // Snapshot prior status so we can detect the "→ noshow" transition after
  // the update succeeds. Fetched in the same workspace scope so RLS holds.
  let previousStatus: string | null = null;
  if (body.status !== undefined) {
    const { data: prev } = await ctx.supabase
      .from("events")
      .select("status")
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId)
      .maybeSingle();
    previousStatus = (prev as { status?: string | null } | null)?.status ?? null;
  }

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  // internal_notes is intentionally never forwarded to Google Calendar.
  if (body.internal_notes !== undefined) updates.internal_notes = body.internal_notes;
  if (body.start_time !== undefined) updates.start_time = body.start_time;
  if (body.end_time !== undefined) updates.end_time = body.end_time;
  if (body.location !== undefined) updates.location = body.location;
  if (body.prospect_id !== undefined) updates.prospect_id = body.prospect_id;
  if (body.status !== undefined) updates.status = body.status;
  if (body.event_type !== undefined) updates.event_type = body.event_type;
  if (body.meeting_kind !== undefined) updates.meeting_kind = body.meeting_kind;
  if (body.wa_workflow !== undefined) updates.wa_workflow = body.wa_workflow;
  if (body.pipeline_stage !== undefined) updates.pipeline_stage = body.pipeline_stage;
  if (body.attendee_user_ids !== undefined) updates.attendee_user_ids = body.attendee_user_ids;
  if (body.is_all_day !== undefined) updates.is_all_day = body.is_all_day;

  if (Object.keys(updates).length === 0) {
    throw Errors.validation({ _: "Aucune modification fournie" });
  }

  const { data, error } = await ctx.supabase
    .from("events")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select("*, prospect:prospect_id(id,full_name,company)")
    .single();

  if (error) {
    if (error.code === "PGRST116") throw Errors.notFound("Événement");
    throw Errors.internal("Failed to update event");
  }

  // -----------------------------------------------------------------
  // No-show transition: activity log + on_no_show workflow trigger.
  // Fires only when the status field actually flips into "noshow" (and
  // wasn't already there). Activity log fixes a long-standing gap — until
  // now, marking a meeting as no-show updated events.status but never
  // wrote the `rdv_no_show` row that prospect_activity supports.
  // -----------------------------------------------------------------
  if (
    body.status === "noshow" &&
    previousStatus !== "noshow" &&
    (data as { prospect_id?: string | null }).prospect_id
  ) {
    const prospectId = (data as { prospect_id: string }).prospect_id;
    const eventTitle =
      typeof (data as { title?: string | null }).title === "string"
        ? (data as { title: string }).title
        : null;

    // Activity log first — read paths consume this independent of triggers.
    await insertProspectActivity(ctx.supabase, {
      organization_id: ctx.workspaceId,
      prospect_id: prospectId,
      actor_id: ctx.userId ?? null,
      action: "rdv_no_show",
      details: { event_id: id, title: eventTitle, previous_status: previousStatus },
    });

    // Trigger emission — best-effort.
    try {
      await emitWorkflowTrigger(ctx.supabase, {
        organizationId: ctx.workspaceId,
        prospectId,
        startedByUserId: ctx.userId ?? null,
        payload: { kind: "on_no_show", eventId: id },
      });
    } catch {
      // Sentry already captures inside emitWorkflowTrigger.
    }
  }

  // Push the change to Google Calendar if this event is mirrored there.
  // Purely additive: we never block the Andoxa-side success on Google sync.
  let googleSyncFailed = false;
  const googleEventId =
    typeof (data as { google_event_id?: string | null }).google_event_id === "string"
      ? (data as { google_event_id: string }).google_event_id
      : null;
  if (googleEventId && ctx.userId) {
    try {
      const token = await getValidGoogleAccessToken(ctx.supabase, ctx.userId);
      if (token) {
        await updateGoogleCalendarEvent(token, {
          eventId: googleEventId,
          summary: body.title,
          description: body.description,
          location: body.location,
          startIso: body.start_time,
          endIso: body.end_time,
        });
      }
    } catch (e) {
      googleSyncFailed = true;
      Sentry.captureException(e, {
        tags: { feature: "calendar", action: "google_event_patch" },
        extra: { eventId: id, googleEventId },
      });
    }
  }

  return { ...(data as Record<string, unknown>), googleSyncFailed };
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
