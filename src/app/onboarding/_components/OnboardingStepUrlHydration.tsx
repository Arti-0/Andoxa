"use client";

import { useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";

export function OnboardingStepUrlHydration({
  totalSteps,
  onHydrate,
}: {
  totalSteps: number;
  onHydrate: (step: number) => void;
}) {
  const searchParams = useSearchParams();

  useLayoutEffect(() => {
    const s = searchParams.get("step");
    const n = s ? parseInt(s, 10) : NaN;
    if (!Number.isNaN(n) && n >= 1 && n <= totalSteps) {
      onHydrate(n);
    }
  }, [onHydrate, searchParams, totalSteps]);

  return null;
}
