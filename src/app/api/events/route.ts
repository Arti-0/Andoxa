import { createApiHandler, Errors, getPagination, getSearchParams, parseBody } from "@/lib/api";
import { generateMockCalendarEvents } from "@/lib/mock-stats/calendar-events";
import { isMockStatsEnabled } from "@/lib/mock-stats";
import { getValidGoogleAccessToken, createGoogleMeetEvent } from "@/lib/google/calendar";
import type { Database } from "@/lib/types/supabase";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventStatus = NonNullable<EventInsert["status"]>;
type MeetingKind = NonNullable<EventInsert["meeting_kind"]>;

const EVENT_STATUSES = [
  "confirmed",
  "done",
  "pending",
  "noshow",
  "internal",
] as const satisfies readonly EventStatus[];

const MEETING_KINDS = [
  "meet",
  "zoom",
  "inperson",
  "phone",
  "other",
] as const satisfies readonly MeetingKind[];

function coerceEventStatus(raw: string | undefined): EventStatus {
  return raw && EVENT_STATUSES.includes(raw as EventStatus)
    ? (raw as EventStatus)
    : "confirmed";
}

function coerceMeetingKind(raw: string | undefined): MeetingKind {
  return raw && MEETING_KINDS.includes(raw as MeetingKind)
    ? (raw as MeetingKind)
    : "meet";
}

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

  if (isMockStatsEnabled()) {
    const rangeStart = params.start ? new Date(params.start) : new Date();
    const rangeEnd = params.end
      ? new Date(params.end)
      : new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: membersData } = await ctx.supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", ctx.workspaceId);

    const colleagueIds = (membersData ?? [])
      .map((m) => m.user_id)
      .filter((id): id is string => !!id && id !== ctx.userId);

    const items = generateMockCalendarEvents({
      rangeStart,
      rangeEnd,
      orgId: ctx.workspaceId,
      userId: ctx.userId!,
      colleagueIds,
    });

    const paged = items.slice(offset, offset + pageSize);
    return { items: paged, total: items.length };
  }

  // Filter by member (created_by)
  if (params.created_by) {
    query = query.eq("created_by", params.created_by);
  }

  // Filter by source (Calendar #3). The calendar grid passes
  // `?source=andoxa` so colleague columns never display rows that were
  // synced in from a Google calendar — those should stay confined to the
  // current user's "Google Calendar" personal track. Accepted values:
  //   • "andoxa"  — every row whose source isn't 'google' (incl. NULL,
  //                 'andoxa', 'booking', and any future internal source)
  //   • "google"  — only google-synced rows
  // omitting the param returns everything (current default).
  //
  // History: previously used `.or("source.is.null,source.neq.google")`
  // which under some PostgREST/Supabase combos returned an empty set when
  // the OR was misparsed alongside other filters. The explicit IN list is
  // safer; keep extending it if new source values are added.
  if (params.source === "andoxa") {
    query = query.or(
      "source.in.(andoxa,booking,manual,unipile),source.is.null"
    );
  } else if (params.source === "google") {
    query = query.eq("source", "google");
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
    /** Whether Google Calendar should email invitees. Default false. */
    notify_attendees?: boolean;
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
        // Resolve emails for invited colleagues (attendee_user_ids) so the
        // Google Meet invite goes out and the meeting appears in their
        // Google calendar too — Calendar #5.
        const userIds = Array.isArray(body.attendee_user_ids)
          ? body.attendee_user_ids.filter((id): id is string => typeof id === "string")
          : [];
        if (userIds.length > 0) {
          const { data: profileEmails } = await ctx.supabase
            .from("profiles")
            .select("email")
            .in("id", userIds);
          for (const p of profileEmails ?? []) {
            const email = (p as { email?: string | null }).email;
            if (email && email.includes("@") && !attendeeEmails.includes(email)) {
              attendeeEmails.push(email);
            }
          }
        }
        const cal = await createGoogleMeetEvent(accessToken, {
          summary: body.title,
          description: body.description,
          startIso: body.start_time,
          endIso: body.end_time,
          attendeeEmails: attendeeEmails.length > 0 ? attendeeEmails : undefined,
          notifyAttendees: body.notify_attendees === true,
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
      // Stamp the row's origin explicitly so the `?source=andoxa` filter
      // (Calendar #3) keeps working even when newer columns/migrations
      // change the default. Constraint added in migration 044.
      source: "andoxa",
      created_by: ctx.userId,
      google_meet_url: meetUrl,
      google_event_id: googleEventId,
      event_type: body.event_type ?? null,
      status: coerceEventStatus(body.status),
      meeting_kind: coerceMeetingKind(body.meeting_kind),
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
