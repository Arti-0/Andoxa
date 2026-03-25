'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MessageSquare,
    Loader2,
    Paperclip,
    User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UnipileChat, UnipileMessage } from '@/lib/unipile/types';

export type InboxChannelFilter = 'all' | 'LINKEDIN' | 'WHATSAPP';

interface ChatsApiResponse {
    items?: UnipileChat[];
    cursor?: string | null;
}

interface MessagesApiResponse {
    items?: UnipileMessage[];
    cursor?: string | null;
}

interface MessagingInboxProps {
    focusChatId?: string | null;
    /** Filtre API Unipile (canal) */
    channelFilter?: InboxChannelFilter;
    /** Ne garder que les conversations non liées à un prospect CRM */
    onlyHorsCrm?: boolean;
}

interface AndoxaIdsResponse {
    ids?: string[];
    chatToProspect?: Record<string, string>;
}

export function MessagingInbox({
    focusChatId,
    channelFilter = 'all',
    onlyHorsCrm = false,
}: MessagingInboxProps) {
    const router = useRouter();
    const [chats, setChats] = useState<UnipileChat[]>([]);
    const [chatToProspect, setChatToProspect] = useState<
        Record<string, string>
    >({});
    const [selectedChatId, setSelectedChatId] = useState<string | null>(
        focusChatId ?? null
    );
    const [messages, setMessages] = useState<UnipileMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchChats = useCallback(async () => {
        setLoadingChats(true);
        setError(null);
        try {
            const [chatsRes, idsRes] = await Promise.all([
                fetch(`/api/unipile/chats?channel=${channelFilter}`, {
                    credentials: 'include',
                }),
                fetch('/api/unipile/chats/andoxa-ids', {
                    credentials: 'include',
                }),
            ]);
            const json = await chatsRes.json();
            if (!chatsRes.ok) {
                const msg =
                    json?.error?.message ||
                    'Erreur lors du chargement des conversations';
                setError(msg);
                setChats([]);
                return;
            }
            const data = json?.data ?? json;
            const items =
                (data as ChatsApiResponse)?.items ??
                (Array.isArray(data) ? data : []);
            setChats(Array.isArray(items) ? items : []);

            if (idsRes.ok) {
                const idsData =
                    (await idsRes.json())?.data ?? (await idsRes.json());
                const andoxa = idsData as AndoxaIdsResponse;
                setChatToProspect(andoxa?.chatToProspect ?? {});
            }
        } catch {
            setError(
                'Impossible de charger les conversations. Vérifiez votre connexion.'
            );
            setChats([]);
        } finally {
            setLoadingChats(false);
        }
    }, [channelFilter]);

    const fetchMessages = useCallback(async (chatId: string) => {
        setLoadingMessages(true);
        setError(null);
        try {
            const res = await fetch(`/api/unipile/chats/${chatId}/messages`);
            const json = await res.json();
            if (!res.ok) {
                const msg =
                    json?.error?.message ||
                    'Erreur lors du chargement des messages';
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
            setError('Impossible de charger les messages.');
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    // Sync focus via ?chat= : sélectionner le chat si présent ; activer filtre si chat hors CRM
    useEffect(() => {
        if (!focusChatId || !chats.some((c) => c.id === focusChatId)) return;
        setSelectedChatId(focusChatId);
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
            const res = await fetch(
                `/api/unipile/chats/${selectedChatId}/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: newMessage.trim() }),
                }
            );
            const json = await res.json();
            if (!res.ok) {
                setError(json?.error?.message || "Erreur lors de l'envoi");
                return;
            }
            setNewMessage('');
            await fetchMessages(selectedChatId);
        } catch {
            setError("Impossible d'envoyer le message.");
        } finally {
            setSending(false);
        }
    };

    const chatLabel = (chat: UnipileChat & { interlocutor_name?: string }) =>
        chat.interlocutor_name?.trim() || chat.name?.trim() || 'Conversation';

    const isChatInCrm = (chatId: string) => !!chatToProspect[chatId];

    const displayedChats = onlyHorsCrm
        ? chats.filter((c) => !isChatInCrm(c.id))
        : chats;

    const formatTimestamp = (ts: string | null | undefined) =>
        ts ? new Date(ts).toLocaleString('fr-FR') : '';

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} o`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    const handleAttachmentClick = async (
        messageId: string,
        attachmentId: string,
        fileName: string
    ) => {
        try {
            const res = await fetch(
                `/api/unipile/messages/${messageId}/attachments/${attachmentId}`,
                { credentials: 'include' }
            );
            if (!res.ok) {
                const text = await res.text();
                let msg = "Ce fichier n'est pas disponible au téléchargement.";
                try {
                    const json = JSON.parse(text);
                    if (json?.error?.detail) {
                        msg = json.error.detail;
                    } else if (json?.error && typeof json.error === 'string') {
                        msg = json.error;
                    }
                } catch {
                    // use default msg
                }
                toast.error(msg);
                return;
            }
            const blob = await res.blob();
            const contentType = res.headers.get('Content-Type') || '';
            const contentDisposition =
                res.headers.get('Content-Disposition') || '';
            const match = contentDisposition.match(
                /filename[*]?=["']?([^"';]+)/i
            );
            const suggestedName =
                match?.[1]?.trim() || fileName || 'piece-jointe';

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = suggestedName;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Erreur lors du téléchargement.');
        }
    };

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
        <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Liste des conversations */}
            <div className="flex min-h-0 flex-col rounded-lg border">
                <div className="shrink-0 border-b px-3 py-2">
                    <span className="font-medium text-sm">
                        Conversations
                    </span>
                </div>
                <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-1 p-2">
                        {displayedChats.length === 0 ? (
                            <div className="py-4 text-center text-sm text-muted-foreground">
                                <p>Aucune conversation</p>
                            </div>
                        ) : (
                            displayedChats.map((chat) => {
                                const inCrm = isChatInCrm(chat.id);
                                const channel = (
                                    chat as UnipileChat & { _channel?: string }
                                )._channel;
                                return (
                                    <button
                                        key={chat.id}
                                        type="button"
                                        onClick={() =>
                                            setSelectedChatId(chat.id)
                                        }
                                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                            selectedChatId === chat.id
                                                ? 'bg-primary/10 text-primary ring-1 ring-primary'
                                                : focusChatId === chat.id
                                                  ? 'ring-1 ring-primary/50 bg-primary/5 hover:bg-accent'
                                                  : 'hover:bg-accent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-medium">
                                                {chatLabel(chat)}
                                            </span>
                                            {channel === 'WHATSAPP' && (
                                                <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                                    WA
                                                </span>
                                            )}
                                            {channel === 'LINKEDIN' && (
                                                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                                                    LI
                                                </span>
                                            )}
                                            {!inCrm && (
                                                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                                    Hors CRM
                                                </span>
                                            )}
                                        </div>
                                        {chat.timestamp && (
                                            <div className="truncate text-xs text-muted-foreground">
                                                {formatTimestamp(
                                                    chat.timestamp
                                                )}
                                            </div>
                                        )}
                                        {chat.unread_count > 0 && (
                                            <span className="mt-1 inline-block rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                                {chat.unread_count} non lu(s)
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Messages + envoi */}
            <div className="flex min-h-0 flex-col rounded-lg border lg:col-span-2">
                {selectedChatId ? (
                    <>
                        {(() => {
                            const selChat = chats.find(
                                (c) => c.id === selectedChatId
                            );
                            const prospectId = chatToProspect[selectedChatId];
                            return (
                                <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                                    <span className="truncate font-medium text-sm">
                                        {selChat
                                            ? chatLabel(
                                                  selChat as UnipileChat & {
                                                      interlocutor_name?: string;
                                                  }
                                              )
                                            : 'Conversation'}
                                    </span>
                                    {prospectId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.push(
                                                    `/prospect/${prospectId}`
                                                )
                                            }
                                            className="shrink-0"
                                        >
                                            <User className="mr-1.5 h-4 w-4" />
                                            Profil prospect
                                        </Button>
                                    )}
                                </div>
                            );
                        })()}
                        <ScrollArea className="min-h-0 flex-1 p-4">
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
                                            className={`rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/8 ${
                                                m.is_sender === 1
                                                    ? 'ml-8 bg-orange-100 dark:bg-orange-950/40'
                                                    : 'mr-8 bg-blue-100 dark:bg-blue-950/40'
                                            }`}
                                        >
                                            {m.text && <div>{m.text}</div>}
                                            {m.attachments &&
                                                m.attachments.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {m.attachments.map(
                                                            (a) => {
                                                                const attId =
                                                                    a.id ??
                                                                    (
                                                                        a as {
                                                                            attachment_id?: string;
                                                                        }
                                                                    )
                                                                        .attachment_id;
                                                                const label =
                                                                    a.name ||
                                                                    `Pièce jointe ${a.extension || ''}`.trim() ||
                                                                    'Fichier';
                                                                if (!attId)
                                                                    return null;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            attId
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleAttachmentClick(
                                                                                m.id,
                                                                                attId,
                                                                                label
                                                                            )
                                                                        }
                                                                        className="inline-flex items-center gap-2 rounded border bg-background px-2 py-1.5 text-left text-xs hover:bg-accent"
                                                                    >
                                                                        <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                                                        <span className="truncate max-w-[180px]">
                                                                            {
                                                                                label
                                                                            }
                                                                        </span>
                                                                        {a.size !=
                                                                            null && (
                                                                            <span className="shrink-0 text-muted-foreground">
                                                                                (
                                                                                {formatSize(
                                                                                    a.size
                                                                                )}
                                                                                )
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            }
                                                        )}
                                                    </div>
                                                )}
                                            {!m.text &&
                                                (!m.attachments ||
                                                    m.attachments.length ===
                                                        0) && (
                                                    <div className="italic text-muted-foreground">
                                                        (pièce jointe)
                                                    </div>
                                                )}
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {formatTimestamp(m.timestamp)}
                                                {m.is_sender === 1 && ' · Vous'}
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
                                    if (e.key === 'Enter' && !e.shiftKey) {
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
                            <p className="mt-2 text-sm">
                                Sélectionnez une conversation
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
