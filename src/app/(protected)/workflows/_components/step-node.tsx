"use client";

import { Handle, Position, useConnection, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";
import { cn } from "@/lib/utils";

export interface StepNodeData {
  type: WfNodeType;
  stepId: string;
  label: string;
  sub?: string;
  needsConfig?: boolean;
  /** Condition branches already wired — labels move to the edge. */
  branchConnected?: { true: boolean; false: boolean };
}

export const NODE_W = 252;
export const COND_W = 320;
export const NODE_H = 68;

/** Input ports — flat pills; large invisible hit area via CSS. */
const TARGET_HANDLE_CLS = "wf-target-handle";

type SourceDotColor = "blue" | "emerald" | "rose";

const SOURCE_DOT_CLS: Record<SourceDotColor, string> = {
  blue: "wf-source-handle wf-source-handle--blue",
  emerald: "wf-source-handle wf-source-handle--emerald",
  rose: "wf-source-handle wf-source-handle--rose",
};

function SourceHandle({
  id,
  color,
  style,
}: {
  id?: string;
  color: SourceDotColor;
  style?: CSSProperties;
}) {
  return (
    <Handle
      id={id}
      type="source"
      position={Position.Bottom}
      className={SOURCE_DOT_CLS[color]}
      style={style}
    />
  );
}

export function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as StepNodeData;
  const cfg = WF_NODE_TYPES[d.type];
  const isCondition = d.type === "condition";
  const isTrigger = d.type === "trigger";
  const connection = useConnection();

  const connectingFromThis =
    connection.inProgress && connection.fromNode?.id === d.stepId;
  const connectingTrue =
    connectingFromThis && connection.fromHandle?.id === "true";
  const connectingFalse =
    connectingFromThis && connection.fromHandle?.id === "false";

  const showTrueLabel =
    isCondition &&
    !d.branchConnected?.true &&
    !connectingTrue;
  const showFalseLabel =
    isCondition &&
    !d.branchConnected?.false &&
    !connectingFalse;

  const borderCls = selected
    ? "border-[var(--brand-blue)] shadow-md shadow-black/10 dark:shadow-black/40"
    : d.needsConfig
      ? "border-amber-500 shadow-sm dark:border-amber-500"
      : "border-border shadow-sm";

  return (
    <div className={cn("relative", isCondition ? "w-[320px]" : "w-[252px]")}>
      <div
        className={cn(
          "relative flex h-[68px] cursor-pointer select-none items-center gap-0 overflow-hidden rounded-xl border-[1.5px] bg-card text-card-foreground transition-[border-color,box-shadow] duration-150",
          borderCls,
        )}
      >
        <div
          style={{
            width: 44,
            height: "100%",
            background: cfg.bg,
            borderRightColor: `${cfg.border}22`,
          }}
          className="flex shrink-0 items-center justify-center border-r border-transparent"
        >
          {cfg.iconFn(18)}
        </div>

        <div className="min-w-0 flex-1 px-3">
          <div className="truncate text-[13.5px] font-semibold leading-snug text-foreground">
            {d.label}
          </div>
          {d.sub && (
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {d.sub}
            </div>
          )}
        </div>
      </div>

      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className={TARGET_HANDLE_CLS}
          style={{ top: -3 }}
        />
      )}

      {isCondition ? (
        <>
          <SourceHandle
            id="true"
            color="emerald"
            style={{ left: "30%", bottom: -18 }}
          />
          {showTrueLabel && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-emerald-600"
              style={{ left: "30%", top: "calc(100% + 10px)" }}
            >
              Oui
            </span>
          )}
          <SourceHandle
            id="false"
            color="rose"
            style={{ left: "70%", bottom: -18 }}
          />
          {showFalseLabel && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-rose-600"
              style={{ left: "70%", top: "calc(100% + 10px)" }}
            >
              Non
            </span>
          )}
        </>
      ) : (
        <SourceHandle color="blue" style={{ bottom: -18 }} />
      )}
    </div>
  );
}
