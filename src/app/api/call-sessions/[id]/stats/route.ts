import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";

/**
 * GET /api/call-sessions/[id]/stats
 * Aggregate stats for a call session
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const segments = new URL(req.url).pathname.split("/");
  const sessionId = segments[segments.indexOf("call-sessions") + 1];

  if (!sessionId || !ctx.workspaceId) throw Errors.notFound("Call session");

  const { data: session } = await ctx.supabase
    .from("call_sessions")
    .select("id, total_duration_s, status, created_at, ended_at")
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (!session) throw Errors.notFound("Call session");

  const { data: prospects } = await ctx.supabase
    .from("call_session_prospects")
    .select("status, outcome, call_duration_s")
    .eq("call_session_id", sessionId);

  const rows = prospects ?? [];
  const total = rows.length;
  const called = rows.filter((r) => r.status === "completed" || r.status === "calling").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const skipped = rows.filter((r) => r.status === "skipped").length;

  const outcomes: Record<string, number> = {};
  for (const r of rows) {
    if (r.outcome) {
      outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
    }
  }

  const durations = rows.map((r) => r.call_duration_s ?? 0).filter((d) => d > 0);
  const totalCallTime = durations.reduce((a, b) => a + b, 0);
  const avgCallTime = durations.length > 0 ? Math.round(totalCallTime / durations.length) : 0;

  return {
    total,
    called,
    completed,
    skipped,
    pending: total - called - skipped,
    outcomes,
    totalCallTime,
    avgCallTime,
    sessionDuration: session.total_duration_s ?? 0,
    sessionStatus: session.status,
  };
});
