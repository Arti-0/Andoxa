"use client";

import type { ReactNode } from "react";
import { WorkspaceProvider } from "../../lib/workspace";
import { Sidebar } from "../../components/layout/sidebar";
import { Header } from "../../components/layout/header";
import { useWorkspace } from "../../lib/workspace";
import { LoadingSpinner } from "../../components/ui/loading-spinner";
import { DeletedOrganizationBanner } from "../../components/guards/DeletedOrganizationBanner";
import { AnnouncementBanner } from "../../components/guards/AnnouncementBanner";
import { ErrorButton } from "../../components/debug/ErrorButton";
import { CommandPalette } from "../../components/layout/command-palette";
import { PlanRouteGuard } from "../../components/guards/PlanRouteGuard";
import { ExpiredSubscriptionState } from "@/components/guards/ExpiredSubscriptionState";
import { hasActiveBilling } from "@/lib/billing/workspace-billing";
import type { SubscriptionStatus } from "@/lib/workspace/types";

function BillingExpiredGate({ children }: { children: ReactNode }) {
  const { workspace, isInitialized } = useWorkspace();

  if (!isInitialized || !workspace) {
    return <>{children}</>;
  }

  const billingOk = hasActiveBilling({
    subscription_status: workspace.subscription_status as SubscriptionStatus | null,
    trial_ends_at: workspace.trial_ends_at,
  });

  if (
    !billingOk &&
    workspace.subscription_status !== null &&
    workspace.subscription_status !== undefined
  ) {
    const trialEnded =
      workspace.subscription_status === "trialing" &&
      workspace.trial_ends_at &&
      new Date(workspace.trial_ends_at).getTime() <= Date.now();
    return (
      <ExpiredSubscriptionState variant={trialEnded ? "trial_ended" : "default"} />
    );
  }

  return <>{children}</>;
}

/**
 * ProtectedLayoutContent — workspace context + app chrome. Entitlement redirects are in src/proxy.ts.
 */
function ProtectedLayoutContentInner({ children }: { children: ReactNode }) {
  const { isInitialized, isSyncing } = useWorkspace();

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner text="Initialisation..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <AnnouncementBanner />
        <DeletedOrganizationBanner />

        <main className="flex-1 overflow-auto bg-background relative">
          {/* Barre de progression discrète en haut du contenu lors d'un rechargement */}
          {isSyncing && (
            <div className="absolute top-0 left-0 z-50 h-1 w-full overflow-hidden bg-primary/10">
              <div className="h-full w-full bg-primary transition-all duration-500 ease-out animate-progress-flow" />
            </div>
          )}
          <PlanRouteGuard>
            <BillingExpiredGate>{children}</BillingExpiredGate>
          </PlanRouteGuard>
        </main>
      </div>
      <CommandPalette />
      {process.env.NODE_ENV === "development" && <ErrorButton />}
    </div>
  );
}

export function ProtectedLayoutContent({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <ProtectedLayoutContentInner>{children}</ProtectedLayoutContentInner>
    </WorkspaceProvider>
  );
}
