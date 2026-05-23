import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export interface CampaignJobStatsRow {
  job_id: string;
  accepted: number;
  replied: number;
  meetings: number;
}

type ActivityRow = {
  campaign_job_id: string | null;
  action: string;
  prospect_id: string | null;
  created_at: string;
};

/**
 * Resolve which campaign job an activity row belongs to.
 * Prefer explicit campaign_job_id; otherwise attribute to the latest job
 * (by created_at) that includes the prospect and started before the activity.
 */
export function resolveJobForActivity(
  activity: ActivityRow,
  jobIds: string[],
  prospectsByJob: Map<string, Set<string>>,
  jobCreatedAt: Map<string, string>,
): string | null {
  if (
    activity.campaign_job_id &&
    jobIds.includes(activity.campaign_job_id)
  ) {
    return activity.campaign_job_id;
  }
  if (!activity.prospect_id) return null;

  let bestJobId: string | null = null;
  let bestJobStart = "";

  for (const jobId of jobIds) {
    if (!prospectsByJob.get(jobId)?.has(activity.prospect_id)) continue;
    const jobStart = jobCreatedAt.get(jobId);
    if (!jobStart) continue;
    if (new Date(activity.created_at) < new Date(jobStart)) continue;
    if (!bestJobId || jobStart > bestJobStart) {
      bestJobId = jobId;
      bestJobStart = jobStart;
    }
  }

  return bestJobId;
}

export function aggregateJobStats(
  jobIds: string[],
  activities: ActivityRow[],
  prospectsByJob: Map<string, Set<string>>,
  jobCreatedAt: Map<string, string>,
): CampaignJobStatsRow[] {
  const byJob = new Map<string, CampaignJobStatsRow>(
    jobIds.map((id) => [id, { job_id: id, accepted: 0, replied: 0, meetings: 0 }]),
  );

  for (const activity of activities) {
    const jobId = resolveJobForActivity(
      activity,
      jobIds,
      prospectsByJob,
      jobCreatedAt,
    );
    if (!jobId) continue;

    const stat = byJob.get(jobId);
    if (!stat) continue;

    switch (activity.action) {
      case "linkedin_invite_accepted":
        stat.accepted += 1;
        break;
      case "linkedin_message_inbound":
      case "whatsapp_message_inbound":
        stat.replied += 1;
        break;
      case "rdv_scheduled":
        stat.meetings += 1;
        break;
      default:
        break;
    }
  }

  return [...byJob.values()];
}

export async function loadCampaignJobStats(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<CampaignJobStatsRow[]> {
  const { data: jobs, error: jobsErr } = await supabase
    .from("campaign_jobs")
    .select("id, created_at")
    .eq("organization_id", organizationId);

  if (jobsErr) throw jobsErr;

  const jobList = jobs ?? [];
  if (jobList.length === 0) return [];

  const jobIds = jobList.map((j) => j.id);
  const jobCreatedAt = new Map(jobList.map((j) => [j.id, j.created_at]));
  const prospectsByJob = new Map<string, Set<string>>();

  const { data: cjpRows, error: cjpErr } = await supabase
    .from("campaign_job_prospects")
    .select("job_id, prospect_id")
    .in("job_id", jobIds);

  if (cjpErr) throw cjpErr;

  for (const row of cjpRows ?? []) {
    const set = prospectsByJob.get(row.job_id) ?? new Set<string>();
    set.add(row.prospect_id);
    prospectsByJob.set(row.job_id, set);
  }

  const { data: activities, error: actErr } = await supabase
    .from("prospect_activity")
    .select("campaign_job_id, action, prospect_id, created_at")
    .eq("organization_id", organizationId)
    .in("action", [
      "linkedin_invite_accepted",
      "linkedin_message_inbound",
      "whatsapp_message_inbound",
      "rdv_scheduled",
    ]);

  if (actErr) throw actErr;

  return aggregateJobStats(
    jobIds,
    activities ?? [],
    prospectsByJob,
    jobCreatedAt,
  );
}
