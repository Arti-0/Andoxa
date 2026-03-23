import { createApiHandler, Errors } from "@/lib/api";
import { NextRequest } from "next/server";

/**
 * POST /api/prospects/[id]/restore
 * Restore a soft-deleted prospect
 */
export const POST = createApiHandler(async (req: NextRequest, ctx) => {
  const id = new URL(req.url).pathname.split("/").at(-2);

  if (!id) throw Errors.notFound("Prospect");
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { data, error } = await ctx.supabase
    .from("prospects")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .not("deleted_at", "is", null)
    .select()
    .single();

  if (error || !data) throw Errors.notFound("Prospect");

  return data;
});
