"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useWorkspace } from "@/lib/workspace";
import type {
  CampaignAttachment,
  CampaignJobStatus,
  CampaignJobType,
} from "@/lib/campaigns/types";
import {
  campaignLabel,
  configFromJobType,
  readCampaignAttachment,
} from "@/lib/campaigns/types";
import { resolveSessionLiveStatus } from "@/lib/call-sessions/presence";
import type {
  Campaign,
  CallSession,
  CampaignStatus,
  CampaignType,
  Channel,
  Creator,
  KpiSet,
  Period,
} from "./data";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ONE_MIN = 60 * 1000;
const FIVE_MIN = 5 * ONE_MIN;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  const json = (await res.json()) as { data?: T } & T;
  return (json.data ?? json) as T;
}

// Same palette used elsewhere in the app for member chips.
const MEMBER_COLORS = [
  "#0052D9",
  "#FF6700",
  "#5B2EBF",
  "#0E7A3A",
  "#B91C1C",
  "#0891B2",
  "#9333EA",
  "#65A30D",
];

function memberInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function memberColorFor(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return MEMBER_COLORS[hash % MEMBER_COLORS.length];
}

export function creatorFromCampaign(c: {
  creator: string;
  creatorName: string;
}): Creator {
  return {
    id: c.creator,
    name: c.creatorName,
    initials: memberInitials(c.creatorName),
    color: memberColorFor(c.creator),
  };
}

// ─── Org members (for creator avatars and the filter dropdown) ───────────────

export function useOrgMembersForCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "org-members"] as const,
    queryFn: async () => {
      const data = await getJson<{
        items: { id: string; name: string; avatar_url: string | null }[];
      }>("/api/organization/members");
      return (data.items ?? []).map<Creator>((m) => ({
        id: m.id,
        name: m.name,
        initials: memberInitials(m.name),
        color: memberColorFor(m.id),
        avatarUrl: m.avatar_url ?? null,
      }));
    },
    staleTime: FIVE_MIN * 6,
    placeholderData: [],
  });
}

// ─── Campaign jobs ───────────────────────────────────────────────────────────

export interface CampaignJobProspectRow {
  id: string;
  prospect_id: string;
  status: string;
  error: string | null;
  processed_at: string | null;
  prospect_name: string;
  /** LinkedIn profile picture (enrichment_metadata.profile_picture_url) or null. */
  avatar_url: string | null;
}

interface ApiCampaignJob {
  id: string;
  type: CampaignJobType;
  status: CampaignJobStatus;
  total_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  created_at: string;
  started_at: string | null;
  created_by: string | null;
  message_template: string | null;
  batch_size: number | null;
  delay_ms: number | null;
  metadata: Record<string, unknown> | null;
}

function statusToDesign(s: CampaignJobStatus): CampaignStatus {
  // Design has no "pending" — surface as "running" since the worker is about
  // to act on it. "draft", "running", "paused", "completed", "failed" pass
  // through.
  if (s === "pending") return "running";
  return s;
}

function typeToDesign(t: CampaignJobType): CampaignType {
  switch (t) {
    case "invite":
    case "invite_with_note":
      return "invitation";
    case "invite_then_message":
      return "invitation_message";
    case "contact":
      return "message";
    case "whatsapp":
      return "whatsapp_message";
    default:
      return "message";
  }
}

function channelOf(t: CampaignJobType): Channel {
  return t === "whatsapp" ? "whatsapp" : "linkedin";
}

interface JobStatsRow {
  job_id: string;
  accepted: number;
  replied: number;
  meetings: number;
}

function mapJob(
  job: ApiCampaignJob,
  members: Map<string, Creator>,
  stats: Map<string, JobStatsRow>,
): Campaign {
  const meta = job.metadata ?? {};
  const fallbackName = (meta as { name?: string }).name?.trim() || campaignLabel(configFromJobType(job.type));
  const creator = job.created_by ? members.get(job.created_by) : undefined;
  const s = stats.get(job.id);
  return {
    id: job.id,
    kind: "campaign",
    name: fallbackName,
    channel: channelOf(job.type),
    type: typeToDesign(job.type),
    status: statusToDesign(job.status),
    total: job.total_count ?? 0,
    processed: job.processed_count ?? 0,
    accepted: s?.accepted ?? 0,
    replied: s?.replied ?? 0,
    meetings: s?.meetings ?? 0,
    launchedAt: job.started_at ?? job.created_at,
    creator: job.created_by ?? "unknown",
    creatorName: creator?.name ?? "Membre",
  };
}

