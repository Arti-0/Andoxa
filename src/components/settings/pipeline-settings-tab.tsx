"use client";

import { StatusList } from "./pipeline/status-list";
import { TagList } from "./pipeline/tag-list";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

/**
 * Pipeline settings tab — CRUD for the per-org statuses and tag
 * dictionary that drive the CRM, kanban filters, the "Changer statut CRM"
 * workflow action, and the new on_status_change / on_tag triggers.
 */
export function PipelineSettingsTab() {
  // #FF: tags — hidden until there's a way to apply tags to prospects.
  const showTags = isFeatureEnabled("tags");
  return (
    <div className="flex flex-col gap-5">
      <StatusList />
      {showTags && <TagList />}
    </div>
  );
}
