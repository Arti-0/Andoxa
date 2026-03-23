"use client";

import { useWorkspace } from "../../../lib/workspace";
import { DashboardGrid } from "../../../components/dashboard/dashboard-grid";
import { DashboardHeader } from "../../../components/dashboard/dashboard-header";
import { QuickStats } from "../../../components/dashboard/quick-stats";
import { RecentActivity } from "../../../components/dashboard/recent-activity";

export default function DashboardPage() {
  const { workspace } = useWorkspace();

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <DashboardHeader workspace={workspace} />

      <QuickStats workspaceId={workspace?.id} />

      <DashboardGrid workspaceId={workspace?.id} />

      <section>
        <RecentActivity workspaceId={workspace?.id} />
      </section>
    </div>
  );
}