// Per-job aggregate stats (the campaign_job_stats SQL view, joined to
// campaign_jobs through RLS). Queried in parallel with /api/campaigns/jobs so
// we don't N+1 the worker. Empty map until the migration runs.
async function fetchJobStats(workspaceId: string): Promise<Map<string, JobStatsRow>> {
  try {
    const data = await getJson<{ items: JobStatsRow[] }>(
      `/api/campaigns/jobs/stats?workspace_id=${encodeURIComponent(workspaceId)}`,
    );
    return new Map((data.items ?? []).map((r) => [r.job_id, r]));
  } catch {
    return new Map();
  }
}

export function useCampaignJobs() {
  const { workspaceId } = useWorkspace();
  const members = useOrgMembersForCampaigns();
  return useQuery({
    queryKey: ["campaigns", "jobs", workspaceId] as const,
    queryFn: async () => {
      const [data, stats] = await Promise.all([
        getJson<{ items: ApiCampaignJob[] }>("/api/campaigns/jobs?pageSize=100"),
        workspaceId ? fetchJobStats(workspaceId) : Promise.resolve(new Map<string, JobStatsRow>()),
      ]);
      const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
      return (data.items ?? []).map((j) => mapJob(j, memberMap, stats));
    },
    enabled: !!workspaceId && !members.isLoading,
    staleTime: 30 * 1000,
    placeholderData: [],
  });
}

/** GET /api/campaigns/jobs/[id] — job row + prospect rows (404 → `null`). */
export function useCampaignJobDetail(jobId: string | undefined) {
  const { workspaceId } = useWorkspace();
  const members = useOrgMembersForCampaigns();
  return useQuery({
    queryKey: ["campaigns", "job", workspaceId, jobId] as const,
    queryFn: async () => {
      if (!workspaceId || !jobId) return null;
      // Fetch the job detail and the per-job stats in parallel rather than
      // sequentially — the stats request used to wait for the (already
      // 3-query) detail fetch to finish, roughly doubling the wall-clock load.
      const [res, stats] = await Promise.all([
        fetch(`/api/campaigns/jobs/${jobId}`, { credentials: "include" }),
        fetchJobStats(workspaceId),
      ]);
      if (res.status === 404) return null;
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(json.error?.message ?? `${res.status}`);
      }
      const json = (await res.json()) as {
        data?: ApiCampaignJob & { prospects: CampaignJobProspectRow[] };
      };
      const raw = json.data ?? (json as unknown as ApiCampaignJob & { prospects: CampaignJobProspectRow[] });
      const { prospects = [], ...jobRow } = raw;
      const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
      return {
        campaign: mapJob(jobRow as ApiCampaignJob, memberMap, stats),
        prospects,
        apiStatus: jobRow.status,
        // Extra raw fields the detail-page redesign needs but the design type
        // (Campaign) doesn't carry.
        messageTemplate: jobRow.message_template ?? null,
        attachment: readCampaignAttachment(jobRow.metadata) as CampaignAttachment | null,
        startedAt: jobRow.started_at ?? null,
      };
    },
    // Don't block the whole detail load on the org-members query — member
    // names are a cosmetic chip; the query re-derives the creator name when
    // members arrive. Only gate on the essentials.
    enabled: !!workspaceId && !!jobId,
    staleTime: 15 * 1000,
    // Real-time-ish progression: while the job is actively being dispatched
    // (status running/pending), poll every 8 s so the progress bar, prospect
    // statuses, and KPI tiles tick up without a manual refresh. Once the job
    // settles (draft / completed / paused / failed) we stop polling. Pausing
    // in background keeps idle tabs cheap.
    refetchInterval: (query) => {
      const status = query.state.data?.apiStatus;
      if (status === "running" || status === "pending") return 8 * 1000;
      return false;
    },
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

// ─── Campaign timeline (detail page chart + activity feed) ───────────────────

export interface CampaignTimelineSeriesPoint {
  date: string;
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

/**
 * Campaign detail time-series + activity feed for a given period
 * (7 / 30 / 90 / all — the campaigns-section period keys). Soft-refreshes
 * every 15s while the job is live so the chart and feed tick up on their own.
 */
export function useCampaignTimeline(
  jobId: string | undefined,
  period: string,
  isLive: boolean,
) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["campaigns", "timeline", workspaceId, jobId, period] as const,
    queryFn: () =>
      getJson<CampaignTimelinePayload>(
        `/api/campaigns/jobs/${jobId}/timeline?period=${encodeURIComponent(period)}`,
      ),
    enabled: !!workspaceId && !!jobId,
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
    refetchInterval: isLive ? 15 * 1000 : false,
    refetchIntervalInBackground: false,
  });
}

// ─── Call sessions ───────────────────────────────────────────────────────────

interface ApiCallSession {
  id: string;
  title: string | null;
  status: string;
  total_duration_s: number;
  created_at: string;
  ended_at: string | null;
  created_by: string | null;
  // Presence (migration 20260601130000): who is live + last heartbeat.
  active_user_id?: string | null;
  active_heartbeat_at?: string | null;
  // Optional once the list endpoint returns inline stats (see BACKEND.md §2).
  total_count?: number;
  processed?: number;
  meetings?: number;
  qualifications?: number;
  pickup_rate?: number | null;
}

