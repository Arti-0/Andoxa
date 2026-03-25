"use client";

import type { Workspace } from "../../lib/workspace/types";
import { displayOrganizationName } from "@/lib/organizations/default-org-name";
import { Building2 } from "lucide-react";

interface DashboardHeaderProps {
  workspace: Workspace | null;
}

export function DashboardHeader({ workspace }: DashboardHeaderProps) {
  const title =
    (workspace?.name && displayOrganizationName(workspace.name)) || "Dashboard";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Workspace logo */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          {workspace?.logo_url ? (
            <img
              src={workspace.logo_url}
              alt={title}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <Building2 className="h-6 w-6 text-primary" />
          )}
        </div>

        {/* Workspace info */}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {workspace?.plan === "demo"
              ? "Plan Démo"
              : workspace?.plan
              ? `Plan ${workspace.plan.charAt(0).toUpperCase() + workspace.plan.slice(1)}`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
