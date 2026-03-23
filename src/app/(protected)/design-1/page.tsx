"use client";

import {
  Users,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Clock,
  Target,
  Activity,
} from "lucide-react";

function StatCard({
  title,
  value,
  change,
  changeType,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const changeColor =
    changeType === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : changeType === "negative"
        ? "text-red-500 dark:text-red-400"
        : "text-muted-foreground";
  const ChangeIcon = changeType === "positive" ? ArrowUpRight : changeType === "negative" ? ArrowDownRight : null;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${changeColor}`}>
          {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function KPIRow({
  items,
}: {
  items: { label: string; value: string; color: string }[];
}) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border sm:grid-cols-3">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex flex-col gap-1 p-5 ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}
        >
          <span className="text-sm text-muted-foreground">{item.label}</span>
          <span className={`text-2xl font-bold tracking-tight ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiniChart() {
  const bars = [35, 58, 42, 70, 55, 80, 65, 90, 72, 85, 60, 95];
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-1 h-16">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-primary/20 dark:bg-primary/30 transition-all hover:bg-primary/40"
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

function RecentActivityItem({
  name,
  action,
  time,
  status,
}: {
  name: string;
  action: string;
  time: string;
  status: "success" | "warning" | "default";
}) {
  const dotColor =
    status === "success"
      ? "bg-emerald-500"
      : status === "warning"
        ? "bg-amber-500"
        : "bg-slate-400";
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{action}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

export default function Design1Page() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Design 1 — Dashboard & Stats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Component gallery for dashboard KPI cards, stat rows, activity lists, and mini charts.
        </p>
      </div>

      {/* Section: Stat Cards */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stat Cards</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Prospects" value="1,245" change="+12.5%" changeType="positive" subtitle="vs. mois précédent" icon={Users} />
          <StatCard title="Appels passés" value="328" change="+8.2%" changeType="positive" subtitle="cette semaine" icon={Phone} />
          <StatCard title="RDV pris" value="47" change="-3.1%" changeType="negative" subtitle="cette semaine" icon={Calendar} />
          <StatCard title="Taux de contact" value="68%" change="+2.4%" changeType="positive" subtitle="vs. moyenne" icon={Target} />
        </div>
      </section>

      {/* Section: KPI Row (borderless split) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">KPI Row</h2>
        <KPIRow
          items={[
            { label: "Revenus générés", value: "€24,800", color: "text-emerald-600" },
            { label: "Pipeline actif", value: "€142,500", color: "text-blue-600" },
            { label: "Taux de conversion", value: "3.2%", color: "text-amber-600" },
          ]}
        />
      </section>

      {/* Section: Card with Mini Chart */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Card + Mini Chart</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activité d&apos;appels</p>
                <p className="text-xl font-bold">328 appels</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
            </div>
            <MiniChart />
            <p className="text-xs text-muted-foreground">12 dernières semaines</p>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Temps moyen par appel</p>
                <p className="text-xl font-bold">4m 32s</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[68%] rounded-full bg-emerald-500" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">68%</span>
            </div>
            <p className="text-xs text-muted-foreground">Objectif : 5m 00s</p>
          </div>
        </div>
      </section>

      {/* Section: Activity Feed */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Activity Feed</h2>
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Activité récente</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y">
            <RecentActivityItem name="Jean Dupont" action="RDV confirmé pour demain 14h" time="il y a 5m" status="success" />
            <RecentActivityItem name="Marie Martin" action="Rappeler — intéressée par l'offre Pro" time="il y a 23m" status="warning" />
            <RecentActivityItem name="Paul Lefèvre" action="Pas de réponse — 3e tentative" time="il y a 1h" status="default" />
            <RecentActivityItem name="Sophie Bernard" action="Prospect ajouté depuis LinkedIn" time="il y a 2h" status="success" />
            <RecentActivityItem name="Lucas Moreau" action="Statut changé → Qualifié" time="il y a 3h" status="success" />
          </div>
        </div>
      </section>

      {/* Section: Empty State */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Empty State</h2>
        <div className="rounded-xl border border-dashed p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">Aucune donnée</h3>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
            Commencez à prospecter pour voir vos statistiques apparaître ici.
          </p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <TrendingUp className="h-4 w-4" />
            Commencer
          </button>
        </div>
      </section>
    </div>
  );
}
