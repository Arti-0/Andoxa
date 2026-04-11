import { createApiHandler, Errors } from "@/lib/api";
import { extractLinkedInSlug } from "@/lib/unipile/campaign";

const ACTIVE_JOB_STATUSES = ["pending", "running", "paused"] as const;

/**
 * GET /api/extension/prospect-by-linkedin?url=https://linkedin.com/in/john-doe
 * Cherche un prospect par URL LinkedIn dans le workspace actif.
 * Retourne le prospect + sa liste + ses campagnes actives si trouvé.
 * Retourne null si non trouvé (pas d'erreur).
 */
export const GET = createApiHandler(
  async (req, ctx) => {
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");

    const rawUrl = new URL(req.url).searchParams.get("url");
    if (!rawUrl?.trim()) throw Errors.badRequest("url requis");

    let url: string;
    try {
      url = decodeURIComponent(rawUrl);
    } catch {
      url = rawUrl;
    }

    const slug = extractLinkedInSlug(url);
    if (!slug) return { prospect: null };

    const { data: prospects, error: prospectsError } = await ctx.supabase
      .from("prospects")
      .select("id, full_name, company, job_title, status, bdd_id, linkedin")
      .eq("organization_id", ctx.workspaceId)
      .is("deleted_at", null)
      .ilike("linkedin", `%${slug}%`)
      .limit(1);

    if (prospectsError) throw Errors.internal("Failed to fetch prospect");

    const prospect = prospects?.[0] ?? null;
    if (!prospect) return { prospect: null };

    let listName: string | null = null;
    if (prospect.bdd_id) {
      const { data: bdd } = await ctx.supabase
        .from("bdd")
        .select("name")
        .eq("id", prospect.bdd_id)
        .maybeSingle();
      listName = bdd?.name ?? null;
    }

    const { data: campaignProspects, error: cjpError } = await ctx.supabase
      .from("campaign_job_prospects")
      .select("status, job_id")
      .eq("prospect_id", prospect.id);

    if (cjpError) throw Errors.internal("Failed to fetch campaign links");

    const jobIds = [...new Set((campaignProspects ?? []).map((r) => r.job_id))];
    const prospectStatusByJobId = new Map(
      (campaignProspects ?? []).map((r) => [r.job_id, r.status] as const)
    );

    let campaigns: Array<{
      id: string;
      type: string;
      status: string;
      prospect_status: string;
    }> = [];

    if (jobIds.length > 0) {
      const { data: jobs, error: jobsError } = await ctx.supabase
        .from("campaign_jobs")
        .select("id, type, status, created_at")
        .in("id", jobIds)
        .eq("organization_id", ctx.workspaceId)
        .in("status", [...ACTIVE_JOB_STATUSES])
        .order("created_at", { ascending: false })
        .limit(5);

      if (jobsError) throw Errors.internal("Failed to fetch campaign jobs");

      campaigns = (jobs ?? []).map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        prospect_status: prospectStatusByJobId.get(job.id) ?? "pending",
      }));
    }

    return {
      prospect: {
        id: prospect.id,
        full_name: prospect.full_name,
        company: prospect.company,
        job_title: prospect.job_title,
        status: prospect.status,
        list_name: listName,
        campaigns,
      },
    };
  },
  { requireWorkspace: false }
);
