import type { ReactNode } from "react";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/config/feature-flags";

/**
 * Declarative gate for an experimental feature (#FF).
 *
 *   <Flag name="workflows">
 *     <WorkflowsColumn />
 *   </Flag>
 *
 * Renders nothing (or `fallback`) when the flag is off. No runtime cost beyond
 * a boolean read — see {@link FeatureFlag} for the convention.
 */
export function Flag({
  name,
  children,
  fallback = null,
}: {
  name: FeatureFlag;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{isFeatureEnabled(name) ? children : fallback}</>;
}
