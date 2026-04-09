"use client";

import { OrganizationSettingsSection } from "./organization-settings-section";
import { OrganizationDangerSection } from "./organization-danger-section";

export function OrganizationSettingsTab({
  onSwitch,
}: {
  onSwitch?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <OrganizationSettingsSection onSwitch={onSwitch} />
      <OrganizationDangerSection />
    </div>
  );
}
