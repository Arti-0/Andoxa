"use client";

import { useEffect } from "react";
import { useOnboardingStore } from "@/app/onboarding/store";

/**
 * Component to handle Zustand store hydration
 * This prevents unnecessary re-renders and Fast Refresh loops
 */
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const setHasHydrated = useOnboardingStore((state) => state.setHasHydrated);

  useEffect(() => {
    // Mark store as hydrated after mount
    setHasHydrated(true);
  }, [setHasHydrated]);

  return <>{children}</>;
}

