// Andoxa — Workflow demo icons.
// Path data is copied verbatim from the Claude Design handoff
// (design/whatsapp/wf-components.jsx + Create Workflow.html).

import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  color?: string;
  fill?: boolean;
  d?: string;
  children?: ReactNode;
}

export function Icon({
  size = 16,
  color = "currentColor",
  fill = false,
  d,
  children,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? color : "none"}
      stroke={fill ? "none" : color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const ICO = {
  arrow_left: "M19 12H5M12 19l-7-7 7-7",
  arrow_right: "M5 12h14M12 5l7 7-7 7",
  check: "M20 6L9 17l-5-5",
  lightning: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  calendar:
    "M8 2v4M16 2v4M3 10h18M21 8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8z",
  linkedin:
    "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z",
  whatsapp:
    "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  clock: "M12 22a10 10 0 110-20 10 10 0 010 20zm0-14v4l3 3",
  database:
    "M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5zM2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7M2 12v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5",
  plus_circle:
    "M12 22a10 10 0 110-20 10 10 0 010 20zm0-6v-4m0 0V8m0 4H8m4 0h4",
  user_plus:
    "M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 110-8 4 4 0 010 8m9 4v6m3-3h-6",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  cursor: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z",
  sparkle:
    "M12 3v1m9 8h-1M12 21v-1M4 12H3m3.22-5.78L5.5 5.5m13.28.72l-.72.72M5.5 18.5l.72-.72m12.56.72l-.72-.72M12 8a4 4 0 100 8 4 4 0 000-8z",
  template:
    "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
  x: "M18 6L6 18M6 6l12 12",
  info: "M12 22a10 10 0 110-20 10 10 0 010 20zm0-10v4m0-8v.01",
  // From wf-components.jsx
  zoom_in: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM11 8v6M8 11h6",
  zoom_out: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zM8 11h6",
  play: "M5 3l14 9-14 9V3z",
  save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  copy:
    "M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2M8 4a2 2 0 000 4h8a2 2 0 000-4",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  drag: "M9 3h6M9 21h6M9 12h6",
  hamburger: "M4 6h16M4 12h16M4 18h7",
  plus: "M12 5v14M5 12h14",
  // From Workflows.html sidebar
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  campaigns:
    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.63a16 16 0 006.29 6.29l1.95-1.95a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z",
  workflows: "M22 12h-4l-3 9L9 3l-3 9H2",
  prospects:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 4v6m3-3h-6",
  crm: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  booking:
    "M8 2v4M16 2v4M3 10h18M21 8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V8z",
  analytics: "M18 20V10M12 20V4M6 20v-6",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zm0 0v6m0-18v3m-6.364 1.636l2.121 2.122M18.364 5.636l-2.121 2.121M3 12H6m15 0h-3m-1.636 6.364l-2.121-2.121M5.636 18.364l2.121-2.121",
} as const;

// Filled stop icon (rect inside circle).
export function StopIcon({ size = 14, color = "#6B7280" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <rect x="8" y="8" width="8" height="8" fill="white" />
    </svg>
  );
}

// Condition (diamond) icon — from wf-components.jsx
export function ConditionIcon({ size = 14, color = "#D97706" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d="M12 2l10 10-10 10L2 12z" />
    </svg>
  );
}

// Sparkles (AI) icon — from wf-components.jsx
export function SparklesIcon({ size = 14, color = "#059669" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  );
}
