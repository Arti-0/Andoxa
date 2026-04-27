import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";

type CalendarPreferences = {
  hidden_calendar_ids?: string[];
  hidden_member_ids?: string[];
};

function sanitize(input: CalendarPreferences): CalendarPreferences {
  const out: CalendarPreferences = {};
  if (Array.isArray(input.hidden_calendar_ids)) {
    out.hidden_calendar_ids = input.hidden_calendar_ids.filter(
      (s): s is string => typeof s === "string" && s.length > 0
    );
  }
  if (Array.isArray(input.hidden_member_ids)) {
    out.hidden_member_ids = input.hidden_member_ids.filter(
      (s): s is string => typeof s === "string" && s.length > 0
    );
  }
  return out;
}

/**
 * PATCH /api/profile/calendar-preferences
 * Replace the user's calendar visibility prefs (hidden calendars / hidden members).
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.userId) throw Errors.badRequest("Authentification requise");

  const body = await parseBody<CalendarPreferences>(req);
  const next = sanitize(body);

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({
      calendar_preferences: next as unknown as never,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.userId)
    .select("calendar_preferences")
    .single();

  if (error) {
    throw Errors.internal("Préférences de calendrier non enregistrées");
  }

  const row = data as unknown as { calendar_preferences?: CalendarPreferences } | null;
  return { calendar_preferences: row?.calendar_preferences ?? next };
});
