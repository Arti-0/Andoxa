"use client";

import {
  CHANNEL_META,
  STATUS_META,
  TYPE_META,
  type CampaignStatus,
  type Channel,
  type CampaignType,
  type Creator,
} from "./data";
import { Linkedin, MessageCircle, Phone } from "lucide-react";
import { MiniLineChart } from "@/components/ui/mini-line-chart";

export function StatusBadge({ status, size = "md" }: { status: CampaignStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status];
  if (!m) return null;
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full whitespace-nowrap text-xs font-semibold"
      style={{ padding: pad, background: m.bg, color: m.fg }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          background: m.dot,
          boxShadow: status === "running" ? `0 0 0 3px ${m.dot}26` : "none",
          animation: status === "running" ? "pulse 1.6s ease-in-out infinite" : "none",
        }}
      />
      {m.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: CampaignType }) {
  const m = TYPE_META[type];
  if (!m) return null;
  return (
    <span
      className="inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ background: m.bg, color: m.fg }}
    >
      {m.label}
    </span>
  );
}

export function ChannelPill({ channel }: { channel: Channel }) {
  const m = CHANNEL_META[channel];
  if (!m) return null;
  const Icon = channel === "linkedin" ? Linkedin : channel === "whatsapp" ? MessageCircle : Phone;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
      <Icon className="size-3.5" style={{ color: m.color }} />
      {m.label}
    </span>
  );
}

export function Avatar({ creator, size = 22 }: { creator: Creator | undefined; size?: number }) {
  if (!creator) return null;
  if (creator.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={creator.avatarUrl}
        alt={creator.name}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{
        width: size,
        height: size,
        background: creator.color,
        fontSize: size * 0.42,
      }}
    >
      {creator.initials}
    </span>
  );
}

/**
 * Mini area chart for the campaigns KPI bar — Recharts-backed sparkline with
 * hover tooltip so users can read each bucket's value instead of just guessing
 * from the silhouette.
 */
export function Sparkline({
  data,
  color = "#0052D9",
  width = 90,
  height = 28,
  label = "Valeur",
  unit,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  label?: string;
  unit?: string;
}) {
  const total = data?.length ?? 0;
  if (total === 0) {
    return <div style={{ width, height }} aria-hidden />;
  }
  return (
    <div style={{ width, height }}>
      <MiniLineChart
        data={data}
        color={color}
        label={label}
        unit={unit}
        bucketLabel={(i) => {
          const offset = total - 1 - i;
          if (offset === 0) return "Période actuelle";
          return `Bucket -${offset}`;
        }}
        className="h-full w-full"
      />
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  color = "#0052D9",
  height = 6,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="relative overflow-hidden rounded-full bg-muted" style={{ height }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
