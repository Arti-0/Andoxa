"use client";

// Small "Lancer" button matching the workflow list + canvas toolbar.

import { cn } from "@/lib/utils";
import { Icon, ICO } from "./icons";

interface Props {
  disabled?: boolean;
  disabledReason?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md";
  onClick: (e: React.MouseEvent) => void;
}

export function LaunchButton({
  disabled,
  disabledReason,
  variant = "primary",
  size = "sm",
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick(e);
      }}
      disabled={disabled}
      title={
        disabled
          ? disabledReason
          : "Lancer ce parcours sur des listes"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-semibold transition-opacity duration-150",
        size === "md" ? "px-4 py-2 text-[13px]" : "px-3 py-[5px] text-xs",
        disabled && "cursor-not-allowed opacity-45",
        !disabled && "cursor-pointer hover:opacity-95",
        variant === "primary" &&
          "bg-(--brand-blue) text-white dark:bg-primary dark:text-primary-foreground",
        variant === "outline" &&
          "border border-primary/35 bg-background text-primary shadow-sm hover:bg-accent dark:border-primary/45",
      )}
    >
      <Icon size={size === "md" ? 13 : 12} color="currentColor" d={ICO.zap} />
      Lancer
    </button>
  );
}
