"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace";
import { AccountSettingsTab } from "@/components/settings/account-settings-tab";
import { IntegrationsSettingsTab } from "@/components/settings/integrations-settings-tab";
import { OrganizationSettingsTab } from "@/components/settings/organization-settings-tab";

function resolveTabFromSearch(searchParams: ReturnType<typeof useSearchParams>): string {
  const t = searchParams.get("tab");
  if (t === "integrations" || t === "organization") return t;
  return "account";
}

function SettingsPageInner() {
  const { profile, user, refresh } = useWorkspace();
  const searchParams = useSearchParams();
  const userId = user?.id ?? profile?.id ?? null;
  const defaultTab = resolveTabFromSearch(searchParams);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:pt-8">
      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="account" className="flex-1 sm:flex-none">
            Compte
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1 sm:flex-none">
            Intégrations
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex-1 sm:flex-none">
            Organisation
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
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:pt-8">
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" aria-hidden />
        </div>
      }
    >
      <SettingsPageInner />
    </Suspense>
  );
}
