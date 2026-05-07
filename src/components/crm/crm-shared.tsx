"use client";

/**
 * Shared CRM v2 primitives — applies the Andoxa CRM redesign.
 *
 * Visual reference: design/CRM/crm-shell.jsx + crm-data.jsx + crm-tab-*.jsx.
 *
 * Status / source / silence helpers and pill components used across
 * the Listes, Prospects and Pipeline tabs and the Profile page.
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Globe,
  MessageCircle,
  MessageSquare,
  Calendar,
  Upload,
  Edit,
  type LucideIcon,
} from "lucide-react";
import {
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types/prospects";

/* ============================================================
   Status — DB keys mapped to display config (label + colors).
   ============================================================ */

export const PIPELINE_ORDER: ProspectStatus[] = [
  "new",
  "contacted",
  "qualified",
  "rdv",
  "proposal",
  "won",
  "lost",
];

export interface StatusConfig {
  label: string;
  /** Tailwind dot bg class (small circle) */
  dot: string;
  /** Tailwind pill bg+text classes */
  pill: string;
  /** Solid background hex used for raw inline styles where Tailwind can't reach (e.g. funnel bars). */
  hex: string;
}

export const STATUS_CONFIG: Record<ProspectStatus, StatusConfig> = {
  new: {
    label: PROSPECT_STATUS_LABELS.new,
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    hex: "#94a3b8",
  },
  contacted: {
    label: PROSPECT_STATUS_LABELS.contacted,
    dot: "bg-blue-500",
    pill: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    hex: "#3b82f6",
  },
  qualified: {
    label: PROSPECT_STATUS_LABELS.qualified,
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    hex: "#f59e0b",
  },
  rdv: {
    label: PROSPECT_STATUS_LABELS.rdv,
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    hex: "#10b981",
  },
  proposal: {
    label: PROSPECT_STATUS_LABELS.proposal,
    dot: "bg-violet-500",
    pill: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    hex: "#8b5cf6",
  },
  won: {
    label: PROSPECT_STATUS_LABELS.won,
    dot: "bg-green-600",
    pill: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    hex: "#16a34a",
  },
  lost: {
    label: PROSPECT_STATUS_LABELS.lost,
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    hex: "#ef4444",
  },
};

export function isProspectStatus(s: string | null | undefined): s is ProspectStatus {
  return !!s && (PIPELINE_ORDER as string[]).includes(s);
}

/* ============================================================
   Source — UX-facing pills. The DB stores keys like
   `linkedin_extension`, `linkedin`, `csv`, `import`, `manual`,
   `website`. The redesign also surfaces `whatsapp`, `booking`,
   `inbound` which are not first-class sources yet — treat them
   as tolerated extras with their own pill.
   ============================================================ */

export interface SourceConfig {
  label: string;
  short: string;
  icon: LucideIcon;
  /** Tailwind text color for the icon */
  iconColor: string;
  /** Tailwind bg for the pill tint */
  tint: string;
}

