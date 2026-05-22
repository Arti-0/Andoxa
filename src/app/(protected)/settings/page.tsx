"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace";
import { AccountSettingsTab } from "@/components/settings/account-settings-tab";
import { IntegrationsSettingsTab } from "@/components/settings/integrations-settings-tab";
import { OrganizationSettingsTab } from "@/components/settings/organization-settings-tab";
import { PipelineSettingsTab } from "@/components/settings/pipeline-settings-tab";

function resolveTabFromSearch(searchParams: ReturnType<typeof useSearchParams>): string {
  const t = searchParams.get("tab");
  if (t === "integrations" || t === "organization" || t === "pipeline") return t;
  return "account";
}

function SettingsPageInner() {
  const { profile, user, refresh } = useWorkspace();
  const searchParams = useSearchParams();
  const userId = user?.id ?? profile?.id ?? null;
  const defaultTab = resolveTabFromSearch(searchParams);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <header className="settings-page-header">
        <h1>Paramètres</h1>
        <p>
          Gérez votre compte, vos intégrations et votre organisation depuis un
          seul endroit.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} key={defaultTab} className="gap-6">
        <TabsList className="settings-tabs-list">
          <TabsTrigger value="account" className="settings-tabs-trigger">
            Compte
          </TabsTrigger>
          <TabsTrigger value="integrations" className="settings-tabs-trigger">
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="organization" className="settings-tabs-trigger">
            Organisation
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="settings-tabs-trigger">
            Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettingsTab
            fullName={profile?.full_name ?? null}
            email={profile?.email ?? null}
            onSuccess={refresh}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsSettingsTab userId={userId} />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationSettingsTab onSwitch={refresh} />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" aria-hidden />
        </div>
      }
    >
      <SettingsPageInner />
    </Suspense>
  );
}
