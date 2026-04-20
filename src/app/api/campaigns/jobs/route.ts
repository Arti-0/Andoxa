import { createApiHandler, Errors, parseBody, getPagination } from "@/lib/api";

/**
 * POST /api/campaigns/jobs
 * Create a campaign job with batch processing
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const body = await parseBody<{
      name?: string;
      type: "invite" | "invite_with_note" | "contact" | "whatsapp";
      prospect_ids: string[];
      message_template?: string;
      batch_size?: number;
      delay_ms?: number;
      launch_now?: boolean;
      message_overrides?: Record<string, string>;
    }>(req);

    const allowedTypes = ["invite", "invite_with_note", "contact", "whatsapp"] as const;
    if (!body.type || !allowedTypes.includes(body.type)) {
      throw Errors.validation({
        type: "Must be 'invite', 'invite_with_note', 'contact', or 'whatsapp'",
      });
    }
    if (!body.prospect_ids?.length) {
      throw Errors.validation({ prospect_ids: "At least one prospect required" });
    }

    const overrides = body.message_overrides ?? {};
    const metadata: Record<string, string | Record<string, string>> = {};
    if (overrides && Object.keys(overrides).length > 0) metadata.message_overrides = overrides;
    if (body.name?.trim()) metadata.name = body.name.trim();

    const initialStatus = body.launch_now ? "pending" : "draft";

    const { data: job, error: jobError } = await ctx.supabase
      .from("campaign_jobs")
      .insert({
        organization_id: ctx.workspaceId,
        created_by: ctx.userId!,
        type: body.type,
        status: initialStatus,
        total_count: body.prospect_ids.length,
        batch_size: body.batch_size ?? 10,
        delay_ms: body.delay_ms ?? 120000,
        message_template: body.message_template ?? null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })
      .select()
      .single();

    if (jobError || !job) throw Errors.internal("Failed to create campaign job");

    const rows = body.prospect_ids.map((pid) => ({
      job_id: job.id,
      prospect_id: pid,
    }));

    const { error: insertError } = await ctx.supabase
      .from("campaign_job_prospects")
      .insert(rows);

    if (insertError) throw Errors.internal("Failed to add prospects to job");

    return job;
  },
  { rateLimit: { name: "campaign-jobs", requests: 5, window: "1 m" } }
);

/**
 * GET /api/campaigns/jobs
 * List campaign jobs for current workspace
 */
export const GET = createApiHandler(async (req, ctx) => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

  const { page, pageSize, offset } = getPagination(req);

  const { data, error, count } = await ctx.supabase
    .from("campaign_jobs")
    .select("*", { count: "exact" })
    .eq("organization_id", ctx.workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw Errors.internal("Failed to fetch campaign jobs");

  return {
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
});
