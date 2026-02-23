"use client";

interface DashboardGridProps {
  workspaceId: string | null | undefined;
}

/**
 * Dashboard Grid - Customizable KPI grid
 * 
 * TODO: Implement with React Grid Layout
 * - Drag and drop
 * - Resize
 * - Persist layout
 */
export function DashboardGrid({ workspaceId }: DashboardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Placeholder KPI cards */}
      {[
        "Chiffre d'affaires",
        "Nouveaux prospects",
        "Taux d'ouverture emails",
        "Rendez-vous planifiés",
        "Prospects qualifiés",
        "Deals en cours",
      ].map((title) => (
        <div
          key={title}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          <p className="text-3xl font-bold">—</p>
          <p className="mt-1 text-xs text-muted-foreground">
            À configurer
          </p>
        </div>
      ))}
    </div>
  );
}
