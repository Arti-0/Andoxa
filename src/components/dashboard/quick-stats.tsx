"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, TrendingUp, Megaphone } from "lucide-react";

export interface DashboardStats {
  prospects: number;
  rdvEffectues: number;
  conversionRate: number;
  campaignsThisMonth: number;
  charts?: {
    prospectsOverTime: { date: string; count: number }[];
    activityVolume: { week: string; calls: number; messages: number; bookings: number }[];
  };
}

interface QuickStatsProps {
  workspaceId: string | null | undefined;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  const json = await res.json();
  const data = (json.data ?? json) as DashboardStats;
  return data;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function QuickStats({ workspaceId }: QuickStatsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: fetchDashboardStats,
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-xs animate-pulse">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="mt-3 h-8 w-16 rounded bg-muted" />
            <div className="mt-2 h-3 w-24 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const s = stats ?? { prospects: 0, rdvEffectues: 0, conversionRate: 0, campaignsThisMonth: 0 };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Total prospects" value={String(s.prospects)} subtitle="Tous statuts confondus" icon={Users} />
      <StatCard title="Nombre de campagnes ce mois" value={String(s.campaignsThisMonth)} subtitle="Campagnes lancées ce mois" icon={Megaphone} />
      <StatCard title="Taux de conversion" value={`${s.conversionRate}%`} subtitle="Prospects signés / total" icon={TrendingUp} />
      <StatCard title="RDV effectués ce mois" value={String(s.rdvEffectues)} subtitle="RDV et réunions terminés" icon={Calendar} />
    </div>
  );
}
