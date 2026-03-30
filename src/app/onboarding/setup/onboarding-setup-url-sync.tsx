"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export type SetupUrlNavRef = {
  setStepInUrl: (next: number) => void;
};

type OnboardingSetupUrlSyncProps = {
  totalSteps: number;
  setStep: Dispatch<SetStateAction<number>>;
  refreshAuthAndProfile: () => Promise<void>;
  urlNavRef: MutableRefObject<SetupUrlNavRef | null>;
};

/**
 * Isolated useSearchParams + URL sync for onboarding setup.
 * Must render inside a tight Suspense boundary (Next.js 16 + Turbopack).
 */
export function OnboardingSetupUrlSync({
  totalSteps,
  setStep,
  refreshAuthAndProfile,
  urlNavRef,
}: OnboardingSetupUrlSyncProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const linkedHandled = useRef(false);

  useLayoutEffect(() => {
    urlNavRef.current = {
      setStepInUrl(next: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", String(next));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        setStep(next);
      },
    };
    return () => {
      urlNavRef.current = null;
    };
  }, [pathname, router, searchParams, setStep]);

  useEffect(() => {
    const s = searchParams.get("step");
    const n = s ? parseInt(s, 10) : NaN;
    if (!Number.isNaN(n) && n >= 1 && n <= totalSteps) {
      setStep(n);
    }
  }, [searchParams, setStep, totalSteps]);

  useEffect(() => {
    if (linkedHandled.current) return;
    if (searchParams.get("linked") !== "1") return;
    linkedHandled.current = true;
    void refreshAuthAndProfile().then(() => {
      // Defer replace until after hydration / paint to avoid Turbopack AbortError on linked=1 return.
      const path = pathname;
      const sp = searchParams.toString();
      setTimeout(() => {
        const params = new URLSearchParams(sp);
        params.delete("linked");
        const q = params.toString();
        router.replace(q ? `${path}?${q}` : path, { scroll: false });
        toast.success("LinkedIn connecté");
      }, 0);
    });
  }, [pathname, refreshAuthAndProfile, router, searchParams]);

  return null;
}
