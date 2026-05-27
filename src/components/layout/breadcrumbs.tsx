"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CampaignJobType } from "@/lib/campaigns/types";
import { campaignLabel, configFromJobType } from "@/lib/campaigns/types";

/**
 * The first crumb always maps to one of the sidebar pages. Some routes
 * (prospect, call-sessions, …) live under another top-level concept in the
 * sidebar — we anchor them there so the breadcrumb stays coherent.
 */
const ROOT_MAP: Record<string, { label: string; href: string }> = {
  dashboard: { label: "Tableau de bord", href: "/dashboard" },
  crm: { label: "CRM", href: "/crm" },
  prospect: { label: "CRM", href: "/crm" },
  campaigns: { label: "Campagnes & Appels", href: "/campaigns" },
  "call-sessions": { label: "Campagnes & Appels", href: "/campaigns" },
  workflows: { label: "Workflows", href: "/workflows" },
  messagerie: { label: "Messagerie", href: "/messagerie" },
  calendar: { label: "Calendrier", href: "/calendar" },
  settings: { label: "Paramètres", href: "/settings" },
  installation: { label: "Paramètres", href: "/settings" },
  linkedin: { label: "Paramètres", href: "/settings" },
};

const SEGMENT_LABELS: Record<string, string> = {
  sessions: "Session",
  trash: "Corbeille",
  messages: "Messages",
  templates: "Templates",
  new: "Nouveau",
  "design-1": "Design 1",
  "design-2": "Design 2",
  "design-3": "Design 3",
};

const CAMPAIGN_JOB_TYPES = new Set<string>([
  "invite",
  "invite_with_note",
  "invite_then_message",
  "contact",
  "whatsapp",
]);

function jobTypeGuard(t: unknown): CampaignJobType {
  const s = String(t ?? "");
  return CAMPAIGN_JOB_TYPES.has(s)
    ? (s as CampaignJobType)
    : "contact";
}

function isProbablyId(seg: string): boolean {
  // UUID, cuid-ish, long numeric, or anything that's not a stable slug.
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F-]{20,}$/.test(seg)) return true;
  if (/^\d{4,}$/.test(seg)) return true;
  if (seg.length >= 16 && !seg.includes("-")) return true;
  return false;
}

function labelFor(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (isProbablyId(segment)) return segment.slice(0, 8) + "…";
  return segment
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

interface ProspectLite {
  id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

function useProspectName(id: string | null) {
  return useQuery<string | null>({
    queryKey: ["prospect-breadcrumb", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      const p = (json?.data ?? json) as ProspectLite | null;
      if (!p) return null;
      const composed = [p.first_name, p.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      return p.full_name || composed || null;
    },
  });
}

/** Workflow canvas route — wait for name; no placeholder while loading */
function useWorkflowCrumbTitle(id: string | null) {
  return useQuery<string | null>({
    queryKey: ["workflow-breadcrumb", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success === false) return null;
      const w = json?.data?.workflow as { name?: string } | undefined;
      const n = w?.name?.trim();
      return n && n.length > 0 ? n : null;
    },
  });
}

function useCampaignJobCrumbTitle(id: string | null) {
  return useQuery<string | null>({
    queryKey: ["campaign-job-breadcrumb", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/jobs/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          type: unknown;
          metadata: Record<string, unknown> | null;
        };
      };
      if (json.success === false) return null;
      const raw = json.data ?? null;
      if (!raw || typeof raw !== "object") return null;
      const meta =
        raw.metadata &&
        typeof raw.metadata === "object" &&
        !Array.isArray(raw.metadata)
          ? raw.metadata
          : {};
      const nameFromMeta =
        typeof meta.name === "string" ? meta.name.trim() : "";
      if (nameFromMeta) return nameFromMeta;
      const t = jobTypeGuard(raw.type);
      return campaignLabel(configFromJobType(t));
    },
  });
}

/** Call sessions: `/campaigns/sessions/[id]` and `/call-sessions/[id]` */
function useCallSessionCrumbTitle(id: string | null) {
  return useQuery<string | null>({
    queryKey: ["call-session-breadcrumb", id],
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/call-sessions/${id}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        success?: boolean;
        data?: { title?: unknown };
      };
      if (json.success === false) return null;
      const row = json.data ?? null;
      if (!row || typeof row !== "object") return null;
      const t = (row as { title?: unknown }).title;
      return typeof t === "string" && t.trim().length > 0 ? t.trim() : null;
    },
  });
}

interface Crumb {
  label: string;
  href: string;
  current: boolean;
}

