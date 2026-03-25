"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { fetchDashboardStats } from "@/components/dashboard/quick-stats";

const prospectsChartConfig: ChartConfig = {
  count: {
    label: "Prospects",
    color: "var(--color-primary)",
  },
};

const activityChartConfig: ChartConfig = {
  calls: {
    label: "Appels",
    color: "hsl(220, 70%, 55%)",
  },
  messages: {
    label: "Messages",
    color: "hsl(160, 60%, 45%)",
  },
  bookings: {
    label: "RDV",
    color: "hsl(35, 90%, 55%)",
  },
};

interface DashboardGridProps {
  workspaceId: string | null | undefined;
}

export function DashboardGrid({ workspaceId }: DashboardGridProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: fetchDashboardStats,
    enabled: !!workspaceId,
  });

  const charts = stats?.charts;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-5 shadow-xs animate-pulse">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-4 h-48 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  const prospectsData = charts?.prospectsOverTime ?? [];
  const activityData = charts?.activityVolume ?? [];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Prospects over time */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-semibold mb-4">Nouveaux prospects</h3>
        {prospectsData.length > 0 ? (
          <ChartContainer config={prospectsChartConfig} className="h-56 w-full">
            <AreaChart data={prospectsData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="fillProspects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#fillProspects)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Aucune donnée
          </div>
        )}
      </div>

      {/* Activity volume */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-semibold mb-4">Volume d&apos;activité</h3>
        {activityData.length > 0 ? (
          <ChartContainer config={activityChartConfig} className="h-56 w-full">
            <BarChart data={activityData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="calls" stackId="a" fill="var(--color-calls)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="messages" stackId="a" fill="var(--color-messages)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bookings" stackId="a" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Aucune donnée
          </div>
        )}
      </div>
    </div>
  );
}
