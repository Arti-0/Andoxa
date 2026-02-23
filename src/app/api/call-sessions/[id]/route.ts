import { createApiHandler, Errors } from "../../../../lib/api";
import { NextRequest } from "next/server";

/**
 * GET /api/call-sessions/[id]
 * Get session with prospects and notes
 */
export const GET = createApiHandler(async (req: NextRequest, ctx) => {
  const sessionId = new URL(req.url).pathname.split("/").pop();

  if (!sessionId) {
    throw Errors.notFound("Call session");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data: session, error: sessionError } = await ctx.supabase
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (sessionError || !session) {
    throw Errors.notFound("Call session");
  }

  const [prospectsRes, notesRes] = await Promise.all([
    ctx.supabase
      .from("call_session_prospects")
      .select("prospect_id")
      .eq("call_session_id", sessionId)
      .order("prospect_id"),
    ctx.supabase
      .from("call_session_notes")
      .select("*")
      .eq("call_session_id", sessionId),
  ]);

  const prospectIds = (prospectsRes.data ?? []).map((r) => r.prospect_id);
  const notes = notesRes.data ?? [];

  const prospects =
    prospectIds.length > 0
      ? (
          await ctx.supabase
            .from("prospects")
            .select("id, full_name, email, company, phone")
            .in("id", prospectIds)
        ).data ?? []
      : [];

  const prospectOrder = new Map(prospectIds.map((id, i) => [id, i]));
  prospects.sort(
    (a, b) => (prospectOrder.get(a.id) ?? 0) - (prospectOrder.get(b.id) ?? 0)
  );

  const notesByProspect = new Map<string, (typeof notes)[number][]>();
  for (const n of notes) {
    const arr = notesByProspect.get(n.prospect_id) ?? [];
    arr.push(n);
    notesByProspect.set(n.prospect_id, arr);
  }

  return {
    ...session,
    prospects,
    notesByProspect: Object.fromEntries(notesByProspect),
  };
});

/**
 * PATCH /api/call-sessions/[id]
 * End session (set ended_at)
 */
export const PATCH = createApiHandler(async (req: NextRequest, ctx) => {
  const sessionId = new URL(req.url).pathname.split("/").pop();
  if (!sessionId) {
    throw Errors.notFound("Call session");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { data, error } = await ctx.supabase
    .from("call_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !data) {
    throw Errors.notFound("Call session");
  }

  return data;
});
