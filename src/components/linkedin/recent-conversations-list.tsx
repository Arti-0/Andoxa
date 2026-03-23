"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Loader2, ChevronRight } from "lucide-react";
import type { UnipileChat } from "@/lib/unipile/types";

interface ChatsApiResponse {
  items?: UnipileChat[];
  cursor?: string | null;
}

interface AndoxaIdsResponse {
  ids?: string[];
}

function chatLabel(chat: UnipileChat & { interlocutor_name?: string }): string {
  return chat.interlocutor_name?.trim() || chat.name?.trim() || "Conversation";
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 24 * 60 * 60 * 1000) {
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString("fr-FR", { weekday: "short" });
  }
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Recent conversations list for the LinkedIn page.
 * - No focused conversation (click redirects to /messagerie)
 * - Highlights unread messages
 * - Orange band for Andoxa-started chats
 */
export function RecentConversationsList() {
  const router = useRouter();
  const [chats, setChats] = useState<UnipileChat[]>([]);
  const [andoxaChatIds, setAndoxaChatIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [chatsRes, idsRes] = await Promise.all([
        fetch("/api/unipile/chats?account_type=LINKEDIN&limit=50", {
          credentials: "include",
        }),
        fetch("/api/unipile/chats/andoxa-ids", { credentials: "include" }),
      ]);

      if (!chatsRes.ok) {
        const json = await chatsRes.json();
        setError(json?.error?.message ?? "Erreur lors du chargement");
        setChats([]);
        return;
      }

      const chatsData = (await chatsRes.json())?.data ?? (await chatsRes.json());
      const items =
        (chatsData as ChatsApiResponse)?.items ??
        (Array.isArray(chatsData) ? chatsData : []);
      setChats(Array.isArray(items) ? items : []);

      if (idsRes.ok) {
        const idsData = (await idsRes.json())?.data ?? (await idsRes.json());
        const ids = (idsData as AndoxaIdsResponse)?.ids ?? [];
        setAndoxaChatIds(new Set(ids));
      }
    } catch {
      setError(
        "Impossible de charger les conversations. Vérifiez votre connexion LinkedIn/WhatsApp."
      );
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChatClick = (chatId: string) => {
    router.push(`/messagerie?chat=${encodeURIComponent(chatId)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement des conversations...
      </div>
    );
  }

  if (error && chats.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-medium">Messagerie non disponible</p>
        <p className="mt-1 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-10 w-10 opacity-50" />
        <p className="mt-2 text-sm">Aucune conversation</p>
        <p className="mt-1 text-xs">
          Cliquez pour ouvrir la messagerie complète
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[280px]">
      <div className="space-y-1 p-1">
        {chats.map((chat) => {
          const isAndoxa = andoxaChatIds.has(chat.id);
          const hasUnread = (chat.unread_count ?? 0) > 0;
          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => handleChatClick(chat.id)}
              className={`group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                hasUnread ? "bg-primary/5" : ""
              }`}
            >
              {isAndoxa && (
                <span
                  className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-orange-500"
                  title="Démarré via Andoxa"
                  aria-hidden
                />
              )}
              <div
                className={`min-w-0 flex-1 ${isAndoxa ? "pl-2" : ""}`}
              >
                <div
                  className={`truncate ${hasUnread ? "font-semibold" : "font-medium"}`}
                >
                  {chatLabel(chat)}
                </div>
                {chat.timestamp && (
                  <div className="truncate text-xs text-muted-foreground">
                    {formatTimestamp(chat.timestamp)}
                    {hasUnread && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        {chat.unread_count} non lu(s)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
