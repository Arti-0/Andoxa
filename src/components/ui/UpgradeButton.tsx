"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
// import { redirectToCheckout } from "@/lib/stripe/client";

interface UpgradeButtonProps {
  currentPlan: "trial" | "essential" | "pro" | "business";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
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

  // Déterminer le plan cible basé sur le plan actuel
  const getTargetPlan = () => {
    switch (currentPlan) {
      case "trial":
        return "essential";
      case "essential":
        return "pro";
      case "pro":
        return "business";
      default:
        return "essential";
    }
  };

  const targetPlan = getTargetPlan();

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      if (targetPlan === "business") {
        // Rediriger vers Calendly pour Business
        window.open("https://calendly.com/andoxa/30min", "_blank");
      } else {
        // Si l'utilisateur est déjà connecté, rediriger directement vers billing
        if (isAuthenticated) {
          router.push(`/settings?upgrade=${targetPlan}`);
        } else {
          // Sinon, rediriger vers page de connexion puis checkout
        const returnUrl = `/settings?upgrade=${targetPlan}`;
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
      case "essential":
        return currentPlan === "trial"
          ? "Passer à Essential"
          : "Passer à Essential";
      case "pro":
        return "Passer au Pro";
      case "business":
        return "Contactez-nous";
      default:
        return "Upgrade";
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;

    switch (targetPlan) {
      case "essential":
        return <Crown className="h-4 w-4" />;
      case "pro":
        return <Crown className="h-4 w-4" />;
      case "business":
        return <Sparkles className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getButtonStyle = () => {
    switch (targetPlan) {
      case "essential":
        return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0";
      case "pro":
        return "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0";
      case "business":
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
      disabled={isLoading}
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