"use client";

import "./styles.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Plug } from "lucide-react";
import { ConvList } from "./conv-list";
import { Thread } from "./thread";
import { Cockpit } from "./cockpit";
import {
  useConversations,
  useThread,
  useMarkChatSeen,
  useToggleChatPin,
  useUnipileConnections,
} from "./queries";
import type { ThreadEntry } from "./data";
import { Skeleton } from "@/components/ui/skeleton";

function ConvListSkeleton() {
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
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--m2-slate-150)" }}>
        <Skeleton className="h-8 w-full" />
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--m2-slate-150)", display: "flex", gap: 6 }}>
        <Skeleton className="h-6 w-14" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div style={{ flex: 1, overflowY: "hidden" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: "11px 14px",
              borderBottom: "1px solid var(--m2-slate-150)",
              display: "flex",
              gap: 11,
              alignItems: "center",
            }}
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--m2-surface-muted)",
        borderRight: "1px solid var(--m2-slate-200)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          height: 56,
          borderBottom: "1px solid var(--m2-slate-200)",
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Skeleton className="h-9 w-9 rounded-full" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Skeleton className="h-12 w-2/3 self-start" />
        <Skeleton className="h-16 w-3/4 self-end" />
        <Skeleton className="h-10 w-1/2 self-start" />
        <Skeleton className="h-14 w-2/3 self-end" />
        <Skeleton className="h-8 w-1/3 self-start" />
      </div>
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
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Skeleton className="h-16 w-16 rounded-full self-center" />
      <Skeleton className="h-4 w-32 self-center" />
      <Skeleton className="h-3 w-44 self-center" />
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </aside>
  );
}

function NotConnectedState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--m2-surface)",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          background: "var(--m2-surface-elevated)",
          border: "1px solid var(--m2-slate-200)",
          borderRadius: 12,
          padding: "32px 28px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--m2-blue-50)",
            color: "var(--m2-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MessageSquare size={26} />
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--m2-slate-800)", margin: 0 }}>
          Connectez votre messagerie
        </h2>
        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "var(--m2-slate-500)",
            margin: 0,
            maxWidth: 360,
          }}
        >
          Pour consulter et répondre à vos conversations LinkedIn et WhatsApp
          depuis Andoxa, connectez au moins un compte.
        </p>
        <Link
          href="/settings?tab=integrations"
          className="m2-btn"
          style={{
            padding: "9px 16px",
            textDecoration: "none",
            background: "var(--m2-blue)",
            color: "#fff",
            borderColor: "var(--m2-blue)",
            fontWeight: 500,
            marginTop: 6,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Plug size={14} />
          Connecter un compte
        </Link>
      </div>
    </div>
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

export type MsgFilter = "all" | "unread" | "relance" | "rdv" | "horscrm";

export default function Messagerie2Page() {
  // Initialise from localStorage so useThread fires immediately on mount,
  // before the conversations list resolves (~4-7s).
  const [activeId, setActiveId] = useState<string | null>(readLastChatId);
  const [filter, setFilter] = useState<MsgFilter>("all");
  const [channel, setChannel] = useState<"all" | "li" | "wa">("all");
  // Sticky-filter membership: when a filter is active, conversations that
  // matched when it was entered stay visible for the session (so reading an
  // unread one, or an RDV passing, doesn't make the row vanish under you).
  // Keyed by filter; recomputed each time that filter is (re-)selected.
  const [stickyIds, setStickyIds] = useState<Set<string> | null>(null);

  const { data: connections, isLoading: connectionsLoading } =
    useUnipileConnections();
  const anyConnected = connections?.anyConnected ?? false;

  // Only fetch chats once we know at least one account is connected. This
  // prevents the page from firing /api/unipile/chats and /api/unipile/chats/*/messages
  // (which return 500/404 without an account) while we resolve connection state.
  const { data: conversations } = useConversations({ enabled: anyConnected });
  const markSeen = useMarkChatSeen();
  const togglePin = useToggleChatPin();

  const visibleConvs = conversations ?? [];

  // Compute the set of conversations that match a sticky-eligible filter
  // *right now*. Used to seed `stickyIds` when a filter is (re-)selected.
  const matchesFilter = useMemo(() => {
    return (f: MsgFilter, c: (typeof visibleConvs)[number]): boolean => {
      if (f === "unread") return c.unread > 0;
      if (f === "relance") return c.silentDays >= 4;
      if (f === "rdv") return c.stage === "meeting";
      if (f === "horscrm") return c.prospectId === null;
      return true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the active filter changes, snapshot the matching ids so they remain
  // visible even after their underlying condition flips (read / RDV passes).
  // "all" and "horscrm" don't need stickiness ("all" shows everything;
  // "horscrm" membership doesn't change by reading).
  useEffect(() => {
    if (filter === "all" || filter === "horscrm") {
      setStickyIds(null);
      return;
    }
    const snap = new Set(
      (conversations ?? []).filter((c) => matchesFilter(filter, c)).map((c) => c.id),
    );
    setStickyIds(snap);
    // Re-snapshot only when the filter itself changes (not on every list tick).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Effective chat: use persisted/active ID if present; otherwise first
  // visible conversation once the list loads.
  const effectiveId =
    activeId ??
    (visibleConvs.length > 0 ? visibleConvs[0].id : null);

  // Start loading the thread immediately with the last-known chat ID, but
  // only once we know an account is connected — otherwise the messages
  // endpoint 404s before /api/unipile/me resolves.
  const { data: thread } = useThread(anyConnected ? effectiveId : null);

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

  return (
    <div className="m2-root flex h-full min-w-[1180px] flex-col">
      {/* 3-column workspace — layout stays stable across loading / empty / loaded.
          The Templates entry now lives in the conversation-list header. */}
      <div className="flex min-h-0 flex-1">
        {connectionsLoading ? (
          // Connection status still resolving — show full 3-column skeleton.
          <>
            <ConvListSkeleton />
            <ThreadSkeleton />
            <CockpitSkeleton />
          </>
        ) : !anyConnected ? (
          // No account connected — full-pane inline CTA (not a modal).
          <NotConnectedState />
        ) : (
          <>
            <ConvList
              conversations={visibleConvs}
              activeId={effectiveId ?? ""}
              onSelect={handleSelect}
              onTogglePin={(chatId, pinned) =>
                togglePin.mutate({ chatId, pinned })
              }
              filter={filter}
              setFilter={setFilter}
              channel={channel}
              setChannel={setChannel}
              stickyIds={stickyIds}
              matchesFilter={matchesFilter}
            />

            {conv ? (
              <>
                <Thread
                  conv={conv}
                  thread={(thread ?? []) as ThreadEntry[]}
                />
                <Cockpit conv={conv} />
              </>
            ) : (
              <>
                <ThreadSkeleton />
                <CockpitSkeleton />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
