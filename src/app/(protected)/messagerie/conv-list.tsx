"use client";

import { useMemo } from "react";
import Link from "next/link";
import { FileText, Pin } from "lucide-react";
import type { Conversation, Channel } from "./data";
import { Avatar, ChannelMark, StagePill } from "./components";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import type { MsgFilter } from "./page";

type ChannelFilter = "all" | Channel;

// #FF: whatsapp — channel segment hidden until WhatsApp ships.
const SHOW_WHATSAPP = isFeatureEnabled("whatsapp");
// #FF: messagerieHorsCrm — "Hors CRM" filter chip.
const SHOW_HORS_CRM = isFeatureEnabled("messagerieHorsCrm");

export function ConvList({
  conversations,
  activeId,
  onSelect,
  onTogglePin,
  filter,
  setFilter,
  channel,
  setChannel,
  stickyIds,
  matchesFilter,
  includeHorsCrm,
  setIncludeHorsCrm,
  horsCrmCount,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onTogglePin?: (chatId: string, pinned: boolean) => void;
  filter: MsgFilter;
  setFilter: (f: MsgFilter) => void;
  channel: ChannelFilter;
  setChannel: (c: ChannelFilter) => void;
  /** Session-sticky membership for the active filter (null = no stickiness). */
  stickyIds: Set<string> | null;
  matchesFilter: (f: MsgFilter, c: Conversation) => boolean;
  /** "Inclure les conversations Hors CRM" toggle state. */
  includeHorsCrm: boolean;
  setIncludeHorsCrm: (v: boolean) => void;
  /** Total hidden hors-CRM conversations — shown next to the toggle. */
  horsCrmCount: number;
}) {
  // `conversations` is already hors-CRM filtered upstream, so every count below
  // reflects the toggle automatically.
  const STATUS: { id: MsgFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: conversations.length },
    {
      id: "unread",
      label: "Non lus",
      count: conversations.filter((c) => c.unread > 0).length,
    },
    {
      id: "relance",
      label: "À relancer",
      count: conversations.filter((c) => c.silentDays >= 4).length,
    },
    {
      id: "rdv",
      label: "RDV",
      count: conversations.filter((c) => c.stage === "meeting").length,
    },
  ];

  const filtered = useMemo(() => {
    let list = conversations;
    if (channel !== "all") list = list.filter((c) => c.channel === channel);
    if (filter !== "all") {
      // Sticky: a row stays visible if it matches now OR matched when the
      // filter was entered (so reading an unread one / an RDV passing doesn't
      // make it vanish mid-session).
      list = list.filter(
        (c) => matchesFilter(filter, c) || (stickyIds?.has(c.id) ?? false),
      );
    }
    return list;
  }, [conversations, filter, channel, stickyIds, matchesFilter]);

  return (
    <div
      style={{
        width: 320,
        minWidth: 280,
        borderRight: "1px solid var(--m2-slate-200)",
        display: "flex",
        flexDirection: "column",
        background: "var(--m2-surface-muted)",
        flexShrink: 0,
      }}
    >
      {/* Header — title + Templates entry (integrated, not a floating bar). */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "1px solid var(--m2-slate-150)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--m2-slate-900)" }}>
          Conversations
        </span>
        <Link
          href="/messagerie/templates"
          className="m2-icon-btn"
          title="Templates de messages"
          aria-label="Templates de messages"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px",
            width: "auto",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--m2-slate-700)",
            textDecoration: "none",
          }}
        >
          <FileText size={13} />
          Templates
        </Link>
      </div>

      {/* Niveau 1 — canal (WhatsApp segment gated behind #FF). */}
      {SHOW_WHATSAPP && (
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid var(--m2-slate-150)",
          }}
        >
          <div className="m2-seg" style={{ width: "100%" }}>
            <button
              className={channel === "all" ? "active" : ""}
              onClick={() => setChannel("all")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              Tous
            </button>
            <button
              className={channel === "li" ? "active" : ""}
              onClick={() => setChannel("li")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#0A66C2" }} />
              LinkedIn
            </button>
            <button
              className={channel === "wa" ? "active" : ""}
              onClick={() => setChannel("wa")}
              style={{ flex: 1, justifyContent: "center" }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#25D366" }} />
              WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Row 1 — "Hors CRM" toggle (gated by #FF). When enabled, hidden hors-CRM
          conversations reappear and every count below updates to match. */}
      {SHOW_HORS_CRM && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 14px",
            borderBottom: "1px solid var(--m2-slate-150)",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--m2-slate-700)",
          }}
        >
          <input
            type="checkbox"
            checked={includeHorsCrm}
            onChange={(e) => setIncludeHorsCrm(e.target.checked)}
            style={{
              accentColor: "#0052D9",
              width: 14,
              height: 14,
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1 }}>Inclure les conversations Hors CRM</span>
          {horsCrmCount > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--m2-slate-500)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {horsCrmCount}
            </span>
          )}
        </label>
      )}

      {/* Row 2 — statut filters. Wrap instead of horizontal-scroll so labels
          never truncate; counts shown compactly in parentheses. */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--m2-slate-150)",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        {STATUS.map((f) => (
          <button
            key={f.id}
            className={"m2-filter-chip" + (filter === f.id ? " active" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}{" "}
            <span
              style={{ opacity: 0.55, fontVariantNumeric: "tabular-nums" }}
            >
              ({f.count})
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map((c) => {
          const isActive = c.id === activeId;
          const isStale = c.silentDays >= 4;
          return (
            <div
              key={c.id}
              className={
                "m2-conv-card" +
                (isActive ? " active" : "") +
                (isStale ? " stale" : "")
              }
              onClick={() => onSelect(c.id)}
              style={{
                padding: "11px 14px",
                borderBottom: "1px solid var(--m2-slate-150)",
                cursor: "pointer",
                display: "flex",
                gap: 11,
                alignItems: "center",
              }}
            >
              <Avatar name={c.name} size={40} pictureUrl={c.pictureUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ChannelMark channel={c.channel} size={12} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--m2-slate-900)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      flex: 1,
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      color: "var(--m2-slate-500)",
                      flexShrink: 0,
                    }}
                  >
                    {c.lastTime}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--m2-slate-500)",
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {[c.company, c.role].filter(Boolean).join(" · ") || "—"}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 5,
                  }}
                >
                  {/* Hors-CRM conversations (no linked prospect) have no
                      pipeline status — don't show a stage pill for them. */}
                  {c.prospectId !== null && <StagePill stage={c.stage} />}
                  {isStale && (
                    <span
                      style={{ fontSize: 10, color: "var(--m2-slate-500)" }}
                    >
                      · {c.silentDays}j
                    </span>
                  )}
                </div>
              </div>
              {onTogglePin && (
                <button
                  type="button"
                  className="m2-icon-btn"
                  aria-label={
                    c.pinnedAt
                      ? "Désépingler la conversation"
                      : "Épingler la conversation en haut de liste"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(c.id, !c.pinnedAt);
                  }}
                  style={{
                    flexShrink: 0,
                    width: 30,
                    height: 30,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--m2-slate-200)",
                    borderRadius: 8,
                    background: "var(--m2-surface-elevated)",
                    cursor: "pointer",
                  }}
                >
                  <Pin
                    size={14}
                    strokeWidth={2}
                    // Simple boolean: pinned → filled mark in the strongest
                    // foreground (black in light, white in dark); not pinned →
                    // clean outline.
                    fill={c.pinnedAt ? "currentColor" : "none"}
                    style={{
                      color: c.pinnedAt
                        ? "var(--m2-slate-900)"
                        : "var(--m2-slate-500)",
                    }}
                  />
                </button>
              )}
              {c.unread > 0 && (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: "var(--m2-blue)",
                    color: "white",
                    fontSize: 10.5,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {c.unread}
                </span>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--m2-slate-500)",
            }}
          >
            Aucune conversation.
          </div>
        )}
      </div>
    </div>
  );
}
