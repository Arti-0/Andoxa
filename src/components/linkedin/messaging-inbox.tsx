'use client';

import {
    useState,
    useEffect,
    useCallback,
    useRef,
    type CSSProperties,
} from 'react';
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { useMessagingRealtime } from '@/hooks/use-messaging-realtime';
import { ChatCrmPanel } from '@/components/messagerie/chat-crm-panel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    MessageSquare,
    Loader2,
    Paperclip,
    PanelRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
    UnipileAttachment,
    UnipileChat,
    UnipileMessage,
} from '@/lib/unipile/types';

interface ChatsApiResponse {
    items?: UnipileChat[];
    cursor?: string | null;
}

interface MessagesApiResponse {
    items?: UnipileMessage[];
    cursor?: string | null;
}

/** React Query key for optimistic send + invalidation (messagerie). */
export function unipileChatMessagesQueryKey(chatId: string) {
    return ['unipile', 'chat-messages', chatId] as const;
}

interface MessagingInboxProps {
    focusChatId?: string | null;
    /** Masquer les conversations non liées à un prospect CRM */
    hideHorsCrm?: boolean;
}

interface AndoxaIdsResponse {
    ids?: string[];
    chatToProspect?: Record<string, string>;
}

/** Heure si aujourd'hui, date courte sinon */
function formatChatTimestamp(ts: string | null | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

    if (isToday) {
        return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

/** Timestamp complet pour le fil de messages */
function formatMessageTimestamp(ts: string | null | undefined): string {
    if (!ts) return '';
    return new Date(ts).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function MessagingInbox({
    focusChatId,
    hideHorsCrm = false,
}: MessagingInboxProps) {
    const queryClient = useQueryClient();
    const [chats, setChats] = useState<UnipileChat[]>([]);
    const [chatToProspect, setChatToProspect] = useState<
        Record<string, string>
    >({});
    const [selectedChatId, setSelectedChatId] = useState<string | null>(() => {
        if (focusChatId) return focusChatId;
        if (typeof window !== 'undefined') {
            return localStorage.getItem('andoxa:lastChatId') ?? null;
        }
        return null;
    });
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [crmPanelOpen, setCrmPanelOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollPositions = useRef<Record<string, number>>({});
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const scrollBottomAfterSendRef = useRef(false);
    const scrollBottomAfterRealtimeRef = useRef(false);

    const { lastIncomingChatId, markChatSeen } = useMessagingRealtime();

    const saveScrollPosition = useCallback(() => {
        if (selectedChatId && messagesContainerRef.current) {
            scrollPositions.current[selectedChatId] =
                messagesContainerRef.current.scrollTop;
        }
    }, [selectedChatId]);

    const fetchChats = useCallback(async () => {
        setLoadingChats(true);
        setError(null);
        try {
            const [chatsRes, idsRes] = await Promise.all([
                fetch('/api/unipile/chats?channel=all', {
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
                const idsJson = await idsRes.json();
                const idsData = idsJson?.data ?? idsJson;
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
    }, []);

    const messagesQuery = useQuery({
        queryKey: unipileChatMessagesQueryKey(
            selectedChatId ?? '__no_chat__'
        ),
        queryFn: async () => {
            if (!selectedChatId) return [];
            const res = await fetch(
                `/api/unipile/chats/${selectedChatId}/messages`,
                { credentials: 'include' }
            );
            const json = await res.json();
            if (!res.ok) {
                const msg =
                    json?.error?.message ||
                    'Erreur lors du chargement des messages';
                setError(msg);
                return [];
            }
            const data = json?.data ?? json;
            const items =
                (data as MessagesApiResponse)?.items ??
                (Array.isArray(data) ? data : []);
            return Array.isArray(items) ? items : [];
        },
        enabled: !!selectedChatId,
    });

    const messages = selectedChatId ? (messagesQuery.data ?? []) : [];
    const loadingMessages =
        messagesQuery.isPending && messages.length === 0;

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    useEffect(() => {
        if (lastIncomingChatId && lastIncomingChatId === selectedChatId) {
            scrollBottomAfterRealtimeRef.current = true;
            void queryClient.invalidateQueries({
                queryKey: unipileChatMessagesQueryKey(selectedChatId),
            });
        }
    }, [lastIncomingChatId, selectedChatId, queryClient]);

    useEffect(() => {
        if (selectedChatId) {
            void markChatSeen(selectedChatId);
        }
    }, [selectedChatId, markChatSeen]);

    useEffect(() => {
        if (!focusChatId || !chats.some((c) => c.id === focusChatId)) return;
        setSelectedChatId(focusChatId);
    }, [focusChatId, chats]);

    useEffect(() => {
        setCrmPanelOpen(false);
    }, [selectedChatId]);

    const sendMutation = useMutation({
        mutationFn: async (vars: { chatId: string; text: string }) => {
            const res = await fetch(
                `/api/unipile/chats/${vars.chatId}/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ text: vars.text }),
                }
            );
            const json = await res.json();
            if (!res.ok) {
                throw new Error(
                    json?.error?.message || "Erreur lors de l'envoi"
                );
            }
            return json;
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({
                queryKey: unipileChatMessagesQueryKey(variables.chatId),
            });
            const previous = queryClient.getQueryData<UnipileMessage[]>(
                unipileChatMessagesQueryKey(variables.chatId)
            );
            const nowIso = new Date().toISOString();
            const optimistic: UnipileMessage = {
                id: `temp-${Date.now()}`,
                text: variables.text,
                timestamp: nowIso,
                sender_id: 'local',
                is_sender: 1,
            };
            queryClient.setQueryData<UnipileMessage[]>(
                unipileChatMessagesQueryKey(variables.chatId),
                (old) => [optimistic, ...(old ?? [])]
            );
            scrollBottomAfterSendRef.current = true;
            return { previous };
        },
        onError: (err, variables, context) => {
            if (context?.previous !== undefined) {
                queryClient.setQueryData(
                    unipileChatMessagesQueryKey(variables.chatId),
                    context.previous
                );
            }
            setNewMessage(variables.text);
            setError(err instanceof Error ? err.message : "Erreur d'envoi");
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: unipileChatMessagesQueryKey(variables.chatId),
            });
        },
    });

    useEffect(() => {
        if (loadingMessages || !messagesContainerRef.current) return;
        const container = messagesContainerRef.current;

        if (scrollBottomAfterSendRef.current) {
            scrollBottomAfterSendRef.current = false;
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            });
            return;
        }

        if (scrollBottomAfterRealtimeRef.current) {
            scrollBottomAfterRealtimeRef.current = false;
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            });
            return;
        }

        const savedPos = selectedChatId
            ? scrollPositions.current[selectedChatId]
            : undefined;

        if (savedPos !== undefined && savedPos > 0) {
            container.scrollTop = savedPos;
        } else {
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            });
        }
    }, [messages, selectedChatId, loadingMessages]);

    const handleSend = () => {
        if (!selectedChatId || !newMessage.trim()) return;
        const text = newMessage.trim();
        setNewMessage('');
        setError(null);
        sendMutation.mutate({ chatId: selectedChatId, text });
    };

    const chatLabel = (chat: UnipileChat & { interlocutor_name?: string }) =>
        chat.interlocutor_name?.trim() || chat.name?.trim() || 'Conversation';

    const isChatInCrm = (chatId: string) => !!chatToProspect[chatId];

    const displayedChats = hideHorsCrm
        ? chats.filter((c) => isChatInCrm(c.id))
        : chats;

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

    const selectedChat = selectedChatId
        ? chats.find((c) => c.id === selectedChatId)
        : undefined;
    const selectedChannel = selectedChat
        ? (selectedChat as UnipileChat & { _channel?: string })._channel
        : undefined;

    return (
        <div
            className={cn(
                'relative grid h-full min-h-0 gap-0',
                selectedChatId
                    ? 'grid-cols-1 lg:grid-cols-[minmax(200px,280px)_1fr_240px]'
                    : 'grid-cols-1 lg:grid-cols-[minmax(200px,280px)_1fr]'
            )}
        >
            <div className="flex min-h-0 flex-col rounded-lg border lg:rounded-r-none lg:border-r-0">
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
                                const isSelected = selectedChatId === chat.id;
                                const isFocused = focusChatId === chat.id;
                                const name = chatLabel(
                                    chat as UnipileChat & {
                                        interlocutor_name?: string;
                                    }
                                );
                                const hasUnread =
                                    (chat.unread_count ?? 0) > 0;

                                return (
                                    <button
                                        key={chat.id}
                                        type="button"
                                        onClick={() => {
                                            saveScrollPosition();
                                            setSelectedChatId(chat.id);
                                            localStorage.setItem('andoxa:lastChatId', chat.id);
                                        }}
                                        className={cn(
                                            'w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                                            isSelected
                                                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                                                : isFocused
                                                  ? 'bg-primary/5 ring-1 ring-primary/50 hover:bg-accent'
                                                  : 'hover:bg-accent'
                                        )}
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarImage src={(chat as UnipileChat & { picture_url?: string | null }).picture_url ?? undefined} />
                                                <AvatarFallback className="bg-muted text-xs">
                                                    {name.charAt(0).toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span
                                                className={cn(
                                                    'flex-1 truncate font-medium',
                                                    hasUnread &&
                                                        !isSelected &&
                                                        'font-semibold text-foreground'
                                                )}
                                            >
                                                {name}
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
                                            {chat.timestamp && (
                                                <span className="shrink-0 text-xs text-muted-foreground">
                                                    {formatChatTimestamp(
                                                        chat.timestamp
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            {!inCrm && (
                                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                                    Hors CRM
                                                </span>
                                            )}
                                            {hasUnread && (
                                                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                                    {chat.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>
            </div>

            <div
                className={cn(
                    'flex min-h-0 flex-col border-y border-border bg-card lg:border-x-0',
                    selectedChatId
                        ? 'lg:rounded-none lg:border-r-0'
                        : 'rounded-lg border lg:rounded-l-none'
                )}
            >
                {selectedChatId ? (
                    <>
                        {(() => {
                            const selChat = chats.find(
                                (c) => c.id === selectedChatId
                            );
                            return (
                                <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
                                    <span className="min-w-0 flex-1 truncate font-medium text-sm">
                                        {selChat
                                            ? chatLabel(
                                                  selChat as UnipileChat & {
                                                      interlocutor_name?: string;
                                                  }
                                              )
                                            : 'Conversation'}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 lg:hidden"
                                        aria-label="Ouvrir le panneau CRM"
                                        onClick={() =>
                                            setCrmPanelOpen((v) => !v)
                                        }
                                    >
                                        <PanelRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })()}
                        <div
                            ref={messagesContainerRef}
                            className="min-h-0 flex-1 overflow-y-auto p-4"
                            onScroll={() => {
                                if (
                                    selectedChatId &&
                                    messagesContainerRef.current
                                ) {
                                    scrollPositions.current[selectedChatId] =
                                        messagesContainerRef.current.scrollTop;
                                }
                            }}
                        >
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
                                                            (a: UnipileAttachment) => {
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
                                                                        <span className="max-w-[180px] truncate">
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
                                                {formatMessageTimestamp(
                                                    m.timestamp
                                                )}
                                                {m.is_sender === 1 && ' · Vous'}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        <div className="flex items-end gap-2 border-t p-3">
                            <Textarea
                                placeholder="Votre message... (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
                                value={newMessage}
                                onChange={(e) =>
                                    setNewMessage(e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (
                                            !sendMutation.isPending &&
                                            newMessage.trim()
                                        ) {
                                            handleSend();
                                        }
                                    }
                                }}
                                disabled={sendMutation.isPending}
                                rows={1}
                                className="max-h-32 min-h-[38px] resize-none font-sans text-sm"
                                style={
                                    {
                                        fieldSizing: 'content',
                                    } as CSSProperties
                                }
                            />
                            <Button
                                type="button"
                                onClick={() => handleSend()}
                                disabled={
                                    sendMutation.isPending ||
                                    !newMessage.trim()
                                }
                                size="icon"
                                className="shrink-0"
                            >
                                {sendMutation.isPending ? (
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

            {selectedChatId && crmPanelOpen && (
                <button
                    type="button"
                    aria-label="Fermer le panneau CRM"
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() => setCrmPanelOpen(false)}
                />
            )}

            {selectedChatId && (
                <div
                    className={cn(
                        'flex min-h-0 flex-col border-t bg-card transition-transform duration-200 ease-out lg:max-w-[240px] lg:w-full lg:translate-x-0 lg:border-l lg:border-t-0',
                        'max-lg:fixed max-lg:bottom-0 max-lg:right-0 max-lg:top-0 max-lg:z-50 max-lg:w-[min(100vw,280px)] max-lg:border-l max-lg:shadow-xl',
                        crmPanelOpen
                            ? 'max-lg:translate-x-0'
                            : 'max-lg:pointer-events-none max-lg:translate-x-full'
                    )}
                >
                    <ChatCrmPanel
                        chatId={selectedChatId}
                        prospectId={
                            chatToProspect[selectedChatId] ?? null
                        }
                        chatChannel={selectedChannel ?? null}
                        onCloseMobile={() => setCrmPanelOpen(false)}
                        onLinked={(chatId, prospectId) => {
                            setChatToProspect((prev) => ({
                                ...prev,
                                [chatId]: prospectId,
                            }));
                        }}
                    />
                </div>
            )}
        </div>
    );
}
