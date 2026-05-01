import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
  getSearchParams,
} from "../../../lib/api";
import { getValidGoogleAccessToken, createGoogleMeetEvent } from "@/lib/google/calendar";

/**
 * GET /api/events
 * List calendar events
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const params = getSearchParams(req);
  const { offset, pageSize } = getPagination(req);

  let query = ctx.supabase
    .from("events")
    .select("*, prospect:prospect_id(id,full_name,company)", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("start_time", { ascending: true });

  // Filter by date range
  if (params.start) {
    query = query.gte("start_time", params.start);
  }
  if (params.end) {
    query = query.lte("end_time", params.end);
  }

  // Filter by member (created_by)
  if (params.created_by) {
    query = query.eq("created_by", params.created_by);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw Errors.internal("Failed to fetch events");
  }

  return {
    items: data || [],
    total: count || 0,
  };
});

/**
 * POST /api/events
 * Create a new event
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    prospect_id?: string;
    location?: string;
    is_all_day?: boolean;
    google_meet?: boolean;
    attendee_emails?: string[];
    event_type?: string;
    status?: string;
    meeting_kind?: string;
    wa_workflow?: boolean;
    pipeline_stage?: string;
    attendee_user_ids?: string[];
  }>(req);

  // Validation
  if (!body.title) {
    throw Errors.validation({ title: "Le titre est requis" });
  }
  if (!body.start_time || !body.end_time) {
    throw Errors.validation({ 
      start_time: "Les dates sont requises",
      end_time: "Les dates sont requises",
    });
  }

  // Optionally create a Google Meet event
  let meetUrl: string | null = null;
  let googleEventId: string | null = null;

  if (body.google_meet && ctx.userId) {
    try {
      const accessToken = await getValidGoogleAccessToken(ctx.supabase, ctx.userId);
      if (accessToken) {
        const attendeeEmails = Array.isArray(body.attendee_emails)
          ? body.attendee_emails.filter((e) => typeof e === "string" && e.includes("@"))
          : [];
        const cal = await createGoogleMeetEvent(accessToken, {
          summary: body.title,
          description: body.description,
          startIso: body.start_time,
          endIso: body.end_time,
          attendeeEmails: attendeeEmails.length > 0 ? attendeeEmails : undefined,
        });
        meetUrl = cal.meetUrl;
        googleEventId = cal.eventId || null;
      }
    } catch (e) {
      console.error("[api/events POST] Google Meet creation failed:", e);
      // Non-fatal: continue without Meet link
    }
  }

  const { data, error } = await ctx.supabase
    .from("events")
    .insert({
      organization_id: ctx.workspaceId,
      title: body.title,
      description: body.description ?? null,
      start_time: body.start_time,
      end_time: body.end_time,
      prospect_id: body.prospect_id ?? null,
      location: body.location ?? null,
      is_all_day: body.is_all_day ?? false,
      created_by: ctx.userId,
      google_meet_url: meetUrl,
      google_event_id: googleEventId,
      event_type: body.event_type ?? null,
      status: body.status ?? "confirmed",
      meeting_kind: body.meeting_kind ?? "meet",
      wa_workflow: body.wa_workflow ?? false,
      pipeline_stage: body.pipeline_stage ?? null,
      attendee_user_ids: body.attendee_user_ids ?? [],
    })
    .select("*, prospect:prospect_id(id,full_name,company)")
    .single();

  if (error) {
    console.error("[api/events POST] Supabase error:", error);
    const msg = error.message || "Erreur lors de la création de l'événement";
    throw Errors.internal(msg);
  }

  return data;
});
