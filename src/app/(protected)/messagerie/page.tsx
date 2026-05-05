"use client";

import "./styles.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ConvList } from "./conv-list";
import { Thread } from "./thread";
import { Cockpit } from "./cockpit";
import {
  useConversations,
  useThread,
  useMarkChatSeen,
} from "./queries";
import type { ThreadEntry } from "./data";

function ThreadSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--m2-surface-muted)",
        borderRight: "1px solid var(--m2-slate-200)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--m2-slate-400)" }}>
        Chargement…
      </span>
    </div>
  );
}

function CockpitSkeleton() {
  return (
    <aside
      style={{
        width: 300,
        minWidth: 260,
        background: "var(--m2-surface-elevated)",
        borderLeft: "1px solid var(--m2-slate-200)",
      }}
    />
  );
}

// Persist the last opened chat ID across page loads so useThread starts
// fetching in parallel with the conversations list on the next visit.
function readLastChatId(): string | null {
  try {
    return typeof window !== "undefined"
      ? localStorage.getItem("m2_lastChatId")
      : null;
  } catch {
    return null;
  }
}

function readArchivedIds(): Set<string> {
  try {
    if (typeof window === "undefined") return new Set();
    return new Set(JSON.parse(localStorage.getItem("m2_archived") ?? "[]"));
  } catch {
    return new Set();
  }
}

export default function Messagerie2Page() {
  // Initialise from localStorage so useThread fires immediately on mount,
  // before the conversations list resolves (~4-7s).
  const [activeId, setActiveId] = useState<string | null>(readLastChatId);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(readArchivedIds);
  const [filter, setFilter] = useState<"all" | "unread" | "relance" | "rdv">(
    "all",
  );
  const [channel, setChannel] = useState<"all" | "li" | "wa">("all");

  const { data: conversations } = useConversations();
  const markSeen = useMarkChatSeen();

  // Visible list — exclude archived conversations.
  const visibleConvs = (conversations ?? []).filter(
    (c) => !archivedIds.has(c.id),
  );

  // Effective chat: use persisted/active ID if present; otherwise first
  // visible conversation once the list loads.
  const effectiveId =
    activeId ??
    (visibleConvs.length > 0 ? visibleConvs[0].id : null);

  // Start loading the thread immediately with the last-known chat ID.
  const { data: thread } = useThread(effectiveId);

  const conv =
    visibleConvs.find((c) => c.id === effectiveId) ?? visibleConvs[0] ?? null;

  // When the active conversation changes, mark it as seen.
  useEffect(() => {
    if (effectiveId) {
      markSeen.mutate(effectiveId);
    }
    // markSeen.mutate is stable; effectiveId is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveId]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    try {
      localStorage.setItem("m2_lastChatId", id);
    } catch {
      // storage might be disabled
    }
  };

  const handleArchive = (chatId: string) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      next.add(chatId);
      try {
        localStorage.setItem("m2_archived", JSON.stringify([...next]));
      } catch {}
      return next;
    });
    // If we just archived the active conversation, move to the next one.
    if (chatId === effectiveId) {
      const next = visibleConvs.find((c) => c.id !== chatId);
      if (next) handleSelect(next.id);
      else setActiveId(null);
    }
  };

  return (
    <div className="m2-root flex h-full min-w-[1180px] flex-col">
      {/* Page-scoped action bar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--m2-slate-200)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 22px",
          background: "var(--m2-surface-elevated)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/messagerie/templates"
          className="m2-btn"
          style={{ padding: "6px 11px", textDecoration: "none" }}
        >
          <FileText size={14} />
          Templates
        </Link>
      </div>

      {/* 3-column workspace — always rendered so the layout is stable on load. */}
      <div className="flex min-h-0 flex-1">
        {/* ConvList renders immediately — empty list while conversations load. */}
        <ConvList
          conversations={visibleConvs}
          activeId={effectiveId ?? ""}
          onSelect={handleSelect}
          filter={filter}
          setFilter={setFilter}
          channel={channel}
          setChannel={setChannel}
        />

        {/* Thread + Cockpit need a resolved conv object. */}
        {conv ? (
          <>
            <Thread
              conv={conv}
              thread={(thread ?? []) as ThreadEntry[]}
              onArchive={handleArchive}
            />
            <Cockpit conv={conv} />
          </>
        ) : (
          <>
            <ThreadSkeleton />
            <CockpitSkeleton />
          </>
        )}
      </div>
    </div>
  );
}
