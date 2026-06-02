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
  LinkedInLogo,
  WhatsAppLogo,
  CalendarLogo,
  CsvLogo,
  AndoxaLogo,
} from "./brand-logos";
import type { ComponentType } from "react";
import {
  PROSPECT_STATUS_LABELS,
  type Prospect,
  type ProspectStatus,
} from "@/lib/types/prospects";
import { useMemo } from "react";
import { useProspectStatuses, useStatusResolver } from "@/lib/prospects/statuses";

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

/**
 * Hook returning the same shape as the legacy STATUS_CONFIG + PIPELINE_ORDER,
 * but driven by the per-org `prospect_statuses` table. Use this in CRM views
 * that previously iterated PIPELINE_ORDER or looked up STATUS_CONFIG[key].
 *
 * The legacy 7-key STATUS_CONFIG retains its dark-mode-aware pill classes,
 * so when a per-org status has a legacy counterpart we reuse those classes
 * for visual consistency. Custom statuses get a neutral pill + their hex.
 */
export function useDynamicStatusConfig(): {
  pipelineOrder: string[];
  cfgByKey: Map<string, StatusConfig>;
  loading: boolean;
} {
  const { statuses, loading } = useProspectStatuses();
  return useMemo(() => {
    const active = statuses.filter((s) => !s.is_archived);
    const cfgByKey = new Map<string, StatusConfig>();
    for (const s of active) {
      const legacy = isProspectStatus(s.key) ? STATUS_CONFIG[s.key] : null;
      cfgByKey.set(s.key, {
        label: s.name,
        hex: s.color,
        dot: legacy?.dot ?? "",
        pill: legacy?.pill ?? "bg-muted text-foreground",
      });
    }
    return {
      pipelineOrder: active.map((s) => s.key),
      cfgByKey,
      loading,
    };
  }, [statuses, loading]);
}

/* ============================================================
   Source — UX-facing pills. The DB stores keys like
   `linkedin_extension`, `linkedin`, `csv`, `import`, `manual`,
   `website`. The redesign also surfaces `whatsapp`, `booking`,
   `inbound` which are not first-class sources yet — treat them
   as tolerated extras with their own pill.
   ============================================================ */

/** Inline brand-logo component signature (see brand-logos.tsx). */
type BrandLogo = ComponentType<{ size?: number; className?: string }>;

