"use client";

// Custom xyflow node — visuals copied from design/whatsapp/wf-components.jsx's
// WorkflowNode. The color stripe + uppercase type label + main label + sub
// row are preserved exactly. Sizing matches NODE_W=252 / COND_W=320 / NODE_H=68.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import { cn } from "@/lib/utils";

export interface StepNodeData {
  /** Node type — drives stripe color and label. */
  type: WfNodeType;
  /** Step id from the backend definition (or "trigger" for the synthetic root). */
  stepId: string;
  /** Headline text (what the step does). */
  label: string;
  /** Optional secondary line shown smaller below. */
  sub?: string;
  /** True when the underlying step has not been fully configured yet. */
  needsConfig?: boolean;
}

export const NODE_W = 252;
export const COND_W = 320;
export const NODE_H = 68;

export function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as StepNodeData;
  const cfg = WF_NODE_TYPES[d.type];

  const borderCls = selected
    ? "border-[var(--brand-blue)] shadow-md shadow-black/10 dark:shadow-black/40"
    : d.needsConfig
      ? "border-amber-500 shadow-sm dark:border-amber-500"
      : "border-border shadow-sm";

  return (
    <div
      className={cn(
        "relative flex h-[68px] cursor-pointer select-none items-center gap-0 overflow-hidden rounded-xl border-[1.5px] bg-card text-card-foreground transition-[border-color,box-shadow] duration-150",
        d.type === "condition" ? "w-[320px]" : "w-[252px]",
        borderCls
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-1.5 !border-2 !border-background !bg-muted-foreground/60 dark:!border-background"
        style={{ top: -3 }}
      />
      {/* Color stripe + icon */}
      <div
        style={{
          width: 44,
          height: "100%",
          background: cfg.bg,
          borderRightColor: `${cfg.border}22`,
        }}
        className="flex shrink-0 items-center justify-center border-r border-transparent"
      >
        {cfg.iconFn(16)}
      </div>
      {/* Text */}
      <div className="min-w-0 flex-1 px-3">
        <div
          style={{ color: cfg.color }}
          className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide"
        >
          {cfg.label}
        </div>
        <div className="truncate text-[13px] font-semibold leading-snug text-foreground">
          {d.label}
        </div>
        {d.sub && (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {d.sub}
          </div>
        )}
      </div>
      {selected && (
        <div className="mr-2.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-blue)]" />
      )}
      {/* Source handles — conditions emit Oui (left) / Non (right). */}
      {d.type === "condition" ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            className="!size-1.5 !border-2 !border-background !bg-emerald-500"
            style={{ left: "30%", bottom: -3 }}
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            className="!size-1.5 !border-2 !border-background !bg-rose-500"
            style={{ left: "70%", bottom: -3 }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-1.5 !border-2 !border-background !bg-muted-foreground/60"
          style={{ bottom: -3 }}
        />
      )}
    </div>
  );
}
