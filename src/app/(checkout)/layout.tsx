import type { ReactNode } from "react";

/**
 * Checkout Layout - Minimal layout for checkout flow
 *
 * No guards here - checkout pages handle their own logic.
 * This layout is accessible to authenticated users during the checkout process.
 */
export default function CheckoutLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {children}
    </div>
  );
}
