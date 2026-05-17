"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import type { PlanId } from "@/lib/config/plans-config";

interface UpgradeButtonProps {
  /** Where the user is today. Drives target plan + label. */
  currentPlan: PlanId;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

/**
 * Route the user toward the next sensible upgrade step.
 *
 *   trial → solo  (the very first paid step)
 *   solo  → team  (more seats, collab)
 *   team  → custom (contact sales)
 *   custom/demo → no-op (already at the top of the funnel)
 */
function getTargetPlan(currentPlan: PlanId): PlanId | null {
  switch (currentPlan) {
    case "trial":
      return "solo";
    case "solo":
      return "team";
    case "team":
      return "custom";
    case "custom":
    case "demo":
      return null;
  }
}

export function UpgradeButton({
  currentPlan,
  variant = "default",
  size = "default",
  className,
  children,
  showIcon = true,
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useUser();
  const router = useRouter();

  const targetPlan = getTargetPlan(currentPlan);

  const handleUpgrade = async () => {
    if (!targetPlan) return;
    setIsLoading(true);
    try {
      if (targetPlan === "custom") {
        router.push("/contact?objet=custom");
      } else {
        // Solo/Team go through the authenticated checkout flow.
        if (isAuthenticated) {
          router.push(`/onboarding/plan?upgrade=${targetPlan}`);
        } else {
          const returnUrl = `/onboarding/plan?upgrade=${targetPlan}`;
          window.location.href = `/auth/login?redirect=${encodeURIComponent(
            returnUrl
          )}`;
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'upgrade:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (children) return children;
    switch (targetPlan) {
      case "solo":
        return "Passer à Solo";
      case "team":
        return "Passer à Team";
      case "custom":
        return "Contactez-nous";
      default:
        return "Plan max atteint";
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;
    switch (targetPlan) {
      case "solo":
      case "team":
        return <Crown className="h-4 w-4" />;
      case "custom":
        return <Sparkles className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getButtonStyle = () => {
    switch (targetPlan) {
      case "solo":
        return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0";
      case "team":
      case "custom":
        return "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0";
      default:
        return "";
    }
  };

  return (
    <Button
      onClick={handleUpgrade}
      variant={variant}
      size={size}
      disabled={isLoading || !targetPlan}
      className={cn(
        "font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg",
        getButtonStyle(),
        className
      )}
    >
      {getIcon() && <span className="mr-2">{getIcon()}</span>}
      {isLoading ? "Chargement..." : getButtonText()}
    </Button>
  );
}
