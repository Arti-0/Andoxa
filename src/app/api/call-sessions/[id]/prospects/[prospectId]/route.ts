import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";

function getIds(req: NextRequest) {
  const segments = new URL(req.url).pathname.replace(/\/+$/, "").split("/");
  const csIdx = segments.indexOf("call-sessions");
  return {
    sessionId: segments[csIdx + 1] ?? "",
    prospectId: segments[csIdx + 3] ?? "",
  };
}

/**
 * PATCH /api/call-sessions/[id]/prospects/[prospectId]
 * Update per-prospect call tracking
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  const { sessionId, prospectId } = getIds(req);
  if (!sessionId || !prospectId || !ctx.workspaceId) {
    console.error("[PATCH call-session-prospect] Missing ids", { sessionId, prospectId, workspaceId: ctx.workspaceId });
    throw Errors.badRequest("Session and prospect IDs required");
  }

  const { data: session, error: sessionError } = await ctx.supabase
    .from("call_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (!session) {
    console.error("[PATCH call-session-prospect] Session not found", { sessionId, workspaceId: ctx.workspaceId, dbError: sessionError?.message });
    throw Errors.notFound("Call session");
  }

  const body = await parseBody<{
    status?: string;
    call_duration_s?: number;
    called_at?: string;
    outcome?: string;
  }>(req);

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.call_duration_s !== undefined) updates.call_duration_s = body.call_duration_s;
  if (body.called_at !== undefined) updates.called_at = body.called_at;
  if (body.outcome !== undefined) updates.outcome = body.outcome;

  if (Object.keys(updates).length === 0) {
    console.warn("[PATCH call-session-prospect] Empty update body", { sessionId, prospectId });
    throw Errors.badRequest("No fields to update");
  }

  const { data, error } = await ctx.supabase
    .from("call_session_prospects")
    .update(updates as { status?: string; call_duration_s?: number; called_at?: string; outcome?: string })
    .eq("call_session_id", sessionId)
    .eq("prospect_id", prospectId)
    .select()
    .single();

  if (error || !data) {
    console.error("[PATCH call-session-prospect] Prospect link not found", { sessionId, prospectId, dbError: error?.message });
    throw Errors.notFound("Prospect in session");
  }

  return data;
});
