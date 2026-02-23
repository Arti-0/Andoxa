"use client";

import { Badge } from "@/components/ui/badge";
import { Mail, Phone, TrendingUp, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrichmentStatusBadgeProps {
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasConfidence?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function EnrichmentStatusBadge({
  hasEmail = false,
  hasPhone = false,
  hasConfidence = false,
  size = "sm",
  className,
}: EnrichmentStatusBadgeProps) {
  const badges = [];

  if (hasEmail) {
    badges.push(
      <Badge
        key="email"
        variant="secondary"
        className={cn(
          "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400",
          size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
        )}
      >
        <Mail className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
        Email
      </Badge>
    );
  }

  if (hasPhone) {
    badges.push(
      <Badge
        key="phone"
        variant="secondary"
        className={cn(
          "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400",
          size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
        )}
      >
        <Phone className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
        Téléphone
      </Badge>
    );
  }

  if (hasConfidence) {
    badges.push(
      <Badge
        key="confidence"
        variant="secondary"
        className={cn(
          "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400",
          size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
        )}
      >
        <TrendingUp className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
        Confiance
      </Badge>
    );
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {badges}
    </div>
  );
}

interface EnrichmentSuccessBadgeProps {
  className?: string;
}

export function EnrichmentSuccessBadge({ className }: EnrichmentSuccessBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400",
        "text-xs px-2 py-1 animate-pulse",
        className
      )}
    >
      <CheckCircle className="mr-1 h-3 w-3" />
      Enrichi
    </Badge>
  );
}
