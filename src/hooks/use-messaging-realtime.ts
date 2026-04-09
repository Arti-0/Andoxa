"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace";

export interface MessagingRealtimeState {
  lastIncomingChatId: string | null;
  unseenCount: number;
  markChatSeen: (chatId: string) => Promise<void>;
  markAllSeen: () => Promise<void>;
}

export interface UseMessagingRealtimeOptions {
  /** Appelé après un INSERT Realtime (ex. rafraîchir les badges CRM côté liste). */
  onAfterInboxInsert?: () => void;
}

export function useMessagingRealtime(
  options?: UseMessagingRealtimeOptions
): MessagingRealtimeState {
  const { workspaceId } = useWorkspace();
  const [lastIncomingChatId, setLastIncomingChatId] = useState<string | null>(
    null
  );
  const [unseenCount, setUnseenCount] = useState(0);

  const onAfterInboxInsertRef = useRef(options?.onAfterInboxInsert);
  onAfterInboxInsertRef.current = options?.onAfterInboxInsert;

  const fetchUnseenCount = useCallback(async () => {
    if (!workspaceId) return;
    const supabase = createClient();
    const { data } = await supabase.rpc("get_unseen_inbox_count", {
      p_org_id: workspaceId,
    });
    setUnseenCount(typeof data === "number" ? data : 0);
  }, [workspaceId]);

  const markChatSeen = useCallback(
    async (chatId: string) => {
      const supabase = createClient();
      await supabase.rpc("mark_chat_inbox_seen", { p_chat_id: chatId });
      setUnseenCount((prev) => Math.max(0, prev - 1));
      void fetchUnseenCount();
    },
    [fetchUnseenCount]
  );

  const markAllSeen = useCallback(async () => {
    if (!workspaceId) return;
    const supabase = createClient();
    await supabase.rpc("mark_org_inbox_seen", { p_org_id: workspaceId });
    setUnseenCount(0);
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    void fetchUnseenCount();

    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-events-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inbox_events",
        },
        (payload) => {
          const chatId = (payload.new as { chat_id?: string })?.chat_id;
          if (chatId) {
            setLastIncomingChatId(chatId);
          }
          void fetchUnseenCount();
          onAfterInboxInsertRef.current?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, fetchUnseenCount]);

  return { lastIncomingChatId, unseenCount, markChatSeen, markAllSeen };
}