function sessionStatusToDesign(s: string): CampaignStatus {
  switch (s) {
    case "active":
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "ready":
    case "scheduled":
      return "ready";
    case "paused":
      return "paused";
    case "failed":
      return "failed";
    case "draft":
      return "draft";
    default:
      return "ready";
  }
}

function mapSession(s: ApiCallSession, members: Map<string, Creator>): CallSession {
  const creator = s.created_by ? members.get(s.created_by) : undefined;
  const processed = s.processed ?? 0;
  const liveStatus = resolveSessionLiveStatus({
    status: s.status,
    activeHeartbeatAt: s.active_heartbeat_at ?? null,
    endedAt: s.ended_at ?? null,
    hasProgress: processed > 0,
  });
  const activeUser = s.active_user_id ? members.get(s.active_user_id) : undefined;
  return {
    id: s.id,
    kind: "session",
    name: s.title?.trim() || "Session d'appels",
    channel: "phone",
    status: sessionStatusToDesign(s.status),
    liveStatus,
    activeUserName: liveStatus === "in_progress" ? (activeUser?.name ?? null) : null,
    date: s.created_at,
    total: s.total_count ?? 0,
    processed,
    meetings: s.meetings ?? 0,
    qualifications: s.qualifications ?? 0,
    pickupRate: s.pickup_rate ?? null,
    creator: s.created_by ?? "unknown",
    creatorName: creator?.name ?? "Membre",
  };
}

export function useCallSessions() {
  const { workspaceId } = useWorkspace();
  const members = useOrgMembersForCampaigns();
  return useQuery({
    queryKey: ["campaigns", "sessions", workspaceId] as const,
    queryFn: async () => {
      const data = await getJson<{ items: ApiCallSession[] }>(
        "/api/call-sessions?pageSize=100",
      );
      const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
      return (data.items ?? []).map((s) => mapSession(s, memberMap));
    },
    enabled: !!workspaceId && !members.isLoading,
    staleTime: 20 * 1000,
    // Poll so a colleague starting/ending a session elsewhere reflects on this
    // screen without a manual refresh (presence is heartbeat-derived). 20s is
    // well under the 60s stale window, so "En cours → En pause" lands promptly.
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
    placeholderData: [],
  });
}

/**
 * Keep the current user marked as "present" in a session while the live call
 * interface is mounted. Pings every 25s (well under the 60s stale window) and
 * clears presence on unmount. Drives the presence-derived "En cours" tag.
 */
