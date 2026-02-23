"use client";

import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PremiumNavItemProps {
  href: string;
  children: React.ReactNode;
  requiredPlan: "pro" | "business";
  currentPlan: "essential" | "pro" | "business";
  className?: string;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function PremiumNavItem({
  href,
  children,
  requiredPlan,
  currentPlan,
  className,
  isCollapsed = false,
  onClick,
}: PremiumNavItemProps) {
  const isLocked =
    (currentPlan === "essential" && requiredPlan === "pro") ||
    (currentPlan === "pro" && requiredPlan === "business");

  if (isLocked) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-2 rounded-lg text-slate-400 dark:text-slate-500 cursor-not-allowed",
          className
        )}
      >
        <span className="text-sm font-medium">{children}</span>
        <PremiumBadge
          variant={isCollapsed ? "minimal" : "small"}
          requiredPlan={requiredPlan}
        />
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
      <PremiumBadge
        variant={isCollapsed ? "minimal" : "small"}
        requiredPlan={requiredPlan}
      />
    </Link>
  );
}
