"use client";

// List view — visuals ported from design/whatsapp/Workflows.html.
// Data comes from /api/workflows via the parent page.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon, ICO } from "./icons";
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
} from "@/lib/workflows";
import { toastFromApiError } from "@/lib/toast";
import { LaunchButton } from "./launch-button";
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

interface UserTemplate {
  id: string;
  name: string;
  description: string | null;
}

function TopBar({
  userTemplates,
  onUseTemplate,
  busyTemplateId,
}: {
  userTemplates: UserTemplate[];
  onUseTemplate: (
    source: "builtin" | "user",
    templateId: string,
    name: string
  ) => void;
  busyTemplateId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

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
      <div
        ref={popoverRef}
        style={{ display: "flex", gap: 8, position: "relative" }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: `1px solid ${open ? "#0052D9" : "#E2E8F0"}`,
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
        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              right: 96,
              top: 44,
              width: 360,
              background: "white",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
              padding: 8,
              zIndex: 30,
              maxHeight: 480,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#94A3B8",
                padding: "6px 8px",
              }}
            >
              Modèles intégrés
            </div>
            {WORKFLOW_TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
              <button
                key={t.id}
                disabled={busyTemplateId !== null}
                onClick={() => {
                  setOpen(false);
                  onUseTemplate("builtin", t.id, t.name);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    busyTemplateId === `builtin:${t.id}` ? "#F1F5F9" : "transparent",
                  cursor: busyTemplateId !== null ? "wait" : "pointer",
                  display: "block",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (busyTemplateId === null) {
                    e.currentTarget.style.background = "#F8FAFC";
                  }
                }}
                onMouseLeave={(e) => {
                  if (busyTemplateId !== `builtin:${t.id}`) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}
                >
                  {t.name}
                  {t.popular && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 9.5,
                        fontWeight: 700,
                        background: "#FF6700",
                        color: "white",
                        padding: "1px 6px",
                        borderRadius: 8,
                        verticalAlign: 1,
                      }}
                    >
                      Populaire
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {t.description}
                </div>
              </button>
            ))}

            {userTemplates.length > 0 && (
              <>
                <div
                  style={{
                    height: 1,
                    background: "#E2E8F0",
                    margin: "6px 4px",
                  }}
                />
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#94A3B8",
                    padding: "6px 8px",
                  }}
                >
                  Vos modèles
                </div>
                {userTemplates.map((t) => (
                  <button
                    key={t.id}
                    disabled={busyTemplateId !== null}
                    onClick={() => {
                      setOpen(false);
                      onUseTemplate("user", t.id, t.name);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "transparent",
                      cursor: busyTemplateId !== null ? "wait" : "pointer",
                      display: "block",
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (busyTemplateId === null)
                        e.currentTarget.style.background = "#F8FAFC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#0F172A",
                      }}
                    >
                      {t.name}
                    </div>
                    {t.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748B",
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {t.description}
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        <Link
          href="/workflows/new"
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

export type { UserTemplate };

function WorkflowCard({
  wf,
  onOpen,
  onLaunch,
}: {
  wf: DesignWorkflowCard;
  onOpen: (id: string) => void;
  onLaunch: (id: string) => void;
}) {
  const launchDisabled = wf.status === "draft" || wf.status === "error";
  const launchReason =
    wf.status === "draft"
      ? "Enregistrez le parcours d'abord."
      : wf.status === "error"
        ? "Le parcours est en erreur."
        : undefined;
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
        </div>
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: wf.description ? "#475569" : "#94A3B8",
          lineHeight: 1.55,
          marginBottom: 14,
          minHeight: 38,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontStyle: wf.description ? "normal" : "italic",
        }}
      >
        {wf.description || "Aucune description."}
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Modifié {wf.lastModified}
          </span>
          <LaunchButton
            variant="outline"
            disabled={launchDisabled}
            disabledReason={launchReason}
            onClick={() => onLaunch(wf.id)}
          />
        </div>
      </div>
    </div>
  );
}

export interface ListViewProps {
  workflows: DesignWorkflowCard[];
  loading: boolean;
  userTemplates: UserTemplate[];
  onLaunch: (workflowId: string) => void;
}

export function ListView({
  workflows,
  loading,
  userTemplates,
  onLaunch,
}: ListViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);

  const handleUseTemplate = async (
    source: "builtin" | "user",
    templateId: string,
    name: string
  ) => {
    setBusyTemplateId(`${source}:${templateId}`);
    try {
      let body: Record<string, unknown>;
      if (source === "builtin") {
        const tpl: WorkflowTemplate | undefined = WORKFLOW_TEMPLATES.find(
          (t) => t.id === templateId
        );
        if (!tpl) throw new Error("Modèle introuvable.");
        body = {
          name: tpl.name,
          description: tpl.description,
          draft_definition: tpl.buildDefinition(),
          ui: {
            icon: tpl.ui.icon,
            color: tpl.ui.color,
            trigger: tpl.trigger,
          },
        };
      } else {
        // Hydrate from the user template's stored definition.
        const res = await fetch(`/api/workflows/${templateId}`, {
          credentials: "include",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error?.message ?? "Modèle introuvable.");
        }
        const wf = json.data.workflow as {
          description: string | null;
          draft_definition: unknown;
          metadata: unknown;
        };
        body = {
          name,
          description: wf.description,
          draft_definition: wf.draft_definition,
          ui:
            wf.metadata &&
            typeof wf.metadata === "object" &&
            "ui" in (wf.metadata as Record<string, unknown>)
              ? (wf.metadata as { ui: Record<string, unknown> }).ui
              : undefined,
        };
      }

      const create = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const createJson = await create.json();
      if (!create.ok || !createJson.success) {
        throw new Error(
          createJson?.error?.message ?? "Création impossible."
        );
      }
      const newId = createJson.data.id as string;
      toast.success("Workflow créé depuis le modèle");
      router.push(`/workflows/${newId}`);
    } catch (e) {
      toastFromApiError(e, "Création impossible");
    } finally {
      setBusyTemplateId(null);
    }
  };

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
      <TopBar
        userTemplates={userTemplates}
        onUseTemplate={(s, id, n) => void handleUseTemplate(s, id, n)}
        busyTemplateId={busyTemplateId}
      />

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
                onOpen={(id) => router.push(`/workflows/${id}`)}
                onLaunch={onLaunch}
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
            href="/workflows/new"
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
