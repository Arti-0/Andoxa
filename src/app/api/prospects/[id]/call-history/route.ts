import { NextRequest } from "next/server";
import { createApiHandler, Errors } from "@/lib/api";

/**
 * GET /api/prospects/[id]/call-history
 * Returns all call session entries for a given prospect
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  const prospectId = segments[segments.indexOf("prospects") + 1];

  if (!prospectId) throw Errors.notFound("Prospect");

  const { data: entries, error } = await ctx.supabase
    .from("call_session_prospects")
    .select("id, call_session_id, call_duration_s, status, outcome, called_at")
    .eq("prospect_id", prospectId)
    .order("called_at", { ascending: false, nullsFirst: false });

  if (error) throw Errors.internal("Failed to fetch call history");

  const sessionIds = [...new Set((entries ?? []).map((e) => e.call_session_id))];
  let sessionTitles: Record<string, string> = {};
  if (sessionIds.length > 0) {
    const { data: sessions } = await ctx.supabase
      .from("call_sessions")
      .select("id, title")
      .in("id", sessionIds);
    if (sessions) {
      sessionTitles = Object.fromEntries(
        sessions.map((s) => [s.id, s.title ?? "Session d'appels"])
      );
    }
  }

  return (entries ?? []).map((e) => ({
    ...e,
    session_title: sessionTitles[e.call_session_id] ?? "Session d'appels",
  }));
});
