"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PipelineSettingsTab } from "@/components/settings/pipeline-settings-tab";

interface PipelineSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineSettingsModal({
  open,
  onOpenChange,
}: PipelineSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pipeline et statuts</DialogTitle>
        </DialogHeader>
        <PipelineSettingsTab />
      </DialogContent>
    </Dialog>
  );
}
