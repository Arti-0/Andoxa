"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MiniLineChartProps {
  data: number[];
  /** Stroke + gradient colour. */
  color?: string;
  /** Label shown next to the value in the tooltip (e.g. "RDV"). */
  label?: string;
  /**
   * Builds the period label for each tooltip ("S-3", "il y a 4j"). Receives
   * the point's 0-based index from oldest → newest and the total count.
   */
  bucketLabel?: (index: number, total: number) => string;
  /** className passed to ChartContainer wrapper — set the height here. */
  className?: string;
  /** Optional unit suffix in the tooltip value ("%"). */
  unit?: string;
}

/**
 * Small Recharts area chart styled like a sparkline but with hover tooltip.
 * Replaces the previous "scribble" SVG sparkline used in KPI cards across
 * the dashboard and campaigns KPI bar — adds period + value context.
 */
export function MiniLineChart({
  data,
  color = "#0052D9",
  label = "Valeur",
  bucketLabel,
  className,
  unit,
}: MiniLineChartProps) {
  const config = useMemo<ChartConfig>(
    () => ({ value: { label, color } }),
    [label, color],
  );

  if (!data || data.length < 2) {
    // Preserve footprint while data isn't available yet.
    return <div className={className} aria-hidden />;
  }

  const total = data.length;
  const points = data.map((value, index) => ({
    index,
    value,
    bucket: bucketLabel ? bucketLabel(index, total) : `Point ${index + 1}`,
  }));

  const gradientId = `mini-gradient-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <ChartContainer config={config} className={className}>
      <AreaChart
        data={points}
        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="index" hide />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <ChartTooltip
          cursor={{ stroke: color, strokeOpacity: 0.4, strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              hideIndicator
              labelFormatter={(_label, payload) => {
                const bucket = (
                  payload?.[0]?.payload as { bucket?: string } | undefined
                )?.bucket;
                return bucket ?? "";
              }}
              formatter={(value) => (
                <span className="tabular-nums">
                  <span className="font-medium text-foreground">
                    {typeof value === "number"
                      ? value.toLocaleString("fr-FR")
                      : String(value)}
                    {unit ?? ""}
                  </span>
                  <span className="ml-1 text-muted-foreground">{label}</span>
                </span>
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#${gradientId})`}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

// Re-exports kept in case callers want to compose a custom chart while still
// pulling Recharts primitives from a single entry point.
export {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
};
