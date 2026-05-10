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

export function Sparkline({
  data,
  color = "#0052D9",
  width = 90,
  height = 28,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as [number, number];
  });
  const line = "M" + pts.map((p) => p.join(",")).join(" L");
  const last = pts[pts.length - 1];
  const area = `M0,${height} L${pts[0][0]},${height} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(" ") + ` L${last[0]},${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
    </svg>
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
