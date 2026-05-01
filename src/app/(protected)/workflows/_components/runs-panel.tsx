"use client";

// Runs panel — full-screen overlay that lists the prospects enrolled in a
// workflow with their progress and status. Mounted on the canvas page.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Icon, ICO } from "./icons";

interface Props {
  open: boolean;
  workflowId: string;
  onClose: () => void;
}

interface RunItem {
  id: string;
  status: string;
  current_step_index: number | null;
  last_error: string | null;
  created_at: string;
  prospect_id: string;
  prospect: { full_name: string | null; company: string | null } | null;
  enrollment_list_labels?: string[];
  steps_total?: number;
  steps_completed?: number;
}

const STATUS_CFG: Record<
  string,
  { label: string; bg: string; color: string; dot: string }
> = {
  pending: { label: "En attente", bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  running: { label: "En cours", bg: "#EFF6FF", color: "#1E3A8A", dot: "#3B82F6" },
  paused: { label: "En pause", bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  completed: { label: "Terminé", bg: "#ECFDF5", color: "#15803D", dot: "#10B981" },
  failed: { label: "Échoué", bg: "#FFF1F2", color: "#BE123C", dot: "#F43F5E" },
  cancelled: { label: "Annulé", bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsPanel({ open, workflowId, onClose }: Props) {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/workflows/${workflowId}/runs?pageSize=100`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Chargement impossible");
        }
        if (!cancelled) {
          setRuns((json.data?.items ?? []) as RunItem[]);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Chargement impossible"
          );
          setRuns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workflowId]);

  if (!open) return null;

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
          width: 880,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 64px)",
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
              background: "#E8F0FD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} color="#0052D9" d={ICO.workflows} />
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
              Exécutions
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>
              {loading
                ? "Chargement…"
                : `${runs.length} prospect${runs.length > 1 ? "s" : ""} dans le parcours`}
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

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && runs.length === 0 ? (
            <div
              style={{
                padding: 80,
                textAlign: "center",
                color: "#94A3B8",
                fontSize: 13,
              }}
            >
              Chargement des prospects…
            </div>
          ) : runs.length === 0 ? (
            <div
              style={{
                padding: 80,
                textAlign: "center",
                color: "#94A3B8",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  marginBottom: 12,
                  opacity: 0.3,
                }}
              >
                ◻
              </div>
              <div style={{ fontSize: 14, color: "#64748B" }}>
                Aucun prospect inscrit dans ce parcours.
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>
                Cliquez sur <strong>Lancer</strong> pour ajouter des
                prospects depuis vos listes.
              </div>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead
                style={{
                  background: "#F8FAFC",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <tr>
                  <Th>Prospect</Th>
                  <Th>Listes</Th>
                  <Th>Progression</Th>
                  <Th>Statut</Th>
                  <Th>Démarré</Th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const sc = STATUS_CFG[r.status] ?? {
                    label: r.status,
                    bg: "#F1F5F9",
                    color: "#475569",
                    dot: "#94A3B8",
                  };
                  const total = r.steps_total ?? 0;
                  const done = r.steps_completed ?? 0;
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid #F1F5F9" }}
                    >
                      <Td>
                        <span
                          style={{ fontWeight: 600, color: "#0F172A" }}
                        >
                          {r.prospect?.full_name ??
                            r.prospect_id.slice(0, 8)}
                        </span>
                        {r.prospect?.company && (
                          <div
                            style={{
                              fontSize: 11.5,
                              color: "#94A3B8",
                              marginTop: 2,
                            }}
                          >
                            {r.prospect.company}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <span style={{ fontSize: 12, color: "#64748B" }}>
                          {(r.enrollment_list_labels ?? []).join(" · ") || "—"}
                        </span>
                      </Td>
                      <Td>
                        <span
                          style={{
                            fontSize: 12,
                            color: "#64748B",
                            tabularNums: "true",
                          } as React.CSSProperties}
                        >
                          {total > 0 ? `${done} / ${total} étapes` : "—"}
                        </span>
                      </Td>
                      <Td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: sc.bg,
                            padding: "2px 8px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            color: sc.color,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: sc.dot,
                            }}
                          />
                          {sc.label}
                        </span>
                        {r.last_error && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#BE123C",
                              marginTop: 4,
                              maxWidth: 240,
                            }}
                            title={r.last_error}
                          >
                            {r.last_error.length > 60
                              ? `${r.last_error.slice(0, 60)}…`
                              : r.last_error}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>
                          {formatDate(r.created_at)}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 16px",
        fontSize: 11,
        fontWeight: 600,
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>{children}</td>
  );
}
