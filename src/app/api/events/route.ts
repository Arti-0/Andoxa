import {
  createApiHandler,
  Errors,
  parseBody,
  getPagination,
  getSearchParams,
} from "../../../lib/api";

/**
 * GET /api/events
 * List calendar events
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const params = getSearchParams(req);
  const { offset, pageSize } = getPagination(req);

  let query = ctx.supabase
    .from("events")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("start_time", { ascending: true });

  // Filter by date range
  if (params.start) {
    query = query.gte("start_time", params.start);
  }
  if (params.end) {
    query = query.lte("end_time", params.end);
  }

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    throw Errors.internal("Failed to fetch events");
  }

  return {
    items: data || [],
    total: count || 0,
  };
});

/**
 * POST /api/events
 * Create a new event
 */
export const POST = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) {
    throw Errors.badRequest("Workspace required");
  }

  const body = await parseBody<{
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    prospect_id?: string;
    location?: string;
    is_all_day?: boolean;
  }>(req);

  // Validation
  if (!body.title) {
    throw Errors.validation({ title: "Le titre est requis" });
  }
  if (!body.start_time || !body.end_time) {
    throw Errors.validation({ 
      start_time: "Les dates sont requises",
      end_time: "Les dates sont requises",
    });
  }

  const { data, error } = await ctx.supabase
    .from("events")
    .insert({
      organization_id: ctx.workspaceId,
      title: body.title,
      description: body.description,
      start_time: body.start_time,
      end_time: body.end_time,
      prospect_id: body.prospect_id,
      location: body.location,
      is_all_day: body.is_all_day || false,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    throw Errors.internal("Failed to create event");
  }

  return data;
});
