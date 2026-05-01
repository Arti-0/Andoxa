"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/lib/workspace";
import { normalizePlanIdForRoutes } from "@/lib/billing/effective-plan";
import { canAccessRoute, type PlanId } from "@/lib/config/plans-config";
import { UpgradePlanWall } from "./UpgradePlanWall";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function PlanRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { workspace, isInitialized, isLoading } = useWorkspace();

  // Only show cold-start fallback. Once we have any workspace data, render
  // children even during background refetches — gate decisions stay valid.
  if (!isInitialized && isLoading && !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner text="Chargement..." />
      </div>
    );
  }

  const plan = normalizePlanIdForRoutes(
    workspace?.plan,
    workspace?.subscription_status
  ) as PlanId;

  if (canAccessRoute(plan, pathname)) {
    return <>{children}</>;
  }

  return <UpgradePlanWall featurePath={pathname} />;
}
