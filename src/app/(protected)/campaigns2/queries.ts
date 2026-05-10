"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/workspace";
import type {
  CampaignJobStatus,
  CampaignJobType,
} from "@/lib/campaigns/types";
import {
  campaignLabel,
  configFromJobType,
} from "@/lib/campaigns/types";
import type {
  Campaign,
  CallSession,
  CampaignStatus,
  CampaignType,
  Channel,
  Creator,
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

// ─── Org members (for creator avatars and the filter dropdown) ───────────────

export function useOrgMembersForCampaigns() {
  return useQuery({
    queryKey: ["campaigns2", "org-members"] as const,
    queryFn: async () => {
      const data = await getJson<{
        items: { id: string; name: string; avatar_url: string | null }[];
      }>("/api/organization/members");
      return (data.items ?? []).map<Creator>((m) => ({
        id: m.id,
        name: m.name,
        initials: memberInitials(m.name),
        color: memberColorFor(m.id),
      }));
    },
    staleTime: FIVE_MIN * 6,
    placeholderData: [],
  });
}

// ─── Campaign jobs ───────────────────────────────────────────────────────────

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

function mapJob(job: ApiCampaignJob, members: Map<string, Creator>): Campaign {
  const meta = job.metadata ?? {};
  const fallbackName = (meta as { name?: string }).name?.trim() || campaignLabel(configFromJobType(job.type));
  const creator = job.created_by ? members.get(job.created_by) : undefined;
  return {
    id: job.id,
    kind: "campaign",
    name: fallbackName,
    channel: channelOf(job.type),
    type: typeToDesign(job.type),
    status: statusToDesign(job.status),
    total: job.total_count ?? 0,
    processed: job.processed_count ?? 0,
    // Real counters land in step 2 (KPI endpoint / campaign_job_stats view).
    accepted: 0,
    replied: 0,
    meetings: 0,
    launchedAt: job.started_at ?? job.created_at,
    creator: job.created_by ?? "unknown",
    creatorName: creator?.name ?? "Membre",
  };
}

export function useCampaignJobs() {
  const { workspaceId } = useWorkspace();
  const members = useOrgMembersForCampaigns();
  return useQuery({
    queryKey: ["campaigns2", "jobs", workspaceId] as const,
    queryFn: async () => {
      const data = await getJson<{ items: ApiCampaignJob[] }>(
        "/api/campaigns/jobs?pageSize=100",
      );
      const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
      return (data.items ?? []).map((j) => mapJob(j, memberMap));
    },
    enabled: !!workspaceId && !members.isLoading,
    staleTime: 30 * 1000,
    placeholderData: [],
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
  return {
    id: s.id,
    kind: "session",
    name: s.title?.trim() || "Session d'appels",
    channel: "phone",
    status: sessionStatusToDesign(s.status),
    date: s.created_at,
    total: s.total_count ?? 0,
    processed: s.processed ?? 0,
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
    queryKey: ["campaigns2", "sessions", workspaceId] as const,
    queryFn: async () => {
      const data = await getJson<{ items: ApiCallSession[] }>(
        "/api/call-sessions?pageSize=100",
      );
      const memberMap = new Map((members.data ?? []).map((m) => [m.id, m]));
      return (data.items ?? []).map((s) => mapSession(s, memberMap));
    },
    enabled: !!workspaceId && !members.isLoading,
    staleTime: 30 * 1000,
    placeholderData: [],
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

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

async function postJson(url: string, body: unknown = {}): Promise<unknown> {
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
      await qc.cancelQueries({ queryKey: ["campaigns2", "jobs", workspaceId] });
      const prev = qc.getQueryData<Campaign[]>(["campaigns2", "jobs", workspaceId]);
      qc.setQueryData<Campaign[]>(["campaigns2", "jobs", workspaceId], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, status: statusToDesign(status as CampaignJobStatus) } : c)),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["campaigns2", "jobs", workspaceId], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns2", "jobs", workspaceId] });
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns2", "jobs", workspaceId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Impossible de lancer la campagne");
    },
  });
}

// Currently the legacy API has no DELETE on /api/campaigns/jobs/:id.
// We soft-delete by setting status='failed' until the new endpoint lands.
// Tracked in BACKEND.md §1.3.
export function useCancelJob() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      await patchJson(`/api/campaigns/jobs/${id}`, { status: "failed" });
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["campaigns2", "jobs", workspaceId] });
      const prev = qc.getQueryData<Campaign[]>(["campaigns2", "jobs", workspaceId]);
      qc.setQueryData<Campaign[]>(["campaigns2", "jobs", workspaceId], (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["campaigns2", "jobs", workspaceId], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns2", "jobs", workspaceId] });
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
      await qc.cancelQueries({ queryKey: ["campaigns2", "sessions", workspaceId] });
      const prev = qc.getQueryData<CallSession[]>(["campaigns2", "sessions", workspaceId]);
      qc.setQueryData<CallSession[]>(["campaigns2", "sessions", workspaceId], (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["campaigns2", "sessions", workspaceId], ctx.prev);
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns2", "sessions", workspaceId] });
    },
  });
}
