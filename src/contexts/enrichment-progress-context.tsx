"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface EnrichmentProgress {
  isActive: boolean;
  completed: number;
  failed: number;
  total: number;
}

interface EnrichmentProgressContextValue {
  progress: EnrichmentProgress;
  resetProgress: () => void;
  setProgress: (updates: Partial<EnrichmentProgress>) => void;
}

const defaultProgress: EnrichmentProgress = {
  isActive: false,
  completed: 0,
  failed: 0,
  total: 0,
};

const EnrichmentProgressContext = createContext<EnrichmentProgressContextValue | null>(null);

export function EnrichmentProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState<EnrichmentProgress>(defaultProgress);

  const setProgress = useCallback((updates: Partial<EnrichmentProgress>) => {
    setProgressState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgressState(defaultProgress);
  }, []);

  return (
    <EnrichmentProgressContext.Provider
      value={{ progress, resetProgress, setProgress }}
    >
      {children}
    </EnrichmentProgressContext.Provider>
  );
}

export function useEnrichmentProgress(): EnrichmentProgressContextValue {
  const ctx = useContext(EnrichmentProgressContext);
  if (!ctx) {
    return {
      progress: defaultProgress,
      resetProgress: () => {},
      setProgress: () => {},
    };
  }
  return ctx;
}
