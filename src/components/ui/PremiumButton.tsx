"use client";

import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { UpgradeButton } from "@/components/ui/UpgradeButton";
import { cn } from "@/lib/utils";

interface PremiumButtonProps {
  currentPlan: "essential" | "pro" | "business";
  requiredPlan: "pro" | "business";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  children: React.ReactNode;
  showBadge?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function PremiumButton({
  currentPlan,
  requiredPlan,
  variant = "default",
  size = "default",
  className,
  children,
  showBadge = true,
  disabled = false,
  onClick,
}: PremiumButtonProps) {
  const isLocked =
    (currentPlan === "essential" && requiredPlan === "pro") ||
    (currentPlan === "pro" && requiredPlan === "business");

  if (isLocked) {
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
            {showBadge && (
              <PremiumBadge variant="small" requiredPlan={requiredPlan} />
            )}
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
        {showBadge && (
          <PremiumBadge variant="small" requiredPlan={requiredPlan} />
        )}
      </div>
    </Button>
  );
}
