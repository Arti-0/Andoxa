"use client";

// Custom xyflow node — visuals copied from design/whatsapp/wf-components.jsx's
// WorkflowNode. The color stripe + uppercase type label + main label + sub
// row are preserved exactly. Sizing matches NODE_W=252 / COND_W=320 / NODE_H=68.

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { WF_NODE_TYPES, type WfNodeType } from "./node-types";

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

  return (
    <div
      style={{
        width: d.type === "condition" ? COND_W : NODE_W,
        height: NODE_H,
        background: "white",
        border: `1.5px solid ${
          selected ? "#0052D9" : d.needsConfig ? "#F59E0B" : "#E2E8F0"
        }`,
        borderRadius: 12,
        boxShadow: selected
          ? "0 0 0 3px rgba(0,82,217,0.15), 0 4px 12px rgba(0,0,0,0.08)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        gap: 0,
        overflow: "hidden",
        userSelect: "none",
        cursor: "pointer",
        transition: "border-color 120ms, box-shadow 120ms",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "#CBD5E1",
          width: 6,
          height: 6,
          border: "1px solid white",
          top: -3,
        }}
      />
      {/* Color stripe + icon */}
      <div
        style={{
          width: 44,
          height: "100%",
          background: cfg.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderRight: `1px solid ${cfg.border}22`,
        }}
      >
        {cfg.iconFn(16)}
      </div>
      {/* Text */}
      <div style={{ flex: 1, padding: "0 12px", minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: cfg.color,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 2,
          }}
        >
          {cfg.label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#0F172A",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {d.label}
        </div>
        {d.sub && (
          <div
            style={{
              fontSize: 11,
              color: "#64748B",
              marginTop: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {d.sub}
          </div>
        )}
      </div>
      {selected && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#0052D9",
            marginRight: 10,
            flexShrink: 0,
          }}
        />
      )}
      {/* Source handles — conditions emit Oui (left) / Non (right). */}
      {d.type === "condition" ? (
        <>
          <Handle
            id="true"
            type="source"
            position={Position.Bottom}
            style={{
              left: "30%",
              background: "#10B981",
              width: 6,
              height: 6,
              border: "1px solid white",
              bottom: -3,
            }}
          />
          <Handle
            id="false"
            type="source"
            position={Position.Bottom}
            style={{
              left: "70%",
              background: "#F43F5E",
              width: 6,
              height: 6,
              border: "1px solid white",
              bottom: -3,
            }}
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: "#CBD5E1",
            width: 6,
            height: 6,
            border: "1px solid white",
            bottom: -3,
          }}
        />
      )}
    </div>
  );
}
