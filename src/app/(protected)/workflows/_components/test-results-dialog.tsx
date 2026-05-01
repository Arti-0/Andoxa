"use client";

// Renders the output of `simulateWorkflow` as a vertical timeline.

import { Icon, ICO } from "./icons";
import type { SimResult } from "./simulate";

interface Props {
  open: boolean;
  result: SimResult | null;
  onClose: () => void;
}

const STATUS_COLOR = {
  ok: { fg: "#15803D", bg: "#ECFDF5", border: "#10B981" },
  warn: { fg: "#C2410C", bg: "#FFF7ED", border: "#F97316" },
  stop: { fg: "#1E40AF", bg: "#EFF6FF", border: "#3B82F6" },
} as const;

export function TestResultsDialog({ open, result, onClose }: Props) {
  if (!open || !result) return null;
  const hasWarnings = result.entries.some((e) => e.status === "warn");

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 580,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 80px)",
          background: "white",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: hasWarnings ? "#FFF7ED" : "#ECFDF5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              size={18}
              color={hasWarnings ? "#C2410C" : "#15803D"}
              d={hasWarnings ? ICO.info : ICO.check}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.01em",
              }}
            >
              Test du workflow
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>
              Simulation contre un prospect fictif (Alice Demo). Aucun message
              n&apos;est envoyé.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94A3B8",
              padding: 4,
              display: "flex",
            }}
            aria-label="Fermer"
          >
            <Icon size={16} color="#94A3B8" d={ICO.x} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              position: "relative",
            }}
          >
            {/* Vertical guide */}
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 8,
                bottom: 8,
                width: 2,
                background: "#E2E8F0",
              }}
            />
            {result.entries.map((e, i) => {
              const c = STATUS_COLOR[e.status];
              return (
                <li
                  key={`${e.stepId}-${i}`}
                  style={{
                    position: "relative",
                    paddingLeft: 36,
                    paddingBottom: 16,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 2,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: c.bg,
                      border: `2px solid ${c.border}`,
                      color: c.fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#0F172A",
                      lineHeight: 1.4,
                    }}
                  >
                    {e.title}
                  </div>
                  {e.detail && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "#64748B",
                        marginTop: 4,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {e.detail}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div
          style={{
            padding: "12px 22px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F8FAFC",
          }}
        >
          <p style={{ fontSize: 12, color: "#64748B" }}>
            {result.reachedEnd
              ? "Le parcours s'est terminé sans erreur."
              : "La simulation s'est arrêtée avant la fin du parcours."}
          </p>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: "#0052D9",
              fontSize: 13,
              fontWeight: 600,
              color: "white",
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
