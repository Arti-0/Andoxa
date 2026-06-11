import { createApiHandler, Errors } from "@/lib/api";
import type { NextRequest } from "next/server";
import { describeActivity } from "@/lib/prospect-activity";

/**
 * GET /api/campaigns/jobs/[id]/timeline?period=7|30|90|all
 *
 * Powers the campaign detail page's time-series chart and activity feed.
 * Reads `prospect_activity` rows linked to this campaign job (the
 * `campaign_job_id` FK added in migration 20260515180200) within the chosen
 * period and returns:
 *
 *   • `series`  — one bucket per day: { date, sent, accepted, replied, refused }
 *                 ready to plot directly.
 *   • `events`  — the most recent activity rows, classified through the
 *                 canonical verb registry so labels match the rest of the app.
 *
 * The period keys mirror the campaigns section KPI bar (7 / 30 / 90 / all)
 * rather than the dashboard's (today/week/month/30d), since that's what this
 * page already uses.
 */

const PERIOD_DAYS: Record<string, number | null> = {
  "7": 7,
  "30": 30,
  "90": 90,
  all: null,
};

/** Map a prospect_activity verb → the chart metric it increments (or null). */
function metricForAction(action: string): "sent" | "accepted" | "replied" | "refused" | null {
  switch (action) {
    case "linkedin_invite_sent":
    case "linkedin_message_outbound":
    case "whatsapp_message_outbound":
      return "sent";
    case "linkedin_invite_accepted":
      return "accepted";
    case "linkedin_message_inbound":
    case "whatsapp_message_inbound":
      return "replied";
    case "linkedin_invite_refused":
      return "refused";
    default:
      return null;
  }
}

export interface CampaignTimelineSeriesPoint {
  date: string; // YYYY-MM-DD
  sent: number;
  accepted: number;
  replied: number;
  refused: number;
}

export interface CampaignTimelineEvent {
  id: string;
  kind: string;
  dir?: "sent" | "received";
  at: string;
  title: string;
  body: string;
  prospect_name: string | null;
}

export interface CampaignTimelinePayload {
  period: string;
  series: CampaignTimelineSeriesPoint[];
  events: CampaignTimelineEvent[];
}

function extractJobId(req: NextRequest): string | null {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("timeline");
  return i > 0 ? (parts[i - 1] ?? null) : null;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export const GET = createApiHandler(async (req, ctx): Promise<CampaignTimelinePayload> => {
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace required");
  const id = extractJobId(req);
  if (!id) throw Errors.badRequest("ID requis");

  const url = new URL(req.url);
  const rawPeriod = url.searchParams.get("period") ?? "30";
  const period = rawPeriod in PERIOD_DAYS ? rawPeriod : "30";
  const days = PERIOD_DAYS[period];

  // Confirm the job belongs to the workspace (defence in depth alongside RLS).
  const { data: job, error: jobErr } = await ctx.supabase
    .from("campaign_jobs")
    .select("id")
    .eq("id", id)
    .eq("organization_id", ctx.workspaceId)
    .is("deleted_at", null)
    .single();
  if (jobErr || !job) throw Errors.notFound("Campaign job");

  const now = new Date();
  const startIso =
    days != null
      ? new Date(now.getTime() - days * 86400000).toISOString()
      : null;

  let q = ctx.supabase
    .from("prospect_activity")
    .select("id, action, details, created_at, prospect_id")
    .eq("organization_id", ctx.workspaceId)
    .eq("campaign_job_id", id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (startIso) q = q.gte("created_at", startIso);

  const { data: rows, error } = await q;
  if (error) throw Errors.internal("Failed to fetch campaign timeline");

  // ── Build the daily series ────────────────────────────────────────────
  // Seed every day in the window so the chart has a continuous x-axis even on
  // days with no activity. For "all", span from the earliest row to today.
  const buckets = new Map<string, CampaignTimelineSeriesPoint>();
  const seedFrom = (() => {
    if (days != null) return new Date(now.getTime() - days * 86400000);
    const earliest = (rows ?? []).reduce<string | null>(
      (min, r) => (!min || r.created_at < min ? r.created_at : min),
      null,
    );
    return earliest ? new Date(earliest) : new Date(now);
  })();
  for (let d = new Date(seedFrom); d <= now; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, sent: 0, accepted: 0, replied: 0, refused: 0 });
  }

  for (const r of rows ?? []) {
    const metric = metricForAction(r.action);
    if (!metric) continue;
    const key = dayKey(r.created_at);
    const b = buckets.get(key) ?? { date: key, sent: 0, accepted: 0, replied: 0, refused: 0 };
    b[metric] += 1;
    buckets.set(key, b);
  }

  const series = Array.from(buckets.values()).sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );

  // ── Resolve prospect names for the event feed (top 50) ───────────────────
  const recent = (rows ?? []).slice(0, 50);
  const prospectIds = Array.from(
    new Set(recent.map((r) => r.prospect_id).filter((v): v is string => !!v)),
  );
  const nameById = new Map<string, string>();
  const avatarById = new Map<string, string | null>();
  if (prospectIds.length > 0) {
    const { data: prospectRows } = await ctx.supabase
      .from("prospects")
      .select("id, full_name, company, enrichment_metadata")
      .in("id", prospectIds);
    for (const p of prospectRows ?? []) {
      nameById.set(p.id, p.full_name ?? p.company ?? p.id.slice(0, 8));
      const em = p.enrichment_metadata as
        | { profile_picture_url?: string | null }
        | null;
      avatarById.set(p.id, em?.profile_picture_url ?? null);
    }
  }

  const events: CampaignTimelineEvent[] = recent.map((r) => {
    const desc = describeActivity(r.action);
    const details = (r.details ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      kind: desc.kind,
      dir: desc.dir,
      at: r.created_at,
      title: desc.title,
      body: desc.body(details),
      prospect_name: r.prospect_id ? (nameById.get(r.prospect_id) ?? null) : null,
      prospect_avatar: r.prospect_id ? (avatarById.get(r.prospect_id) ?? null) : null,
    };
  });

  return { period, series, events };
});
