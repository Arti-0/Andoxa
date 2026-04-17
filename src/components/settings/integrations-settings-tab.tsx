"use client";

import { Suspense } from "react";
import { LinkedInSettingsSection } from "./linkedin-settings-section";
import { WhatsAppSettingsSection } from "./whatsapp-settings-section";
import { GoogleCalendarSettingsSection } from "./google-calendar-settings-section";
import { ExtensionSettingsSection } from "./extension-settings-section";

interface IntegrationsSettingsTabProps {
  userId: string | null;
}

export function IntegrationsSettingsTab({ userId }: IntegrationsSettingsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <ExtensionSettingsSection userId={userId} />
      <LinkedInSettingsSection />
      <Suspense fallback={null}>
        <WhatsAppSettingsSection />
      </Suspense>
      <Suspense fallback={null}>
        <GoogleCalendarSettingsSection />
      </Suspense>
    </div>
  );
}
