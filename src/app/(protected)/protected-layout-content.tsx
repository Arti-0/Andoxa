"use client";

import type { ReactNode } from "react";
import { Sidebar } from "../../components/layout/sidebar";
import { Header } from "../../components/layout/header";
import { useWorkspace } from "../../lib/workspace";
import { LoadingSpinner } from "../../components/ui/loading-spinner";
import { DeletedOrganizationBanner } from "../../components/guards/DeletedOrganizationBanner";
import { UnipileAccountBanner } from "@/components/guards/UnipileAccountBanner";
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
 * ProtectedLayoutContent — app chrome. WorkspaceProvider lives at the root so it
 * survives every navigation; this component only renders the spinner on a true
 * cold start (no cached data AND no ongoing fetch result yet). Subsequent
 * background refetches keep the chrome visible — no flash.
 */
function ProtectedLayoutContentInner({ children }: { children: ReactNode }) {
  const { isInitialized, isLoading, workspace, isSyncing } = useWorkspace();

  // Block only when we have no data AND we're loading for the first time.
  // After first success, isInitialized stays true even during background refetches.
  const showColdStartSpinner = !isInitialized && isLoading && !workspace;

  if (showColdStartSpinner) {
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
        <UnipileAccountBanner />

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
  return <ProtectedLayoutContentInner>{children}</ProtectedLayoutContentInner>;
}
