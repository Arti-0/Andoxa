import { cn } from "@/lib/utils";

interface LinkedInPremiumBadgeProps {
  className?: string;
  /** "sm" = petit badge inline, "md" = badge avec texte */
  size?: "sm" | "md";
}

export function LinkedInPremiumBadge({
  className,
  size = "sm",
}: LinkedInPremiumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium",
        size === "sm"
          ? "px-1 py-0.5 text-[10px]"
          : "px-1.5 py-0.5 text-xs",
        "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
        className
      )}
      title="Fonctionnalité LinkedIn Premium"
      aria-label="LinkedIn Premium"
    >
      <svg
        viewBox="0 0 12 12"
        className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"}
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 0l1.5 4h4l-3.2 2.4 1.2 3.9L6 8 2.5 10.3l1.2-3.9L.5 4h4z" />
      </svg>
      {size === "md" && <span>Premium</span>}
    </span>
  );
}
