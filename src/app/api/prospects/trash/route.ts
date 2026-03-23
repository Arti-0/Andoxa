import { createApiHandler, Errors, getPagination } from "@/lib/api";

/**
 * GET /api/prospects/trash
 * List soft-deleted prospects for the current workspace
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { page, pageSize, offset } = getPagination(req);

  const { data, error, count } = await ctx.supabase
    .from("prospects")
    .select("id, full_name, email, company, phone, deleted_at", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw Errors.internal("Failed to fetch deleted prospects");

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
});
