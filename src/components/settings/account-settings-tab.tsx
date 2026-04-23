"use client";

import { ProfileSettingsSection } from "./profile-settings-section";
import { ThemeSettingsSection } from "./theme-settings-section";
import { PasswordSettingsSection } from "./password-settings-section";
import { AccountSettingsSection } from "./account-settings-section";
import { AvailabilitySettingsSection } from "./availability-settings-section";

interface AccountSettingsTabProps {
  fullName: string | null;
  email: string | null;
  onSuccess: () => void;
}

export function AccountSettingsTab({
  fullName,
  email,
  onSuccess,
}: AccountSettingsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileSettingsSection
        fullName={fullName}
        email={email}
        onSuccess={onSuccess}
      />
      <AvailabilitySettingsSection />
      <ThemeSettingsSection />
      <PasswordSettingsSection />
      <AccountSettingsSection />
    </div>
  );
}
