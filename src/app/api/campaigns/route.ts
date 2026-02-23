import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
} from "../../../lib/api";

/**
 * GET /api/campaigns
 * List campaigns
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const { page, pageSize, offset } = getPagination(req);

  const { data, error, count } = await ctx.supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw Errors.internal("Failed to fetch campaigns");
  }

  return {
    items: data || [],
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  };
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    name: string;
    subject: string;
    content: string;
    prospect_ids?: string[];
  }>(req);

  // Validation
  if (!body.name) {
    throw Errors.validation({ name: "Le nom est requis" });
  }
  if (!body.subject) {
    throw Errors.validation({ subject: "Le sujet est requis" });
  }

  const { data, error } = await ctx.supabase
    .from("campaigns")
    .insert({
      organization_id: ctx.workspaceId,
      user_id: ctx.userId,
      name: body.name,
      subject: body.subject,
      content: body.content,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    throw Errors.internal("Failed to create campaign");
  }

  return data;
});