const SOURCE_CONFIG: Record<string, SourceConfig> = {
  linkedin_extension: {
    label: "LinkedIn · Extension",
    short: "LinkedIn",
    icon: Globe,
    iconColor: "text-[#0a66c2]",
    tint: "bg-[#e8f1fa] dark:bg-[#0a66c2]/15",
  },
  linkedin: {
    label: "LinkedIn",
    short: "LinkedIn",
    icon: Globe,
    iconColor: "text-[#0a66c2]",
    tint: "bg-[#e8f1fa] dark:bg-[#0a66c2]/15",
  },
  whatsapp: {
    label: "WhatsApp",
    short: "WhatsApp",
    icon: MessageCircle,
    iconColor: "text-emerald-600",
    tint: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  booking: {
    label: "Booking",
    short: "Booking",
    icon: Calendar,
    iconColor: "text-violet-600",
    tint: "bg-violet-50 dark:bg-violet-900/20",
  },
  inbound: {
    label: "Inbound",
    short: "Inbound",
    icon: MessageSquare,
    iconColor: "text-slate-600",
    tint: "bg-slate-100 dark:bg-slate-800/60",
  },
  csv: {
    label: "Import CSV",
    short: "CSV",
    icon: Upload,
    iconColor: "text-slate-600",
    tint: "bg-slate-100 dark:bg-slate-800/60",
  },
  import: {
    label: "Import",
    short: "Import",
    icon: Upload,
    iconColor: "text-slate-600",
    tint: "bg-slate-100 dark:bg-slate-800/60",
  },
  manual: {
    label: "Manuel",
    short: "Manuel",
    icon: Edit,
    iconColor: "text-slate-600",
    tint: "bg-slate-100 dark:bg-slate-800/60",
  },
  website: {
    label: "Site web",
    short: "Site",
    icon: Globe,
    iconColor: "text-slate-600",
    tint: "bg-slate-100 dark:bg-slate-800/60",
  },
};

const FALLBACK_SOURCE: SourceConfig = {
  label: "Source",
  short: "Source",
  icon: MessageSquare,
  iconColor: "text-slate-500",
  tint: "bg-slate-100 dark:bg-slate-800/60",
};

export function getSourceConfig(source: string | null | undefined): SourceConfig {
  if (!source) return FALLBACK_SOURCE;
  return SOURCE_CONFIG[source] ?? FALLBACK_SOURCE;
}

/* ============================================================
   StatusPill — rounded full pill with colored dot + label.
   ============================================================ */

export function StatusPill({
  status,
  size = "sm",
}: {
  status: string | null | undefined;
  size?: "sm" | "lg";
}) {
  if (!status) return null;
  const cfg = isProspectStatus(status) ? STATUS_CONFIG[status] : null;
  if (!cfg) return null;
  const sizing =
    size === "lg" ? "px-3 py-1 text-[13px]" : "px-2.5 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold leading-none whitespace-nowrap ${cfg.pill} ${sizing}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ============================================================
   SourcePill — short rounded badge with provider icon.
   When `list` is provided, hovering shows a tooltip explaining
   which list the prospect was imported into.
   ============================================================ */

export function SourcePill({
  source,
  size = "sm",
  list,
  importedAt,
  onClick,
}: {
  source: string | null | undefined;
  size?: "sm" | "lg";
  list?: string | null;
  importedAt?: string | null;
  onClick?: (source: string, list: string | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const cfg = getSourceConfig(source);
  const Icon = cfg.icon;
  const tooltip = list
    ? `Importé${importedAt ? " le " + importedAt : ""} dans la liste « ${list} »`
    : null;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        onClick={(e) => {
          if (!onClick) return;
          e.stopPropagation();
          onClick(source ?? "", list ?? null);
        }}
        className={`inline-flex items-center gap-1.5 rounded-md border border-border ${cfg.tint} text-foreground/80 font-medium leading-tight whitespace-nowrap ${
          size === "lg" ? "px-2.5 py-1 text-xs" : "px-1.5 py-0.5 text-[11px]"
        } ${onClick ? "cursor-pointer hover:border-foreground/30" : ""}`}
      >
        <Icon className={`h-3 w-3 ${cfg.iconColor}`} />
        {size === "lg" ? cfg.label : cfg.short}
      </span>
      {hover && tooltip && (
        <span
          className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-tooltip rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-normal text-background shadow-lg whitespace-nowrap"
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}

/* ============================================================
   ChannelDot — square 18px badge representing an active
   conversation channel (LinkedIn / WhatsApp / Booking).
   ============================================================ */

export function ChannelDot({
  kind,
  size = 22,
}: {
  kind: string;
  size?: number;
}) {
  const cfg = getSourceConfig(kind);
  const letter =
    kind === "whatsapp"
      ? "W"
      : kind === "linkedin" ||
          kind === "linkedin_extension" ||
          kind === "linkedin_manual"
        ? "in"
        : kind === "booking"
          ? "B"
          : "M";
  return (
    <span
      title={cfg.label}
      className={`inline-flex items-center justify-center rounded-md font-bold leading-none ${cfg.tint} ${cfg.iconColor}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.6)),
        letterSpacing: "-0.02em",
      }}
    >
      {letter}
    </span>
  );
}

/** Channel dot with a rich tooltip steering the user to /messagerie. */
export function ChannelTooltipDot({ kind, size = 20 }: { kind: string; size?: number }) {
  const [hover, setHover] = useState(false);
  const isLI =
    kind === "linkedin" ||
    kind === "linkedin_extension" ||
    kind === "linkedin_manual";
  const label = isLI
    ? "Conversation LinkedIn active"
    : kind === "whatsapp"
      ? "Conversation WhatsApp active"
      : kind === "booking"
        ? "RDV via Booking"
        : "Conversation";
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <ChannelDot kind={kind} size={size} />
      {hover && (
        <span className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-tooltip flex -translate-x-1/2 flex-col items-start gap-0.5 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background shadow-lg whitespace-nowrap">
          <span>{label}</span>
          <Link
            href="/messagerie"
            className="font-medium text-sky-300 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            Voir dans la Messagerie →
          </Link>
        </span>
      )}
    </span>
  );
}

/* ============================================================
   Silence-tier helpers — color the "Dernière activité" pill
   based on the number of days encoded in the label.
   ============================================================ */

export type SilenceTier = "amber" | "orange" | "red" | null;

export function silenceTier(label: string | null | undefined): SilenceTier {
  if (!label) return null;
  const m = /silence\s+(\d+)/i.exec(label);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  if (d >= 15) return "red";
  if (d >= 11) return "orange";
  if (d >= 7) return "amber";
  return null;
}

export function parseSilenceDays(label: string | null | undefined): number {
  if (!label) return 0;
  const m = /silence\s+(\d+)/i.exec(label);
  return m ? parseInt(m[1], 10) : 0;
}

export function silenceTierClasses(tier: SilenceTier) {
  switch (tier) {
    case "red":
      return {
        text: "text-red-700 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-900/20",
        dot: "bg-red-500",
      };
    case "orange":
      return {
        text: "text-orange-700 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-900/20",
        dot: "bg-orange-500",
      };
    case "amber":
      return {
        text: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/20",
        dot: "bg-amber-500",
      };
    default:
      return {
        text: "text-muted-foreground",
        bg: "bg-transparent",
        dot: "",
      };
  }
}

/* ============================================================
   Avatar helpers — deterministic color from name + initials.
   ============================================================ */

const AVATAR_PALETTE = [
  "#0052D9",
  "#FF6700",
  "#16a34a",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#f59e0b",
  "#14b8a6",
  "#6366f1",
  "#dc2626",
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

export function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function NameAvatar({
  name,
  size = 32,
  photo,
}: {
  name: string | null | undefined;
  size?: number;
  photo?: string | null;
}) {
  const safe = name?.trim() || "?";
  const bg = avatarColor(safe);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold leading-none text-white select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: photo ? "#e5e7eb" : bg,
        fontSize: Math.round(size * 0.36),
        backgroundImage: photo ? `url(${photo})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!photo && initials(safe)}
    </div>
  );
}

/* ============================================================
   Generic helpers
   ============================================================ */

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

/** Simple data card matching `Card` in design (rounded-xl, white, border). */
export function Surface({
  children,
  className = "",
  padding = "p-5",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card ${padding} ${className}`}
    >
      {children}
    </div>
  );
}
