import { createApiHandler, Errors, parseBody } from "../../../../lib/api";
import { NextRequest } from "next/server";

/**
 * GET /api/bdd/[id]
 * Fetch a single list by ID (for display purposes).
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw Errors.notFound("Liste");

  const { data, error } = await ctx.supabase
    .from("bdd")
    .select("id, name, source, proprietaire, created_at, organization_id")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (error || !data) throw Errors.notFound("Liste");
  return data;
});

/**
 * PATCH /api/bdd/[id]
 * Rename a list. Rejects (409) if another list in the same org already has that name.
 */
export const PATCH = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  if (!id) throw Errors.notFound("Liste");

  const body = await parseBody<{ name?: string }>(req);
  const name = String(body.name ?? "").trim();
  if (!name) {
    throw Errors.validation({ name: "Le nom de la liste est requis" });
  }

  // Case-insensitive conflict check — exclude the list being renamed.
  const { data: existing } = await ctx.supabase
    .from("bdd")
    .select("id, name")
    .eq("organization_id", ctx.workspaceId)
    .ilike("name", name)
    .neq("id", id)
    .limit(5);

  const conflict = (existing ?? []).find(
    (l) => l.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (conflict) {
    throw Errors.conflict("Une liste avec ce nom existe déjà");
  }

  const { data, error } = await ctx.supabase
    .from("bdd")
    .update({ name })
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[API] BDD rename error:", error);
    throw Errors.internal("Impossible de renommer la liste");
  }

  return data;
});

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
