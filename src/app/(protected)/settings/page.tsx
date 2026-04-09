"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/lib/workspace";
import { AccountSettingsTab } from "@/components/settings/account-settings-tab";
import { OrganizationSettingsTab } from "@/components/settings/organization-settings-tab";

export default function SettingsPage() {
  const { profile, user, refresh } = useWorkspace();

  const userId = user?.id ?? profile?.id ?? null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:pt-8">
      <Tabs defaultValue="account">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="account" className="flex-1 sm:flex-none">
            Compte
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex-1 sm:flex-none">
            Organisation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account">
          <AccountSettingsTab
            fullName={profile?.full_name ?? null}
            email={profile?.email ?? null}
            userId={userId}
            onSuccess={refresh}
          />
        </TabsContent>

        <TabsContent value="organization">
          <OrganizationSettingsTab onSwitch={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
