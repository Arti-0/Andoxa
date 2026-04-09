"use client";

import { Suspense } from "react";
import { ProfileSettingsSection } from "./profile-settings-section";
import { ThemeSettingsSection } from "./theme-settings-section";
import { PasswordSettingsSection } from "./password-settings-section";
import { LinkedInSettingsSection } from "./linkedin-settings-section";
import { WhatsAppSettingsSection } from "./whatsapp-settings-section";
import { ExtensionSettingsSection } from "./extension-settings-section";
import { AccountSettingsSection } from "./account-settings-section";

interface AccountSettingsTabProps {
  fullName: string | null;
  email: string | null;
  userId: string | null;
  onSuccess: () => void;
}

export function AccountSettingsTab({
  fullName,
  email,
  userId,
  onSuccess,
}: AccountSettingsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileSettingsSection
        fullName={fullName}
        email={email}
        onSuccess={onSuccess}
      />
      <ThemeSettingsSection />
      <PasswordSettingsSection />
      <LinkedInSettingsSection />
      <Suspense fallback={null}>
        <WhatsAppSettingsSection />
      </Suspense>
      <ExtensionSettingsSection userId={userId} />
      <AccountSettingsSection />
    </div>
  );
}
