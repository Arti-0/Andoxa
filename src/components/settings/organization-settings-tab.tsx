"use client";

import { OrganizationSettingsSection } from "./organization-settings-section";
import { OrganizationDangerSection } from "./organization-danger-section";

export function OrganizationSettingsTab() {
  return (
    <div className="flex flex-col gap-5">
      <OrganizationSettingsSection />
      <OrganizationDangerSection />
    </div>
  );
}
