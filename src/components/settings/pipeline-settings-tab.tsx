"use client";

import { StatusList } from "./pipeline/status-list";
import { TagList } from "./pipeline/tag-list";

/**
 * Pipeline settings tab — CRUD for the per-org statuses and tag
 * dictionary that drive the CRM, kanban filters, the "Changer statut CRM"
 * workflow action, and the new on_status_change / on_tag triggers.
 */
export function PipelineSettingsTab() {
  return (
    <div className="flex flex-col gap-5">
      <StatusList />
      <TagList />
    </div>
  );
}
