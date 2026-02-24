"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

interface DashboardGridProps {
  workspaceId: string | null | undefined;
}

interface DashboardStats {
  prospects: number;
  campaigns: number;
  events: number;
  conversionRate: number;
  kpis?: {
    chiffreAffaires: number;
    nouveauxProspects: number;
    tauxOuvertureEmails: number | null;
    rendezVousPlanifies: number;
    prospectsQualifies: number;
    dealsEnCours: number;
  };
}

async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  const json = await res.json();
  return (json.data ?? json) as DashboardStats;
}

const KPI_CARDS: {
  key: keyof NonNullable<DashboardStats["kpis"]>;
  label: string;
  format: (v: number) => string;
}[] = [
  { key: "chiffreAffaires", label: "Chiffre d'affaires", format: formatCurrency },
  { key: "nouveauxProspects", label: "Nouveaux prospects", format: formatNumber },
  {
    key: "tauxOuvertureEmails",
    label: "Taux d'ouverture emails",
    format: (v) => `${formatNumber(v)}%`,
  },
  {
    key: "rendezVousPlanifies",
    label: "Rendez-vous planifiés",
    format: formatNumber,
  },
  {
    key: "prospectsQualifies",
    label: "Prospects qualifiés",
    format: formatNumber,
  },
  { key: "dealsEnCours", label: "Deals en cours", format: formatNumber },
];

/**
 * Dashboard Grid - Customizable KPI grid
 *
 * TODO: Implement with React Grid Layout
 * - Drag and drop
 * - Resize
 * - Persist layout
 */
export function DashboardGrid({ workspaceId }: DashboardGridProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", workspaceId],
    queryFn: fetchStats,
    enabled: !!workspaceId,
  });

  const kpis = stats?.kpis;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {KPI_CARDS.map(({ label }) => (
          <div
            key={label}
            className="h-32 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {KPI_CARDS.map(({ key, label, format }) => {
        const rawValue = kpis?.[key];
        const value = typeof rawValue === "number" ? rawValue : 0;
        const isUnavailable = key === "tauxOuvertureEmails" && rawValue === null;

        return (
          <div
            key={key}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {label}
            </h3>
            <p className="text-3xl font-bold">
              {isUnavailable ? "—" : format(value)}
            </p>
            {isUnavailable && (
              <p className="mt-1 text-xs text-muted-foreground">
                Non disponible (données email non connectées)
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
