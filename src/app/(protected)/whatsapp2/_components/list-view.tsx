"use client";

// List view — visuals ported from design/whatsapp/Workflows.html.
// Data comes from /api/workflows via the parent page.

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, ICO } from "./icons";
import { WF_NODE_TYPES } from "./node-types";
import type { DesignTag, DesignWorkflowCard } from "./workflow-mapping";

const STATUS_CFG = {
  active: { label: "Actif", bg: "#ECFDF5", color: "#15803D", dot: "#10B981" },
  draft: { label: "Brouillon", bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  paused: { label: "En pause", bg: "#FFF7ED", color: "#C2410C", dot: "#F97316" },
  error: { label: "Erreur", bg: "#FFF1F2", color: "#BE123C", dot: "#F43F5E" },
} as const;

const TAG_CFG: Record<DesignTag, { bg: string; color: string }> = {
  WhatsApp: { bg: "#ECFDF5", color: "#065F46" },
  LinkedIn: { bg: "#EFF6FF", color: "#0A66C2" },
  CRM: { bg: "#EFF6FF", color: "#1E3A8A" },
  IA: { bg: "#F0FDF4", color: "#047857" },
};

function TopBar() {
  return (
    <div
      style={{
        height: 56,
        borderBottom: "1px solid #E2E8F0",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        flexShrink: 0,
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
            color: "#0F172A",
          }}
        >
          Workflows
        </div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 1 }}>
          Créez des séquences automatisées sur WhatsApp, LinkedIn, le booking et le CRM.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid #E2E8F0",
            background: "white",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon size={14} color="#64748B" d={ICO.hamburger} />
          Utiliser un modèle
        </button>
        <Link
          href="/whatsapp2/new"
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            border: "none",
            background: "#0052D9",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
          }}
        >
          <Icon size={14} color="white" d={ICO.plus} />
          Créer un workflow
        </Link>
      </div>
    </div>
  );
}

function WorkflowCard({
  wf,
  onOpen,
}: {
  wf: DesignWorkflowCard;
  onOpen: (id: string) => void;
}) {
  const sc = STATUS_CFG[wf.status];
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onOpen(wf.id)}
      style={{
        background: "white",
        border: `1px solid ${hov ? "#0052D9" : "#E2E8F0"}`,
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 150ms",
        boxShadow: hov
          ? "0 4px 20px rgba(0,82,217,0.1)"
          : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: "#0F172A",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {wf.name}
            </div>
            <div
              style={{
                display: "flex",
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
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: sc.dot,
                }}
              />
              {sc.label}
            </div>
          </div>
          {wf.description && (
            <div style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.5 }}>
              {wf.description}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {wf.nodes.map((type, i) => {
          const cfg = WF_NODE_TYPES[type];
          if (!cfg) return null;
          return (
            <Fragment key={i}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}44`,
                  borderRadius: 6,
                  padding: "3px 7px",
                }}
              >
                {cfg.iconFn(10)}
                <span
                  style={{ fontSize: 10.5, fontWeight: 600, color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
              {i < wf.nodes.length - 1 && (
                <div style={{ width: 10, height: 1, background: "#CBD5E1" }} />
              )}
            </Fragment>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          background: "#F8FAFC",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #E2E8F0",
        }}
      >
        {[
          { label: "Prospects", value: wf.stats.enrolled },
          { label: "Taux de réponse", value: wf.stats.replyRate },
          { label: "Réunions", value: wf.stats.meetings },
          { label: "Conversion", value: wf.stats.conversion },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              textAlign: "center",
              borderLeft: i > 0 ? "1px solid #E2E8F0" : "none",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.02em",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "#94A3B8",
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          {wf.tags.map((t) => {
            const tc = TAG_CFG[t];
            return (
              <span
                key={t}
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: tc.bg,
                  color: tc.color,
                }}
              >
                {t}
              </span>
            );
          })}
        </div>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>
          Modifié {wf.lastModified}
        </span>
      </div>
    </div>
  );
}

export interface ListViewProps {
  workflows: DesignWorkflowCard[];
  loading: boolean;
}

export function ListView({ workflows, loading }: ListViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: workflows.length,
      active: 0,
      draft: 0,
      paused: 0,
      error: 0,
    };
    for (const w of workflows) c[w.status] = (c[w.status] ?? 0) + 1;
    return c;
  }, [workflows]);

  const filters = [
    { id: "all", label: "Tous" },
    { id: "active", label: "Actifs" },
    { id: "draft", label: "Brouillons" },
    { id: "paused", label: "En pause" },
    { id: "error", label: "Erreur" },
  ];
  const visible =
    filter === "all" ? workflows : workflows.filter((w) => w.status === filter);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar />

      <div
        style={{
          padding: "12px 24px 0",
          background: "white",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          gap: 0,
          flexShrink: 0,
        }}
      >
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "8px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "#0052D9" : "#64748B",
                borderBottom: active
                  ? "2px solid #0052D9"
                  : "2px solid transparent",
                marginBottom: -1,
                transition: "all 120ms",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {f.label}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: active ? "#E8F0FD" : "#F1F5F9",
                  color: active ? "#0052D9" : "#94A3B8",
                }}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px" }}>
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
              gap: 14,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: 14,
                  padding: "18px 20px",
                  height: 180,
                }}
              >
                <div
                  style={{
                    width: "60%",
                    height: 18,
                    background: "#F1F5F9",
                    borderRadius: 4,
                    marginBottom: 12,
                  }}
                />
                <div
                  style={{
                    width: "100%",
                    height: 12,
                    background: "#F1F5F9",
                    borderRadius: 4,
                    marginBottom: 6,
                  }}
                />
                <div
                  style={{
                    width: "80%",
                    height: 12,
                    background: "#F1F5F9",
                    borderRadius: 4,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))",
              gap: 14,
            }}
          >
            {visible.map((wf) => (
              <WorkflowCard
                key={wf.id}
                wf={wf}
                onOpen={(id) => router.push(`/whatsapp2/${id}`)}
              />
            ))}
            {visible.length === 0 && (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#94A3B8",
                }}
              >
                <div style={{ fontSize: 14 }}>
                  Aucun workflow dans cette catégorie.
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            padding: "24px",
            background: "linear-gradient(135deg, #E8F0FD 0%, #EFF6FF 100%)",
            borderRadius: 14,
            border: "1px dashed #93C5FD",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#0052D9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={22} color="white" d={ICO.plus} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#0F172A",
                marginBottom: 3,
              }}
            >
              Créer un nouveau workflow
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>
              Partez de zéro ou choisissez parmi nos modèles de séquences
              commerciales prêts à l&apos;emploi.
            </div>
          </div>
          <Link
            href="/whatsapp2/new"
            style={{
              padding: "9px 20px",
              borderRadius: 9,
              border: "none",
              background: "#0052D9",
              fontSize: 13.5,
              fontWeight: 600,
              color: "white",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            Créer un workflow
          </Link>
        </div>
      </div>
    </div>
  );
}