export function HeaderBreadcrumbs() {
  const pathname = usePathname() ?? "";

  const segments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );

  const first = segments[0] ?? "";

  const prospectId =
    first === "prospect" && segments[1] ? segments[1] : null;
  const {
    data: prospectName,
    isPending: prospectCrumbPending,
  } = useProspectName(prospectId);

  const workflowCrumbId =
    first === "workflows" &&
    segments[1] &&
    segments[1] !== "new"
      ? segments[1]
      : null;
  const {
    data: workflowTitle,
    isPending: workflowCrumbPending,
  } = useWorkflowCrumbTitle(workflowCrumbId);

  const campaignJobCrumbId =
    first === "campaigns" &&
    segments[1] &&
    segments[1] !== "sessions" &&
    isProbablyId(segments[1])
      ? segments[1]
      : null;
  const {
    data: campaignJobTitle,
    isPending: campaignJobCrumbPending,
  } = useCampaignJobCrumbTitle(campaignJobCrumbId);

  /** `/campaigns/sessions/[sessionId]` or `/call-sessions/[sessionId]` */
  const nestedCallSessionCrumbId =
    first === "campaigns" &&
    segments[1] === "sessions" &&
    segments[2] &&
    isProbablyId(segments[2])
      ? segments[2]
      : null;
  const standaloneCallSessionCrumbId =
    first === "call-sessions" &&
    segments[1] &&
    isProbablyId(segments[1])
      ? segments[1]
      : null;
  const callSessionCrumbId =
    nestedCallSessionCrumbId ?? standaloneCallSessionCrumbId ?? null;
  const {
    data: callSessionTitle,
    isPending: callSessionCrumbPending,
  } = useCallSessionCrumbTitle(callSessionCrumbId);

  const crumbs: Crumb[] = useMemo(() => {
    if (segments.length === 0) return [];

    const root = ROOT_MAP[first];
    const out: Crumb[] = [];
    let incompleteTrail = false;

    if (root) {
      out.push({
        label: root.label,
        href: root.href,
        current: false,
      });
    } else {
      out.push({
        label: labelFor(first),
        href: "/" + first,
        current: false,
      });
    }

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      let href = "/" + segments.slice(0, i + 1).join("/");
      let resolvedLabel: string | null | undefined;

      // `/campaigns/sessions` is not a real route — the sessions list lives on
      // the campaigns hub behind a tab. Redirect the middle crumb there so
      // clicking "Session" lands the user on the right view.
      if (first === "campaigns" && i === 1 && seg === "sessions") {
        href = "/campaigns?tab=sessions";
      }

      if (first === "prospect" && i === 1) {
        if (prospectCrumbPending) {
          incompleteTrail = true;
          continue;
        }
        resolvedLabel = prospectName ?? labelFor(seg);
      } else if (first === "workflows" && i === 1 && seg !== "new") {
        if (workflowCrumbPending) {
          incompleteTrail = true;
          continue;
        }
        resolvedLabel = workflowTitle ?? labelFor(seg);
      } else if (first === "campaigns") {
        if (i === 1 && seg === "sessions") {
          resolvedLabel = SEGMENT_LABELS.sessions ?? labelFor(seg);
        } else if (i === 1 && isProbablyId(seg)) {
          if (campaignJobCrumbPending) {
            incompleteTrail = true;
            continue;
          }
          resolvedLabel = campaignJobTitle ?? labelFor(seg);
        } else if (
          i === 2 &&
          segments[1] === "sessions" &&
          isProbablyId(seg)
        ) {
          if (callSessionCrumbPending) {
            incompleteTrail = true;
            continue;
          }
          resolvedLabel = callSessionTitle ?? labelFor(seg);
        } else {
          resolvedLabel = labelFor(seg);
        }
      } else if (first === "call-sessions" && i === 1 && isProbablyId(seg)) {
        if (callSessionCrumbPending) {
          incompleteTrail = true;
          continue;
        }
        resolvedLabel = callSessionTitle ?? labelFor(seg);
      } else {
        resolvedLabel = labelFor(seg);
      }

      const label =
        resolvedLabel ??
        labelFor(seg);
      out.push({
        label,
        href,
        current: false,
      });
    }

    if (!incompleteTrail && out.length > 0) {
      const last = out.length - 1;
      out[last] = { ...out[last], current: true };
    }

    return out;
  }, [
    segments,
    first,
    prospectCrumbPending,
    prospectName,
    workflowCrumbPending,
    workflowTitle,
    campaignJobCrumbPending,
    campaignJobTitle,
    callSessionCrumbPending,
    callSessionTitle,
  ]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className="hb-crumbs min-w-0">
      {crumbs.map((c, i) => (
        <span key={`${c.href}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 && (
            <span className="hb-sep" aria-hidden>
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
          {c.current ? (
            <span
              className="hb-crumb hb-crumb--current"
              aria-current="page"
            >
              {c.label}
            </span>
          ) : (
            <Link href={c.href} className="hb-crumb">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
