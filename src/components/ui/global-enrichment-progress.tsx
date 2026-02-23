"use client";

import { useEnrichmentProgress } from "@/contexts/enrichment-progress-context";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { useEffect } from "react";

export function GlobalEnrichmentProgress() {
  const { progress, resetProgress } = useEnrichmentProgress();

  // Auto-hide progress after 5 seconds of completion
  useEffect(() => {
    if (!progress.isActive && progress.completed + progress.failed > 0) {
      const timer = setTimeout(() => {
        resetProgress();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [progress.isActive, progress.completed, progress.failed, resetProgress]);

  if (!progress.isActive && progress.completed + progress.failed === 0) {
    return null;
  }

  const totalProcessed = progress.completed + progress.failed;
  const progressPercentage = progress.total > 0 ? (totalProcessed / progress.total) * 100 : 0;
  const successRate = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
  const remaining = progress.total - totalProcessed;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {progress.isActive ? "Enrichissement en cours" : "Enrichissement terminé"}
          </h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {totalProcessed}/{progress.total}
        </Badge>
      </div>

      <div className="space-y-3">
        <Progress value={progressPercentage} className="h-2" />

        <div className="flex justify-between text-sm text-gray-600">
          <span>Progression: {Math.round(progressPercentage)}%</span>
          <span>Succès: {Math.round(successRate)}%</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>{progress.completed} réussis</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            <span>{progress.failed} échecs</span>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Clock className="h-3 w-3" />
            <span>{remaining} en attente</span>
          </div>
        </div>

        {!progress.isActive && totalProcessed > 0 && (
          <div className="text-center text-sm text-gray-500 mt-2">
            ✅ Enrichissement terminé !
          </div>
        )}
      </div>
    </div>
  );
}
