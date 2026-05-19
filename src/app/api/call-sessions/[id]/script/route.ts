import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { NextRequest } from "next/server";

function getIdFromRequest(req: NextRequest): string | null {
  // .../call-sessions/<id>/script
  const parts = req.nextUrl.pathname.split("/");
  const i = parts.indexOf("call-sessions");
  return i >= 0 ? (parts[i + 1] ?? null) : null;
}

/**
 * GET /api/call-sessions/[id]/script
 * Returns { script_template: string | null } for the session, scoped to the
 * caller's workspace.
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = getIdFromRequest(req as NextRequest);
  if (!id) throw Errors.notFound("Session");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (ctx.supabase as any)
    .from("call_sessions")
    .select("script_template")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (error) throw Errors.internal("Erreur lecture script");
  if (!data) throw Errors.notFound("Session");

  return { script_template: (data.script_template as string | null) ?? null };
});

/**
 * PUT /api/call-sessions/[id]/script
 * Body: { script_template: string | null }
 * Stores plain text — interpolation happens client-side at render time.
 */
export const PUT = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = getIdFromRequest(req as NextRequest);
  if (!id) throw Errors.notFound("Session");

  const body = await parseBody<{ script_template?: string | null }>(req);
  const next =
    typeof body.script_template === "string"
      ? body.script_template.slice(0, 20_000)
      : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("call_sessions")
    .update({ script_template: next })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (error) throw Errors.internal("Erreur écriture script");
  return { success: true, script_template: next };
});
