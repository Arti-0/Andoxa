/**
 * Abstract illustration kit for the marketing mockups.
 *
 * Visual language (per the homepage review): modern, minimalist — overlapping
 * floating widgets with soft drop shadows, vibrant simplified data viz
 * (doughnuts, smooth wave graphs), oversized positive hero metrics, and clean
 * thick rounded skeleton pills in place of real text. Geometric, clean.
 *
 * Pure presentational, SSR-safe, `select-none`. Tokens come from globals.css.
 */
import { cn } from "@/lib/utils";

/** Thick rounded skeleton pill — stands in for text. */
export function Pill({
  w = "100%",
  h = 8,
  tone = "neutral",
}: {
  w?: number | string;
  h?: number;
  tone?: "neutral" | "brand" | "soft" | "white";
}) {
  const bg =
    tone === "brand"
      ? "bg-[var(--brand-blue)]"
      : tone === "soft"
        ? "bg-[var(--brand-blue)]/25"
        : tone === "white"
          ? "bg-white/30"
          : "bg-[var(--neutral-300)]";
  return <span className={cn("block rounded-full", bg)} style={{ width: w, height: h }} />;
}

/** Floating card with a soft drop shadow + optional tilt/offset for overlap. */
export function FloatingWidget({
  children,
  className,
  rotate = 0,
  z = 1,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  z?: number;
}) {
  return (
    <div
      className={cn(
        "absolute rounded-2xl border border-[var(--border)] bg-card p-3 shadow-[0_18px_40px_-16px_rgba(0,82,217,0.28),0_6px_14px_-8px_rgba(0,0,0,0.12)]",
        className,
      )}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, zIndex: z }}
    >
      {children}
    </div>
  );
}

/** Vibrant doughnut chart. `value` 0–100. */
export function Doughnut({
  value,
  size = 64,
  color = "var(--brand-blue)",
  track = "var(--neutral-200)",
  thickness = 9,
  label,
}: {
  value: number;
  size?: number;
  color?: string;
  track?: string;
  thickness?: number;
  label?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      {label != null && (
        <span className="absolute inset-0 grid place-items-center">{label}</span>
      )}
    </div>
  );
}

/** Smooth wave / area graph. */
export function Wave({
  color = "var(--brand-blue)",
  className,
  height = 48,
}: {
  color?: string;
  className?: string;
  height?: number;
}) {
  const id = `wave-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg
      viewBox="0 0 200 60"
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,46 C26,40 40,50 60,32 C84,11 104,26 132,20 C158,14 176,24 200,7 L200,60 L0,60 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M0,46 C26,40 40,50 60,32 C84,11 104,26 132,20 C158,14 176,24 200,7"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Oversized, positive hero metric. */
export function HeroMetric({
  value,
  delta,
  color = "var(--brand-blue)",
  size = 34,
}: {
  value: string;
  delta?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="font-display font-semibold leading-none tracking-tight tabular"
        style={{ fontSize: size, color }}
      >
        {value}
      </span>
      {delta && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
          ▲ {delta}
        </span>
      )}
    </div>
  );
}

/** Tiny vertical bar-chart cluster. */
export function MiniBars({
  values,
  color = "var(--brand-blue)",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex items-end gap-1", className)}>
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.35 + (v / max) * 0.65 }}
        />
      ))}
    </div>
  );
}

/** Full-bleed positioning context for an abstract illustration. */
export function Canvas({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 select-none overflow-hidden bg-gradient-to-br from-[var(--brand-blue-tint)]/55 via-background to-[var(--brand-orange-tint)]/35",
        className,
      )}
    >
      {children}
    </div>
  );
}
