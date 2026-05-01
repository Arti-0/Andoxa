"use client";

// Small "Lancer" button matching the design's visual language.
// Used on workflow cards (list view) and in the canvas toolbar.

import { Icon, ICO } from "./icons";

interface Props {
  /** Disabled when the workflow can't accept enrollment (e.g. draft never published). */
  disabled?: boolean;
  /** Tooltip shown when hovered while disabled — explains how to unblock. */
  disabledReason?: string;
  /** Visual emphasis. "primary" = filled blue, "outline" = white card. */
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
  const padX = size === "md" ? 16 : 12;
  const padY = size === "md" ? 7 : 5;
  const fontSize = size === "md" ? 13 : 12;

  const enabledStyle =
    variant === "primary"
      ? {
          background: "#0052D9",
          color: "white",
          border: "none",
        }
      : {
          background: "white",
          color: "#0052D9",
          border: "1px solid #BFDBFE",
        };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick(e);
      }}
      disabled={disabled}
      title={disabled ? disabledReason : "Lancer ce parcours sur des listes"}
      style={{
        padding: `${padY}px ${padX}px`,
        borderRadius: 8,
        fontSize,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 120ms",
        ...enabledStyle,
      }}
    >
      <Icon size={size === "md" ? 13 : 12} color="currentColor" d={ICO.zap} />
      Lancer
    </button>
  );
}
