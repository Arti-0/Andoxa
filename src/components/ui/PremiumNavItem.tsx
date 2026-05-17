"use client";

import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { isPaidPlan, type PlanId } from "@/lib/config/plans-config";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PremiumNavItemProps {
  href: string;
  children: React.ReactNode;
  currentPlan: PlanId;
  className?: string;
  isCollapsed?: boolean;
  onClick?: () => void;
}

/**
 * Sidebar nav item that's only navigable on a paid plan; otherwise it's
 * rendered locked with a PremiumBadge.
 */
export function PremiumNavItem({
  href,
  children,
  currentPlan,
  className,
  isCollapsed = false,
  onClick,
}: PremiumNavItemProps) {
  const locked = !isPaidPlan(currentPlan);

  if (locked) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-2 rounded-lg text-slate-400 dark:text-slate-500 cursor-not-allowed",
          className
        )}
      >
        <span className="text-sm font-medium">{children}</span>
        <PremiumBadge variant={isCollapsed ? "minimal" : "small"} />
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
        className
      )}
    >
      <span className="text-sm font-medium">{children}</span>
      <PremiumBadge variant={isCollapsed ? "minimal" : "small"} />
    </Link>
  );
}
