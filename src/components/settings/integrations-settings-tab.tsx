"use client";

import { Suspense } from "react";
import { LinkedInSettingsSection } from "./linkedin-settings-section";
import { WhatsAppSettingsSection } from "./whatsapp-settings-section";
import { GoogleCalendarSettingsSection } from "./google-calendar-settings-section";
import { ExtensionSettingsSection } from "./extension-settings-section";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

// WhatsApp connector is gated behind the `whatsapp` #FF (same flag as the
// rest of the WhatsApp feature surface).
const SHOW_WHATSAPP = isFeatureEnabled("whatsapp");

export function IntegrationsSettingsTab() {
  return (
    <div className="flex flex-col gap-5">
      <ExtensionSettingsSection />
      <LinkedInSettingsSection />
      {SHOW_WHATSAPP ? (
        <Suspense fallback={null}>
          <WhatsAppSettingsSection />
        </Suspense>
      ) : null}
      <Suspense fallback={null}>
        <GoogleCalendarSettingsSection />
      </Suspense>
    </div>
  );
}
