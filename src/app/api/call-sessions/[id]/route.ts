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
      .eq("call_session_id", sessionId)
      .order("id", { ascending: true }),
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
            .select("id, full_name, email, company, phone, job_title, linkedin, metadata, status, notes")
            .in("id", prospectIds)
        ).data ?? []
      : [];

  const cspMap = new Map(cspRows.map((r) => [r.prospect_id, r]));
  const prospectById = new Map(prospects.map((p) => [p.id, p]));
  const enriched = cspRows
    .map((row) => {
      const p = prospectById.get(row.prospect_id);
      if (!p) return null;
      return {
        ...p,
        call_duration_s: row.call_duration_s ?? 0,
        call_status: row.status ?? "pending",
        called_at: row.called_at ?? null,
        outcome: row.outcome ?? null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

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
 * DELETE /api/call-sessions/[id]
 * Permanently delete a call session and its associated prospects/notes.
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  const sessionId = getSessionId(req);
  if (!sessionId || !ctx.workspaceId) throw Errors.notFound("Call session");

  const { error } = await ctx.supabase
    .from("call_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Impossible de supprimer la session");

  return { success: true };
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
    .update(updates as { status?: "active" | "running" | "paused" | "completed"; total_duration_s?: number | null; ended_at?: string | null })
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .select()
    .single();

  if (error || !data) throw Errors.notFound("Call session");

  return data;
});
