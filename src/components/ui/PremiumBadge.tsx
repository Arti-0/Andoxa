"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  variant?: "default" | "small" | "minimal";
  className?: string;
  children?: React.ReactNode;
  showStar?: boolean;
  /**
   * Visual tone of the badge. The new plan model has a single "paid" tier
   * (Solo/Team/Custom all include the same features), so we keep `team` for
   * the default blue gradient and `custom` for the warmer enterprise look.
   */
  tone?: "team" | "custom";
}

export function PremiumBadge({
  variant = "default",
  className,
  children,
  showStar = true,
  tone = "team",
}: PremiumBadgeProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "small":
        return "px-2 py-1 text-xs font-medium rounded-md";
      case "minimal":
        return "text-xs font-medium";
      default:
        return "px-2.5 py-1 text-sm font-medium rounded-lg";
    }
  };

  const getColorClasses = () => {
    if (tone === "custom") {
      return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900/20 dark:to-pink-900/20 dark:text-purple-300";
    }
    return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-blue-300";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        getVariantClasses(),
        getColorClasses(),
        className
      )}
    >
      {showStar && (
        <Star
          className={cn(
            "flex-shrink-0",
            variant === "small"
              ? "h-3 w-3"
              : variant === "minimal"
                ? "h-3 w-3"
                : "h-4 w-4"
          )}
        />
      )}
      {children || (tone === "custom" ? "Custom" : "Premium")}
    </span>
  );
}
