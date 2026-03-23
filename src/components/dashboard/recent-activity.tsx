"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  UserPlus,
  Megaphone,
  Calendar,
  PhoneCall,
  ArrowRightLeft,
  Upload,
  Sparkles,
} from "lucide-react";
import { ActivityFeed } from "@/components/design";
import type { ActivityFeedItem } from "@/components/design";

interface RecentActivityProps {
  workspaceId: string | null | undefined;
}

type ActivityType =
  | "prospect_added"
  | "prospect_imported"
  | "campaign_started"
  | "booking_created"
  | "call_session_completed"
  | "status_change"
  | "enrichment_completed";

interface ActivityRow {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  target_url?: string | null;
  actor_name?: string | null;
  actor_avatar?: string | null;
}

async function fetchActivity(): Promise<ActivityRow[]> {
  const res = await fetch("/api/dashboard/activity", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch activity");
  const json = await res.json();
  return (json.data ?? json) as ActivityRow[];
}

function mapStatus(type: ActivityType): ActivityFeedItem["status"] {
  switch (type) {
    case "booking_created":
    case "prospect_added":
    case "enrichment_completed":
      return "success";
    case "call_session_completed":
      return "warning";
    default:
      return "default";
  }
}

export function RecentActivity({ workspaceId }: RecentActivityProps) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["dashboard-activity", workspaceId],
    queryFn: fetchActivity,
    enabled: !!workspaceId,
  });

  const items: ActivityFeedItem[] = activities.map((a) => ({
    id: a.id,
    name: a.title,
    action: a.description,
    time: new Date(a.timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    status: mapStatus(a.type),
    href: a.target_url ?? undefined,
    actorName: a.actor_name ?? undefined,
    actorAvatar: a.actor_avatar ?? undefined,
  }));

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ActivityFeed
      title="Activité récente"
      icon={Activity}
      items={items}
      emptyMessage="Aucune activité récente. Les actions sur vos prospects et campagnes apparaîtront ici."
    />
  );
}
