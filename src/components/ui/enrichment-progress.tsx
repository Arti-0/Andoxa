"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Zap } from "lucide-react";

interface EnrichmentProgressProps {
  total: number;
  completed: number;
  failed: number;
  isActive: boolean;
  onComplete?: () => void;
}

export function EnrichmentProgress({
  total,
  completed,
  failed,
  isActive,
  onComplete,
}: EnrichmentProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (total > 0) {
      const newProgress = ((completed + failed) / total) * 100;
      setProgress(newProgress);

      // Call onComplete when all prospects are processed
      if (completed + failed === total && isActive && onComplete) {
        setTimeout(() => {
          onComplete();
        }, 1000); // Small delay to show completion
      }
    }
  }, [total, completed, failed, isActive, onComplete]);

  if (!isActive) return null;

  const remaining = total - completed - failed;
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Enrichissement en cours</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {completed + failed}/{total}
        </Badge>
      </div>

      <div className="space-y-3">
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progression: {Math.round(progress)}%</span>
          <span>Succès: {Math.round(successRate)}%</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>{completed} réussis</span>
          </div>
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            <span>{failed} échecs</span>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <Clock className="h-3 w-3" />
            <span>{remaining} en attente</span>
          </div>
        </div>

        {remaining === 0 && (
          <div className="text-center text-sm text-gray-500 mt-2">
            Enrichissement terminé !
          </div>
        )}
      </div>
    </div>
  );
}