export interface SourceConfig {
  label: string;
  short: string;
  icon: LucideIcon;
  /** Real brand/provider mark rendered in pills & list rows. */
  Logo?: BrandLogo;
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
    Logo: LinkedInLogo,
    iconColor: "text-[#0a66c2]",
    tint: "bg-[#e8f1fa] dark:bg-[#0a66c2]/15",
  },
  linkedin: {
    label: "LinkedIn",
    short: "LinkedIn",
    icon: Globe,
    Logo: LinkedInLogo,
    iconColor: "text-[#0a66c2]",
    tint: "bg-[#e8f1fa] dark:bg-[#0a66c2]/15",
  },
  whatsapp: {
    label: "WhatsApp",
    short: "WhatsApp",
    icon: MessageCircle,
    Logo: WhatsAppLogo,
    iconColor: "text-emerald-600",
    tint: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  booking: {
    label: "Booking",
    short: "Booking",
    icon: Calendar,
    Logo: CalendarLogo,
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
    Logo: CsvLogo,
    iconColor: "text-emerald-600",
    tint: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  xlsx: {
    label: "Import Excel",
    short: "Excel",
    icon: Upload,
    Logo: CsvLogo,
    iconColor: "text-emerald-600",
    tint: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  import: {
    label: "Import",
    short: "Import",
    icon: Upload,
    Logo: CsvLogo,
    iconColor: "text-emerald-600",
    tint: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  manual: {
    label: "Manuel",
    short: "Manuel",
    icon: Edit,
    Logo: AndoxaLogo,
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
  label: "Manuel",
  short: "Manuel",
  icon: Edit,
  Logo: AndoxaLogo,
  iconColor: "text-slate-600",
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
  // Resolves the status against the per-org statuses (renames, custom rows,
  // recolors). Falls back to the static STATUS_CONFIG for the legacy 7 keys
  // during the first paint before /api/prospect-statuses resolves.
  const resolve = useStatusResolver();
  if (!status) return null;
  const dynamic = resolve(status);
  const legacy = isProspectStatus(status) ? STATUS_CONFIG[status] : null;
  if (!dynamic && !legacy) return null;

  const label = dynamic?.label ?? legacy?.label ?? status;
  const hex = dynamic?.hex ?? legacy?.hex ?? "#94a3b8";
  // Reuse the legacy pill tailwind classes when we have them (gives proper
  // light/dark backgrounds). Custom statuses without a legacy entry get a
  // generic neutral pill — the per-org hex is what carries the colour
  // identity via the dot.
  const pillClasses = legacy?.pill ?? "bg-muted text-foreground";

  const sizing =
    size === "lg" ? "px-3 py-1 text-[13px]" : "px-2.5 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold leading-none whitespace-nowrap ${pillClasses} ${sizing}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: hex }}
      />
      {label}
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
  const Logo = cfg.Logo;
  const logoPx = size === "lg" ? 14 : 12;
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
        {Logo ? (
          <Logo size={logoPx} className="shrink-0" />
        ) : (
          <Icon className={`h-3 w-3 ${cfg.iconColor}`} />
        )}
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
  // Normalise the channel kind to a source config key so LinkedIn variants
  // all resolve to the LinkedIn mark.
  const normalized =
    kind === "linkedin_extension" || kind === "linkedin_manual"
      ? "linkedin"
      : kind;
  const cfg = getSourceConfig(normalized);
  const Logo = cfg.Logo;
  return (
    <span
      title={cfg.label}
      className={`inline-flex items-center justify-center rounded-md ${cfg.tint}`}
      style={{ width: size, height: size }}
    >
      {Logo ? (
        <Logo size={Math.round(size * 0.62)} className="shrink-0" />
      ) : (
        <span
          className={`font-bold leading-none ${cfg.iconColor}`}
          style={{
            fontSize: Math.max(10, Math.round(size * 0.5)),
            letterSpacing: "-0.02em",
          }}
        >
          {cfg.short.charAt(0)}
        </span>
      )}
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

/**
 * LinkedIn serves a generic grey "ghost" silhouette for profiles without a
 * real photo. Those URLs get stored during enrichment and load successfully,
 * so the avatar renders as a filled grey square instead of falling back to
 * initials. Detect the known placeholder shapes and treat them as "no photo".
 *
 * Real photos come from `media.licdn.com/dms/image/...`; ghost/default assets
 * come from `static.licdn.com/...` or carry a `ghost`/`default` marker.
 */
export function isPlaceholderAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.includes("static.licdn.com") ||
    u.includes("/ghost") ||
    u.includes("ghost_person") ||
    u.includes("default-") ||
    u.includes("anonymous")
  );
}

/** Resolve a usable photo URL, filtering out provider placeholder images. */
export function resolveAvatarPhoto(url: string | null | undefined): string | null {
  return url && !isPlaceholderAvatarUrl(url) ? url : null;
}

export function prospectPhotoFromEnrichment(
  p: Pick<Prospect, "enrichment_metadata">,
): string | null {
  return resolveAvatarPhoto(p.enrichment_metadata?.profile_picture_url ?? null);
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
  // Track load failures so an expired/blocked photo URL (LinkedIn CDN links
  // expire) cleanly falls back to the coloured initials instead of a broken
  // image. We render a real <img> rather than a CSS background-image because
  // provider URLs frequently contain characters (commas, parentheses) that
  // silently break an unquoted CSS url() — which is why some enriched
  // prospects showed no photo at all.
  const [failed, setFailed] = useState(false);
  const showPhoto = !!photo && !failed;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none text-white select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo!}
          alt={safe}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(safe)
      )}
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
