"use client";

import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { UpgradeButton } from "@/components/ui/UpgradeButton";
import { isPaidPlan, type PlanId } from "@/lib/config/plans-config";
import { cn } from "@/lib/utils";

interface PremiumButtonProps {
  currentPlan: PlanId;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  children: React.ReactNode;
  showBadge?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * Wraps a primary action behind a "needs a paid plan" lock.
 *
 * Under the new model every paid plan unlocks every feature, so the gate is
 * simple: `currentPlan` is paid → render the button; otherwise → render an
 * `UpgradeButton`.
 */
export function PremiumButton({
  currentPlan,
  variant = "default",
  size = "default",
  className,
  children,
  showBadge = true,
  disabled = false,
  onClick,
}: PremiumButtonProps) {
  const locked = !isPaidPlan(currentPlan);

  if (locked) {
    return (
      <div className="relative">
        <UpgradeButton
          currentPlan={currentPlan}
          variant={variant}
          size={size}
          className={cn(
            "relative",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {children}
            {showBadge && <PremiumBadge variant="small" />}
          </div>
        </UpgradeButton>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        "relative",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {children}
        {showBadge && <PremiumBadge variant="small" />}
      </div>
    </Button>
  );
}
