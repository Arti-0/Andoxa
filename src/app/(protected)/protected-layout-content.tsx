"use client";

import type { ReactNode } from "react";
import { WorkspaceProvider } from "../../lib/workspace";
import { Sidebar } from "../../components/layout/sidebar";
import { Header } from "../../components/layout/header";
import { useWorkspace } from "../../lib/workspace";
import { LoadingSpinner } from "../../components/ui/loading-spinner";
import { DeletedOrganizationBanner } from "../../components/guards/DeletedOrganizationBanner";
import { AnnouncementBanner } from "../../components/guards/AnnouncementBanner";

/**
 * ProtectedLayoutContent - Client component that provides workspace context
 *
 * This component is only rendered after all guards pass in the Server Component layout.
 * It provides the WorkspaceProvider and renders the sidebar/header structure.
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
          {children}
        </main>
      </div>
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
