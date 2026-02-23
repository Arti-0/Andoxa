"use client";

import { useWorkspace } from "../../../lib/workspace";
import { DashboardGrid } from "../../../components/dashboard/dashboard-grid";
import { DashboardHeader } from "../../../components/dashboard/dashboard-header";
import { QuickStats } from "../../../components/dashboard/quick-stats";
import { RecentActivity } from "../../../components/dashboard/recent-activity";

/**
 * Dashboard Page - Fusionné (ex: dashboard + overview + exe)
 * 
 * Point 6: "Fusionner dashboard/overview/exe"
 * Un dashboard riche > trois dashboards pauvres
 * 
 * Sections:
 * - Quick Stats (prospects, campaigns, revenue)
 * - KPI Grid (customizable)
 * - Recent Activity
 */
export default function DashboardPage() {
  const { workspace, hasActivePlan } = useWorkspace();

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header with workspace info */}
      <DashboardHeader workspace={workspace} />

      {/* Quick Stats - Top metrics at a glance */}
      <QuickStats workspaceId={workspace?.id} />

      {/* Main KPI Grid - Customizable */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Indicateurs clés</h2>
        <DashboardGrid workspaceId={workspace?.id} />
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Activité récente</h2>
        <RecentActivity workspaceId={workspace?.id} />
      </section>
    </div>
  );
}