export function useSessionHeartbeat(sessionId: string | undefined, active: boolean) {
  useEffect(() => {
    if (!sessionId || !active) return;
    let cancelled = false;
    const ping = () => {
      void fetch(`/api/call-sessions/${sessionId}/heartbeat`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(() => {
      if (!cancelled) ping();
    }, 25_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      // Best-effort "I left" so the card flips to paused promptly.
      void fetch(`/api/call-sessions/${sessionId}/heartbeat`, {
        method: "DELETE",
        credentials: "include",
        keepalive: true,
      }).catch(() => {});
    };
  }, [sessionId, active]);
}

export function useCallSessionDetail(sessionId: string | undefined) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: ["campaigns", "call-session", workspaceId, sessionId] as const,
    queryFn: async () => {
      if (!workspaceId || !sessionId) return null;
      const res = await fetch(`/api/call-sessions/${sessionId}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(j.error?.message ?? `${res.status}`);
      }
      const json = (await res.json()) as { data?: Record<string, unknown> } | Record<string, unknown>;
      const raw =
        typeof json === "object" &&
        json !== null &&
        "data" in json &&
        json.data !== undefined
          ? (json as { data: Record<string, unknown> }).data
          : (json as Record<string, unknown>);
      return raw;
    },
    enabled: !!workspaceId && !!sessionId,
    staleTime: 15 * 1000,
  });
}

// ─── KPI bar ─────────────────────────────────────────────────────────────────

export function useCampaignKpis(period: Period, creators: string[]) {
  const { workspaceId } = useWorkspace();
  const creatorsKey = [...creators].sort().join(",");
  return useQuery({
    queryKey: ["campaigns", "kpis", workspaceId, period, creatorsKey] as const,
    queryFn: async () => {
      const qs = new URLSearchParams({ period });
      if (creators.length > 0) qs.set("creators", creators.join(","));
      return getJson<KpiSet>(`/api/campaigns/kpis?${qs.toString()}`);
    },
    enabled: !!workspaceId,
    // Keep the previous period's cards on screen while the new period loads,
    // so switching periods never flashes skeletons or shifts the layout.
    placeholderData: keepPreviousData,
    // Campaign batches and webhook deliveries (invite accepted, inbound reply)
    // land in prospect_activity over time. A 5-minute stale window felt like
    // the KPI bar was broken — users launched a batch, saw the campaigns
    // table tick up, and the cards stayed frozen. Drop to 1 minute and poll
    // every 60s while the tab is visible so the numbers track the table.
    staleTime: ONE_MIN,
    refetchInterval: ONE_MIN,
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

/**
 * Predicate for invalidating the KPI bar across all (period, creators) tuples
 * after a mutation lands an activity row. Use from mutation onSettled callbacks.
 */
function invalidateCampaignKpis(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "campaigns" &&
      q.queryKey[1] === "kpis",
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export type CampaignJobBulkOperation =
  | { op: "set_status"; id: string; status: "paused" | "running" | "failed" }
  | { op: "delete"; id: string }
  | { op: "duplicate"; id: string };

async function patchJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(json.error?.message ?? `${res.status}`);
  }
  return res.json();
}

export async function postJson(url: string, body: unknown = {}): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(json.error?.message ?? `${res.status}`);
  }
  return res.json();
}

export async function patchCallSessionProspect(
  sessionId: string,
  prospectId: string,
  body: { outcome?: string; status?: string; called_at?: string; call_duration_s?: number },
) {
  return patchJson(`/api/call-sessions/${sessionId}/prospects/${prospectId}`, body);
}

export async function postCallSessionNote(sessionId: string, prospect_id: string, content: string) {
  return postJson(`/api/call-sessions/${sessionId}/notes`, { prospect_id, content });
}

async function deleteRes(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(json.error?.message ?? `${res.status}`);
  }
}

export function useUpdateJobStatus() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "running" | "paused" | "failed" }) => {
      await patchJson(`/api/campaigns/jobs/${id}`, { status });
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      const prev = qc.getQueryData<Campaign[]>(["campaigns", "jobs", workspaceId]);
      qc.setQueryData<Campaign[]>(["campaigns", "jobs", workspaceId], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, status: statusToDesign(status as CampaignJobStatus) } : c)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["campaigns", "jobs", workspaceId], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour");
    },
    onSettled: (_d, _e, variables) => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      if (variables?.id) {
        void qc.invalidateQueries({ queryKey: ["campaigns", "job", workspaceId, variables.id] });
      }
    },
  });
}

export function useLaunchJob() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      await postJson(`/api/campaigns/jobs/${id}/launch`);
    },
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["campaigns", "job", workspaceId, id] });
      invalidateCampaignKpis(qc);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Impossible de lancer la campagne");
    },
  });
}

export function useRetryJobErrors() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      const env = (await postJson(`/api/campaigns/jobs/${id}/retry-errors`)) as {
        data?: { ok?: boolean; requeued?: number; message?: string };
      };
      return env.data ?? {};
    },
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["campaigns", "job", workspaceId, id] });
      invalidateCampaignKpis(qc);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Réessai impossible");
    },
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteRes(`/api/campaigns/jobs/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      const prev = qc.getQueryData<Campaign[]>(["campaigns", "jobs", workspaceId]);
      qc.setQueryData<Campaign[]>(["campaigns", "jobs", workspaceId], (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["campaigns", "jobs", workspaceId], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    },
    onSettled: (_d, _e, id) => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      if (id) void qc.invalidateQueries({ queryKey: ["campaigns", "job", workspaceId, id] });
    },
  });
}

export function useDuplicateJob() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      return postJson(`/api/campaigns/jobs/${id}/duplicate`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Duplication impossible");
    },
  });
}

export function useCampaignJobsBulk() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (operations: CampaignJobBulkOperation[]) => {
      const env = (await postJson("/api/campaigns/jobs/bulk", {
        operations,
      })) as { data?: { results: { ok: boolean; op?: string; id: string; error?: string }[] } };
      const results = env.data?.results;
      if (!Array.isArray(results)) {
        throw new Error("Réponse inattendue du serveur");
      }
      return { results };
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "jobs", workspaceId] });
      void qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "campaigns" && q.queryKey[1] === "job" });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Action groupée impossible");
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteRes(`/api/call-sessions/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["campaigns", "sessions", workspaceId] });
      const prev = qc.getQueryData<CallSession[]>(["campaigns", "sessions", workspaceId]);
      qc.setQueryData<CallSession[]>(["campaigns", "sessions", workspaceId], (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["campaigns", "sessions", workspaceId], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    },
    onSettled: (_d, _e, id) => {
      void qc.invalidateQueries({ queryKey: ["campaigns", "sessions", workspaceId] });
      if (id) {
        void qc.invalidateQueries({ queryKey: ["campaigns", "call-session", workspaceId, id] });
      }
    },
  });
}
