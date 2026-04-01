import type { ReactNode } from "react";

/**
 * Onboarding canvas — Linear-style dark shell (reference: linear.app workspace creation).
 */
export function OnboardingLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground antialiased dark:bg-[#080808]">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
