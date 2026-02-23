"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Mail, Calendar, TrendingUp } from "lucide-react";

interface QuickStatsProps {
  workspaceId: string | null | undefined;
}

interface Stats {
  prospects: number;
  campaigns: number;
  events: number;
  conversionRate: number;
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/dashboard/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  const json = await res.json();
  return (json.data ?? json) as Stats;
}

export function QuickStats({ workspaceId }: QuickStatsProps) {
  const { data: stats = { prospects: 0, campaigns: 0, events: 0, conversionRate: 0 }, isLoading } =
    useQuery({
      queryKey: ["dashboard-stats", workspaceId],
      queryFn: fetchStats,
      enabled: !!workspaceId,
    });

  const statCards = [
    {
      label: "Prospects",
      value: stats.prospects,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Campagnes actives",
      value: stats.campaigns,
      icon: Mail,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Événements ce mois",
      value: stats.events,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Taux de conversion",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
