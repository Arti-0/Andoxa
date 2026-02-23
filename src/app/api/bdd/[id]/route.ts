import { createApiHandler, Errors } from "../../../../lib/api";
import { NextRequest } from "next/server";

/**
 * DELETE /api/bdd/[id]
 * Delete a BDD (liste). Sets bdd_id=null on linked prospects, then deletes the BDD.
 */
export const DELETE = createApiHandler(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    throw Errors.notFound("Liste");
  }
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  // 1. Unlink prospects (set bdd_id to null)
  const { error: unlinkError } = await ctx.supabase
    .from("prospects")
    .update({ bdd_id: null })
    .eq("bdd_id", id)
    .eq("organization_id", ctx.workspaceId);

  if (unlinkError) {
    console.error("[API] BDD unlink prospects error:", unlinkError);
    throw Errors.internal("Failed to unlink prospects");
  }

  // 2. Delete the BDD
  const { error: deleteError } = await ctx.supabase
    .from("bdd")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId);

  if (deleteError) {
    console.error("[API] BDD delete error:", deleteError);
    throw Errors.internal("Failed to delete liste");
  }

  return { deleted: true };
});
