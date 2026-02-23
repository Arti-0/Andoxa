import type { ReactNode } from "react";

/**
 * Public Layout - No authentication required
 * 
 * Routes: /, /pricing, /auth/*, /about, etc.
 * Minimal layout - each page handles its own header/footer
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
