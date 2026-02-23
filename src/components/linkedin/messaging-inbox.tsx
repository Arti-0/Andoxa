"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Loader2 } from "lucide-react";
import type { UnipileChat, UnipileMessage } from "@/lib/unipile/types";

interface ChatsApiResponse {
  items?: UnipileChat[];
  cursor?: string | null;
}

interface MessagesApiResponse {
  items?: UnipileMessage[];
  cursor?: string | null;
}

interface MessagingInboxProps {
  /** Chat à mettre en focus (ex. depuis ?chat=xxx) */
  focusChatId?: string | null;
}

export function MessagingInbox({ focusChatId }: MessagingInboxProps) {
  const [chats, setChats] = useState<UnipileChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    focusChatId ?? null
  );
  const [messages, setMessages] = useState<UnipileMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    setError(null);
    try {
      const res = await fetch("/api/unipile/chats?account_type=LINKEDIN");
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.error?.message || "Erreur lors du chargement des conversations";
        setError(msg);
        setChats([]);
        return;
      }
      const data = json?.data ?? json;
      const items =
        (data as ChatsApiResponse)?.items ??
        (Array.isArray(data) ? data : []);
      setChats(Array.isArray(items) ? items : []);
    } catch {
      setError(
        "Impossible de charger les conversations. Vérifiez la configuration Unipile."
      );
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const fetchMessages = useCallback(async (chatId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/unipile/chats/${chatId}/messages`);
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.error?.message || "Erreur lors du chargement des messages";
        setError(msg);
        setMessages([]);
        return;
      }
      const data = json?.data ?? json;
      const items =
        (data as MessagesApiResponse)?.items ??
        (Array.isArray(data) ? data : []);
      setMessages(Array.isArray(items) ? items : []);
    } catch {
      setError("Impossible de charger les messages.");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Sync focus via ?chat= : sélectionner le chat si présent dans la liste
  useEffect(() => {
    if (focusChatId && chats.some((c) => c.id === focusChatId)) {
      setSelectedChatId(focusChatId);
    }
  }, [focusChatId, chats]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId, fetchMessages]);

  const handleSend = async () => {
    if (!selectedChatId || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/unipile/chats/${selectedChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Erreur lors de l'envoi");
        return;
      }
      setNewMessage("");
      await fetchMessages(selectedChatId);
    } catch {
      setError("Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  const chatLabel = (chat: UnipileChat) =>
    chat.name?.trim() || `Conversation ${chat.id.slice(0, 8)}`;

  const formatTimestamp = (ts: string | null | undefined) =>
    ts ? new Date(ts).toLocaleString("fr-FR") : "";

  if (loadingChats) {
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Liste des conversations */}
      <div className="rounded-lg border">
        <div className="border-b px-3 py-2 font-medium text-sm">
          Conversations
        </div>
        <ScrollArea className="h-[280px]">
          <div className="space-y-1 p-2">
            {chats.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucune conversation
              </p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedChatId === chat.id
                      ? "bg-primary/10 text-primary ring-1 ring-primary"
                      : focusChatId === chat.id
                        ? "ring-1 ring-primary/50 bg-primary/5 hover:bg-accent"
                        : "hover:bg-accent"
                  }`}
                >
                  <div className="truncate font-medium">{chatLabel(chat)}</div>
                  {chat.timestamp && (
                    <div className="truncate text-xs text-muted-foreground">
                      {formatTimestamp(chat.timestamp)}
                    </div>
                  )}
                  {chat.unread_count > 0 && (
                    <span className="mt-1 inline-block rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {chat.unread_count} non lu(s)
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Messages + envoi */}
      <div className="flex flex-col rounded-lg border lg:col-span-2">
        {selectedChatId ? (
          <>
            <ScrollArea className="min-h-[200px] max-h-[280px] flex-1 p-4">
              <div className="space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Aucun message
                  </p>
                ) : (
                  [...messages].reverse().map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        m.is_sender === 1
                          ? "ml-8 bg-primary/10"
                          : "mr-8 bg-muted/50"
                      }`}
                    >
                      <div>{m.text ?? "(pièce jointe)"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatTimestamp(m.timestamp)}
                        {m.is_sender === 1 && " · Vous"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2 border-t p-3">
              <Input
                placeholder="Votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="mx-auto h-10 w-10 opacity-50" />
              <p className="mt-2 text-sm">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
