import type { ReactNode } from "react";
import { ProtectedLayoutContent } from "./protected-layout-content";

/**
 * App shell: workspace context only. Session and org gates live in src/proxy.ts.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <ProtectedLayoutContent>{children}</ProtectedLayoutContent>;
}
