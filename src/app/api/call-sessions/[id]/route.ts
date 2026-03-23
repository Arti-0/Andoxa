import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";

function getSessionId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/");
  const idx = segments.indexOf("call-sessions");
  return segments[idx + 1];
}

/**
 * GET /api/call-sessions/[id]
 * Get session with prospects (enriched), notes, and per-prospect tracking data
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const sessionId = getSessionId(req);
  if (!sessionId || !ctx.workspaceId) throw Errors.notFound("Call session");

  const { data: session, error: sessionError } = await ctx.supabase
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (sessionError || !session) throw Errors.notFound("Call session");

  const [cspRes, notesRes] = await Promise.all([
    ctx.supabase
      .from("call_session_prospects")
      .select("*")
      .eq("call_session_id", sessionId),
    ctx.supabase
      .from("call_session_notes")
      .select("*")
      .eq("call_session_id", sessionId),
  ]);

  const cspRows = cspRes.data ?? [];
  const notes = notesRes.data ?? [];
  const prospectIds = cspRows.map((r) => r.prospect_id);

  const prospects =
    prospectIds.length > 0
      ? (
          await ctx.supabase
            .from("prospects")
            .select("id, full_name, email, company, phone, job_title, linkedin, metadata")
            .in("id", prospectIds)
        ).data ?? []
      : [];

  const cspMap = new Map(cspRows.map((r) => [r.prospect_id, r]));
  const enriched = prospects.map((p) => {
    const csp = cspMap.get(p.id);
    return {
      ...p,
      call_duration_s: csp?.call_duration_s ?? 0,
      call_status: csp?.status ?? "pending",
      called_at: csp?.called_at ?? null,
      outcome: csp?.outcome ?? null,
    };
  });

  const notesByProspect: Record<string, typeof notes> = {};
  for (const n of notes) {
    (notesByProspect[n.prospect_id] ??= []).push(n);
  }

  return {
    ...session,
    prospects: enriched,
    notesByProspect,
  };
});

/**
 * PATCH /api/call-sessions/[id]
 * Update session: end, pause, set total_duration_s, etc.
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  const sessionId = getSessionId(req);
  if (!sessionId || !ctx.workspaceId) throw Errors.notFound("Call session");

  const body = await parseBody<{
    ended_at?: string;
    total_duration_s?: number;
    status?: string;
  }>(req);

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.total_duration_s !== undefined) updates.total_duration_s = body.total_duration_s;
  if (body.ended_at !== undefined) updates.ended_at = body.ended_at;
  if (body.status === "completed" && !body.ended_at) {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await ctx.supabase
    .from("call_sessions")
    .update(updates as { status?: string; total_duration_s?: number; ended_at?: string })
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound("Call session");

  return data;
});
