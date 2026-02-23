import {
  createApiHandler,
  Errors,
  parseBody,
} from "../../../../../lib/api";
import { NextRequest } from "next/server";

/**
 * POST /api/call-sessions/[id]/notes
 * Add or update a note for a prospect in the session
 * Body: { prospect_id: string, content: string }
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  const sessionId = new URL(req.url).pathname.split("/").slice(0, -1).pop();
  if (!sessionId) {
    throw Errors.notFound("Call session");
  }
  if (!ctx.workspaceId || !ctx.userId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{ prospect_id: string; content: string }>(req);
  if (!body.prospect_id) {
    throw Errors.validation({ prospect_id: "Champ requis" });
  }

  const { data: session } = await ctx.supabase
    .from("call_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("organization_id", ctx.workspaceId)
    .single();

  if (!session) {
    throw Errors.notFound("Call session");
  }

  const content = body.content ?? "";

  const { data: existing } = await ctx.supabase
    .from("call_session_notes")
    .select("id")
    .eq("call_session_id", sessionId)
    .eq("prospect_id", body.prospect_id)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await ctx.supabase
      .from("call_session_notes")
      .update({ content, updated_at: now })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw Errors.internal("Failed to update note");
    }
    return data;
  }

  const { data, error } = await ctx.supabase
    .from("call_session_notes")
    .insert({
      call_session_id: sessionId,
      prospect_id: body.prospect_id,
      author_id: ctx.userId,
      content,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    throw Errors.internal("Failed to create note");
  }
  return data;
});
