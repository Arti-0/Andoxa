"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  fullName: string;
  jeRole: string;
  password: string;
  additionalInfo: Record<string, any>;
  gdprConsent?: boolean;
  profilePicture?: File;
  linkedinUsername?: string;
  _hasHydrated: boolean;
  setData: (data: Partial<OnboardingState>) => void;
  setHasHydrated: (value: boolean) => void;
  reset: () => void;
}

const initialState = {
  fullName: "",
  jeRole: "",
  password: "",
  additionalInfo: {},
  gdprConsent: false,
  profilePicture: undefined,
  linkedinUsername: undefined,
  _hasHydrated: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setData: (data) => set((state) => ({ ...state, ...data })),
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      reset: () => set(initialState),
    }),
    {
      name: "onboarding-storage",
      partialize: (state) => ({
        fullName: state.fullName,
        jeRole: state.jeRole,
        password: state.password,
        additionalInfo: state.additionalInfo,
        gdprConsent: state.gdprConsent,
        linkedinUsername: state.linkedinUsername,
        // Note: File objects cannot be serialized, so profilePicture is excluded
      }),
    }
  )
);
