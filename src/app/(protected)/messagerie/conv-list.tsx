"use client";

import { useMemo } from "react";
import type { Conversation, Channel } from "./data";
import { Avatar, ChannelMark, StagePill } from "./components";

type Filter = "all" | "unread" | "relance" | "rdv";
type ChannelFilter = "all" | Channel;

export function ConvList({
  conversations,
  activeId,
  onSelect,
  filter,
  setFilter,
  channel,
  setChannel,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  channel: ChannelFilter;
  setChannel: (c: ChannelFilter) => void;
}) {
  const STATUS: { id: Filter; label: string; count: number }[] = [
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
      label: "RDV à venir",
      count: conversations.filter((c) => c.stage === "meeting").length,
    },
  ];

  const filtered = useMemo(() => {
    let list = conversations;
    if (channel !== "all") list = list.filter((c) => c.channel === channel);
    if (filter === "unread") list = list.filter((c) => c.unread > 0);
    if (filter === "relance") list = list.filter((c) => c.silentDays >= 4);
    if (filter === "rdv") list = list.filter((c) => c.stage === "meeting");
    return list;
  }, [conversations, filter, channel]);

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
      {/* Niveau 1 — canal */}
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
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: "#0A66C2",
              }}
            />
            LinkedIn
          </button>
          <button
            className={channel === "wa" ? "active" : ""}
            onClick={() => setChannel("wa")}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: "#25D366",
              }}
            />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Niveau 2 — statut */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--m2-slate-150)",
          display: "flex",
          gap: 4,
          overflowX: "auto",
        }}
      >
        {STATUS.map((f) => (
          <button
            key={f.id}
            className={"m2-filter-chip" + (filter === f.id ? " active" : "")}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="count">{f.count}</span>
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
                  <StagePill stage={c.stage} />
                  {isStale && (
                    <span
                      style={{ fontSize: 10, color: "var(--m2-slate-500)" }}
                    >
                      · {c.silentDays}j
                    </span>
                  )}
                </div>
              </div>
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
      </div>
    </div>
  );
}
