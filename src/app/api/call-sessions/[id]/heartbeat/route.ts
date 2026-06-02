import { createApiHandler, Errors } from "@/lib/api";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/types/supabase";

type CallSessionUpdate = Database["public"]["Tables"]["call_sessions"]["Update"];

/**
 * POST /api/call-sessions/[id]/heartbeat
 *
 * Marks the current user as actively present in this session. The call
 * interface pings this on a short interval; the list/detail queries derive
 * "En cours" from how recent `active_heartbeat_at` is (see
 * lib/call-sessions/presence.ts). No heartbeat for ≥60s → the session reads as
 * paused, so leaving the tab auto-pauses it without any explicit action.
 *
 * `DELETE` clears presence immediately (explicit "I left").
 */

function extractSessionId(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("heartbeat");
  return i > 0 ? (parts[i - 1] ?? null) : null;
}

export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) throw Errors.badRequest("Workspace required");
  const id = extractSessionId(req);
  if (!id) throw Errors.badRequest("ID requis");

  const updates: CallSessionUpdate = {
    active_user_id: ctx.userId,
    active_heartbeat_at: new Date().toISOString(),
  } as CallSessionUpdate;

  const { error } = await ctx.supabase
    .from("call_sessions")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .neq("status", "completed");
  if (error) throw Errors.internal("Heartbeat failed");

  return { ok: true as const };
});

export const DELETE = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId || !ctx.userId) throw Errors.badRequest("Workspace required");
  const id = extractSessionId(req);
  if (!id) throw Errors.badRequest("ID requis");

  // Only clear presence if *we* are the active user (avoid stomping a
  // teammate who picked it up after us).
  const updates: CallSessionUpdate = {
    active_user_id: null,
    active_heartbeat_at: null,
  } as CallSessionUpdate;

  // `active_user_id` is newer than the generated DB types — cast the filter
  // builder so we can scope the clear to our own presence row.
  const { error } = await (
    ctx.supabase
      .from("call_sessions")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", ctx.workspaceId) as unknown as {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    }
  ).eq("active_user_id", ctx.userId);
  if (error) throw Errors.internal("Clear presence failed");

  return { ok: true as const };
});
