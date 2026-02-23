"use client";

import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";

interface RecentActivityProps {
  workspaceId: string | null | undefined;
}

interface Activity {
  id: string;
  type: "prospect_added";
  title: string;
  description: string;
  timestamp: string;
}

const ACTIVITY_ICONS = {
  prospect_added: UserPlus,
};

const ACTIVITY_COLORS = {
  prospect_added: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
};

async function fetchActivity(): Promise<Activity[]> {
  const res = await fetch("/api/dashboard/activity", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch activity");
  const json = await res.json();
  return (json.data ?? json) as Activity[];
}

function formatTimestamp(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  return `Il y a ${days}j`;
}

export function RecentActivity({ workspaceId }: RecentActivityProps) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["dashboard-activity", workspaceId],
    queryFn: fetchActivity,
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <ul className="divide-y">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type];
          const colorClass = ACTIVITY_COLORS[activity.type];

          return (
            <li key={activity.id} className="flex items-center gap-4 p-4">
              <div className={`rounded-lg p-2 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-medium">{activity.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {activity.description}
                </p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {formatTimestamp(new Date(activity.timestamp))}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
