"use client";

// React Query hooks for messagerie, wired to real backend.
// Stable cache keys, generous staleTime, placeholderData = (prev) => prev so
// the UI never flashes through an empty state once cache is warm.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { useMessagingRealtime } from "@/hooks/use-messaging-realtime";
import type { UnipileChat, UnipileMessage } from "@/lib/unipile/types";
import type { Prospect } from "@/lib/types/prospects";
import { createClient } from "@/lib/supabase/client";
import { resolveAvatarPhoto } from "@/components/crm/crm-shared";
import { toast } from "@/lib/toast";
import {
  accountTypeToChannel,
  buildThreadEntries,
  formatChatTimestamp,
  parseTemplateCategory,
  resolveVars,
  silentDaysFrom,
  statusToStage,
  type Conversation,
  type QuickTemplate,
  type ThreadEntry,
  type TimelineEvent,
} from "./data";

const FIVE_MIN = 5 * 60 * 1000;

export const messagerieKeys = {
  all: ["messagerie"] as const,
  chats: () => [...messagerieKeys.all, "chats"] as const,
  andoxaIds: () => [...messagerieKeys.all, "andoxa-ids"] as const,
  connections: () => [...messagerieKeys.all, "connections"] as const,
  prospect: (id: string) => [...messagerieKeys.all, "prospect", id] as const,
  prospectActivity: (id: string) =>
    [...messagerieKeys.all, "prospect-activity", id] as const,
  thread: (chatId: string) =>
    [...messagerieKeys.all, "thread", chatId] as const,
  templates: () => [...messagerieKeys.all, "templates"] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Unipile connection status — used to gate the messagerie page on whether the
// user has connected a LinkedIn or WhatsApp account. /api/unipile/me also
// validates the account against Unipile and clears stale local rows.
// ─────────────────────────────────────────────────────────────────────────────

interface UnipileMePayload {
  connected: boolean;
  whatsapp_connected: boolean;
}

export interface UnipileConnections {
  linkedinConnected: boolean;
  whatsappConnected: boolean;
  anyConnected: boolean;
}

export function useUnipileConnections(): UseQueryResult<UnipileConnections> {
  return useQuery({
    queryKey: messagerieKeys.connections(),
    queryFn: async () => {
      const data = await getJson<UnipileMePayload>("/api/unipile/me");
      return {
        linkedinConnected: !!data.connected,
        whatsappConnected: !!data.whatsapp_connected,
        anyConnected: !!data.connected || !!data.whatsapp_connected,
      };
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch helpers — extract `data` envelope used by createApiHandler responses.
// ─────────────────────────────────────────────────────────────────────────────

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg =
      (j as { error?: { message?: string } })?.error?.message ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const json = await res.json();
  return (json?.data ?? json) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversations list
// Composes: chats (Unipile) + andoxa-ids (chat ↔ prospect map) + prospects.
// ─────────────────────────────────────────────────────────────────────────────

interface PendingAcceptedProspect {
  prospect_id: string;
  provider_id: string;
  account_id: string;
  accepted_at: string;
}

interface AndoxaIdsPayload {
  ids?: string[];
  chatToProspect?: Record<string, string>;
  /** Accepted invitations with no chat yet — rendered as "à contacter" rows. */
  pendingProspects?: PendingAcceptedProspect[];
}

interface ChatsPayload {
  items?: UnipileChat[];
  cursor?: string | null;
}

async function fetchChats(): Promise<UnipileChat[]> {
  const data = await getJson<ChatsPayload | UnipileChat[]>(
    "/api/unipile/chats?channel=all&limit=120",
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

async function fetchAndoxaIds(): Promise<{
  chatToProspect: Record<string, string>;
  pendingProspects: PendingAcceptedProspect[];
}> {
  const data = await getJson<AndoxaIdsPayload>("/api/unipile/chats/andoxa-ids");
  return {
    chatToProspect: data.chatToProspect ?? {},
    pendingProspects: data.pendingProspects ?? [],
  };
}

// Batch-fetch prospects by IDs in a single round-trip via the `ids=` bulk
// short-circuit on /api/prospects. Replaced the previous N x /api/prospects/[id]
// fan-out which dominated first-paint for the messagerie (one Supabase-auth +
// enrichProspects pass per chat row).
async function fetchProspects(ids: string[]): Promise<Map<string, Prospect>> {
  const out = new Map<string, Prospect>();
  if (ids.length === 0) return out;
  try {
    const data = await getJson<{ items: Prospect[] }>(
      `/api/prospects?ids=${encodeURIComponent(ids.join(","))}`,
    );
    for (const p of data.items ?? []) {
      if (p?.id) out.set(p.id, p);
    }
  } catch {
    // Best-effort: a failure leaves the messagerie rows partially-populated
    // (interlocutor_name still resolves via the chat enrichment cache).
  }
  return out;
}

function mergeConversations(
  chats: UnipileChat[],
  chatToProspect: Record<string, string>,
  prospects: Map<string, Prospect>,
): Conversation[] {
  const rows = chats.flatMap<Conversation>((c) => {
    const prospectId = chatToProspect[c.id] ?? null;
    // Surface every chat — including ones that aren't yet linked to a CRM
    // prospect. Without this, conversations started outside an Andoxa
    // campaign (manual messages on LinkedIn, fresh inbound from a stranger)
    // never appear in messagerie even though they exist on Unipile.
    // Conversation.prospectId is nullable; the cockpit panel renders a
    // "hors CRM" affordance when missing.
    const p = prospectId ? (prospects.get(prospectId) ?? null) : null;
    // /api/unipile/chats enriches every chat with `interlocutor_name` from
    // the Unipile attendees lookup (cached 24h). For unlinked chats this is
    // typically the only place we have a real name — c.name is often null
    // for direct LinkedIn DMs.
    const interlocutor = (c as { interlocutor_name?: string | null })
      .interlocutor_name;
    const name =
      p?.full_name?.trim() ||
      interlocutor?.trim() ||
      c.name?.trim() ||
      "Inconnu";
    const enrichedPicture =
      (p?.enrichment_metadata as { profile_picture_url?: string | null } | undefined)
        ?.profile_picture_url ?? null;
    const pinnedRaw = (c as { pinned_at?: string | null }).pinned_at;
    return [{
      id: c.id,
      prospectId,
      name,
      role: p?.job_title ?? null,
      company: p?.company ?? null,
      linkedinUrl: p?.linkedin ?? null,
      phone: p?.phone ?? null,
      email: p?.email ?? null,
      channel: accountTypeToChannel(c.account_type),
      stage: statusToStage(p?.status),
      lastTime: formatChatTimestamp(c.timestamp),
      lastMessageAt: c.timestamp,
      pinnedAt:
        typeof pinnedRaw === "string" && pinnedRaw.trim().length > 0
          ? pinnedRaw
          : null,
      unread: c.unread_count ?? 0,
      silentDays: silentDaysFrom(c.timestamp),
      // Prefer enriched profile picture; fall back to the Unipile attendee
      // picture. Filter LinkedIn ghost/placeholder URLs (they load fine but
      // render a grey silhouette) so those fall back to coloured initials.
      pictureUrl:
        resolveAvatarPhoto(enrichedPicture) ??
        resolveAvatarPhoto(c.picture_url ?? null) ??
        null,
    }];
  });

  rows.sort((a, b) => {
    const ap = a.pinnedAt ? 1 : 0;
    const bp = b.pinnedAt ? 1 : 0;
    if (ap !== bp) return bp - ap;
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });
  return rows;
}

/** Synthetic conversation rows for accepted invitations without a chat: the
 *  prospect is now 1st-degree and ready to talk, but no Unipile chat exists
 *  yet. The first send (POST /api/unipile/chats/start) creates the chat and
 *  swaps the row for the real conversation on the next list refresh. */
function buildPendingConversations(
  pendings: PendingAcceptedProspect[],
  prospects: Map<string, Prospect>,
): Conversation[] {
  return pendings.flatMap<Conversation>((pp) => {
    const p = prospects.get(pp.prospect_id);
    // No readable prospect row (deleted, or other-user RLS) — skip.
    if (!p) return [];
    const enrichedPicture =
      (p.enrichment_metadata as { profile_picture_url?: string | null } | undefined)
        ?.profile_picture_url ?? null;
    return [{
      id: `pending:${pp.prospect_id}`,
      prospectId: pp.prospect_id,
      name: p.full_name?.trim() || "Inconnu",
      role: p.job_title ?? null,
      company: p.company ?? null,
      linkedinUrl: p.linkedin ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      channel: "li" as const,
      stage: statusToStage(p.status),
      lastTime: formatChatTimestamp(pp.accepted_at),
      lastMessageAt: pp.accepted_at,
      pinnedAt: null,
      unread: 0,
      silentDays: silentDaysFrom(pp.accepted_at),
      pictureUrl: resolveAvatarPhoto(enrichedPicture),
      pending: true,
      providerId: pp.provider_id,
      accountId: pp.account_id,
    }];
  });
}

export function useToggleChatPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { chatId: string; pinned: boolean }) => {
      const res = await fetch(
        `/api/unipile/chats/${encodeURIComponent(vars.chatId)}/pin`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pinned: vars.pinned }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          (j as { error?: { message?: string } })?.error?.message ??
          `HTTP ${res.status}`;
        throw new Error(msg);
      }
    },
    // Optimistic + instant: flip the pin in cache immediately and re-sort, so
    // the row jumps without waiting on the round-trip. No success toast (the
    // visual state change is the feedback).
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: messagerieKeys.chats() });
      const previous = qc.getQueryData<Conversation[]>(messagerieKeys.chats());
      qc.setQueryData<Conversation[]>(messagerieKeys.chats(), (prev) => {
        if (!prev) return prev;
        const nowIso = new Date().toISOString();
        const next = prev.map((c) =>
          c.id === vars.chatId
            ? { ...c, pinnedAt: vars.pinned ? nowIso : null }
            : c,
        );
        next.sort((a, b) => {
          const ap = a.pinnedAt ? 1 : 0;
          const bp = b.pinnedAt ? 1 : 0;
          if (ap !== bp) return bp - ap;
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
        return next;
      });
      return { previous };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(messagerieKeys.chats(), ctx.previous);
      toast.error(e.message);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: messagerieKeys.chats() });
    },
  });
}

export function useConversations(
  options: { enabled?: boolean } = {},
): UseQueryResult<Conversation[]> {
  const qc = useQueryClient();
  const enabled = options.enabled ?? true;

  // Realtime: when a new inbox event arrives, refresh the chats list so unread
  // counts and ordering stay accurate. Per-thread invalidation lives in
  // useThread below.
  const { lastIncomingChatId } = useMessagingRealtime();
  useEffect(() => {
    if (lastIncomingChatId) {
      void qc.invalidateQueries({ queryKey: messagerieKeys.chats() });
    }
  }, [lastIncomingChatId, qc]);

  return useQuery({
    queryKey: messagerieKeys.chats(),
    queryFn: async () => {
      const [chats, { chatToProspect, pendingProspects }] = await Promise.all([
        fetchChats(),
        fetchAndoxaIds(),
      ]);
      const prospectIds = [
        ...new Set([
          ...Object.values(chatToProspect),
          ...pendingProspects.map((pp) => pp.prospect_id),
        ]),
      ];
      const prospects = await fetchProspects(prospectIds);
      // Hydrate per-prospect cache so cockpit reads are instant when a row is selected.
      for (const [id, p] of prospects) {
        qc.setQueryData(messagerieKeys.prospect(id), p);
      }
      const rows = mergeConversations(chats, chatToProspect, prospects);
      // Accepted-but-chatless prospects ride on top of the merged list; the
      // shared sort (pinned, then recency) interleaves them by acceptance date.
      const pendingRows = buildPendingConversations(pendingProspects, prospects);
      if (pendingRows.length === 0) return rows;
      const merged = [...rows, ...pendingRows];
      merged.sort((a, b) => {
        const ap = a.pinnedAt ? 1 : 0;
        const bp = b.pinnedAt ? 1 : 0;
        if (ap !== bp) return bp - ap;
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });
      return merged;
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
    enabled,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Thread (messages for one chat)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchMessages(chatId: string): Promise<UnipileMessage[]> {
  const data = await getJson<{ items?: UnipileMessage[] } | UnipileMessage[]>(
    `/api/unipile/chats/${chatId}/messages`,
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

export function useThread(
  chatId: string | null,
): UseQueryResult<ThreadEntry[]> {
  const qc = useQueryClient();
  const { lastIncomingChatId } = useMessagingRealtime();

  useEffect(() => {
    if (chatId && lastIncomingChatId === chatId) {
      void qc.invalidateQueries({ queryKey: messagerieKeys.thread(chatId) });
    }
  }, [chatId, lastIncomingChatId, qc]);

  return useQuery({
    queryKey: messagerieKeys.thread(chatId ?? "__none__"),
    queryFn: async () => {
      if (!chatId) return [];
      // Synthetic accepted-invitation rows have no Unipile chat yet — the
      // thread is empty until the first send creates it.
      if (chatId.startsWith("pending:")) return [];
      const messages = await fetchMessages(chatId);
      return buildThreadEntries(messages);
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
    enabled: !!chatId,
  });
}

// Send a message — optimistic, with rollback on error. The send endpoint
// returns the persisted message; on success we invalidate the thread so the
// real timestamp / id replace our optimistic one.
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { chatId: string; text: string; file?: File | null }) => {
      // First message to an accepted-but-chatless prospect: /chats/start
      // opens the LinkedIn thread and links it to the prospect in one call.
      if (vars.chatId.startsWith("pending:")) {
        if (vars.file) {
          throw new Error(
            "Envoyez d'abord un premier message texte, la pièce jointe pourra suivre.",
          );
        }
        const prospectId = vars.chatId.slice("pending:".length);
        const conv = qc
          .getQueryData<Conversation[]>(messagerieKeys.chats())
          ?.find((c) => c.id === vars.chatId);
        if (!conv?.providerId || !conv?.accountId) {
          throw new Error("Conversation introuvable, rechargez la page");
        }
        const res = await fetch("/api/unipile/chats/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            prospect_id: prospectId,
            provider_id: conv.providerId,
            account_id: conv.accountId,
            text: vars.text,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (json as { error?: { message?: string } })?.error?.message ||
              "Erreur lors de l'envoi",
          );
        }
        return json;
      }
      const url = `/api/unipile/chats/${vars.chatId}/messages`;
      let res: Response;
      if (vars.file) {
        // Avec pièce jointe : multipart/form-data (le navigateur pose la
        // boundary tout seul, on ne définit PAS Content-Type manuellement).
        const fd = new FormData();
        if (vars.text) fd.append("text", vars.text);
        fd.append("attachments", vars.file, vars.file.name);
        res = await fetch(url, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      } else {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: vars.text }),
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (json as { error?: { message?: string } })?.error?.message ||
            "Erreur lors de l'envoi",
        );
      }
      return json;
    },
    onMutate: async (vars) => {
      const key = messagerieKeys.thread(vars.chatId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ThreadEntry[]>(key);
      const now = new Date();
      const optimistic: ThreadEntry = {
        kind: "msg",
        dir: "out",
        time: now.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: vars.text,
        hasAttachments: !!vars.file,
      };
      qc.setQueryData<ThreadEntry[]>(key, (prev = []) => [...prev, optimistic]);
      return { previous };
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(messagerieKeys.thread(vars.chatId), ctx.previous);
      }
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: messagerieKeys.thread(vars.chatId) });
      void qc.invalidateQueries({ queryKey: messagerieKeys.chats() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prospect (cockpit identity + activity timeline)
// ─────────────────────────────────────────────────────────────────────────────

export function useProspect(prospectId: string | null) {
  return useQuery({
    queryKey: messagerieKeys.prospect(prospectId ?? "__none__"),
    queryFn: async () => {
      if (!prospectId) return null;
      return await getJson<Prospect>(`/api/prospects/${prospectId}`);
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
    enabled: !!prospectId,
  });
}

// Map prospect_activity rows → design TimelineEvent[].
// Action types come from src/app/api/prospects/[id]/activity/route.ts.
interface ActivityRow {
  id: string;
  action: string;
  created_at: string;
  title: string;
  description: string;
}

// Replace raw DB status values with their French labels inside a description string.
// translateStatusValues used to map raw DB status keys ("new", "qualified"…)
// to French labels inside activity description strings. That substitution
// now happens server-side in /api/prospects/[id]/activity using per-org
// status names — so the description we receive already reads "Nouveau →
// Contacté". No client-side replace needed.

function activityToTimeline(rows: ActivityRow[]): TimelineEvent[] {
  return rows
    .map((r): TimelineEvent | null => {
      const date = new Date(r.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
      // Use the description field; the design's "kind" maps to an icon only.
      if (r.action === "status_change") {
        return { kind: "reply", label: r.description, date };
      }
      if (
        r.action === "workflow_step_completed" &&
        r.description.includes("Invitation")
      ) {
        return { kind: "invite", label: r.description, date };
      }
      if (
        r.action === "workflow_step_completed" &&
        (r.description.includes("LinkedIn") ||
          r.description.includes("WhatsApp"))
      ) {
        return { kind: "reply", label: r.description, date };
      }
      if (r.action === "workflow_enrolled") {
        return { kind: "invite", label: r.description, date };
      }
      // Skip unmapped types — they'd add noise to the cockpit's "Activité clé".
      return null;
    })
    .filter((x): x is TimelineEvent => x !== null);
}

export function useProspectTimeline(
  prospectId: string | null,
): UseQueryResult<TimelineEvent[]> {
  return useQuery({
    queryKey: messagerieKeys.prospectActivity(prospectId ?? "__none__"),
    queryFn: async () => {
      if (!prospectId) return [];
      const data = await getJson<{ items?: ActivityRow[] }>(
        `/api/prospects/${prospectId}/activity?limit=20`,
      );
      return activityToTimeline(data.items ?? []).slice(0, 5);
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
    enabled: !!prospectId,
  });
}

// Update prospect status (used by the cockpit + thread context menu).
export function useUpdateProspectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { prospectId: string; status: string }) => {
      const res = await fetch(`/api/prospects/${vars.prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: vars.status }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: messagerieKeys.prospect(vars.prospectId),
      });
      void qc.invalidateQueries({
        queryKey: messagerieKeys.prospectActivity(vars.prospectId),
      });
      void qc.invalidateQueries({ queryKey: messagerieKeys.chats() });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates (quick-insert, used by the composer modal)
// ─────────────────────────────────────────────────────────────────────────────

interface TemplatePayload {
  id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "email";
  /** Joined category row (preferred) or legacy enum string. */
  category?:
    | { id: string; name: string; sort_order: number }
    | string
    | null;
  /** Foreign key — populated after migration 20260517150000_*. */
  category_id?: string | null;
  content: string;
}

function backendChannelToDesign(
  ch: TemplatePayload["channel"],
): "li" | "wa" | "both" {
  if (ch === "linkedin") return "li";
  if (ch === "whatsapp") return "wa";
  return "both"; // email templates aren't surfaced in messagerie — tag as "both" to keep them visible
}

export function useTemplates(): UseQueryResult<QuickTemplate[]> {
  return useQuery({
    queryKey: messagerieKeys.templates(),
    queryFn: async () => {
      const data = await getJson<{ items?: TemplatePayload[] }>(
        "/api/message-templates",
      );
      return (data.items ?? []).map((t): QuickTemplate => {
        const joined =
          typeof t.category === "object" && t.category !== null
            ? t.category
            : null;
        const legacyEnum = typeof t.category === "string" ? t.category : null;
        // tag[0] is what the QuickInsertModal filter compares against — prefer
        // the dynamic category UUID when present so per-org categories work.
        const tagId = t.category_id ?? joined?.id ?? legacyEnum ?? undefined;
        return {
          id: t.id,
          name: t.name,
          channel: backendChannelToDesign(t.channel),
          category: parseTemplateCategory(legacyEnum),
          tags: tagId ? [tagId] : undefined,
          content: t.content,
        };
      });
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark a chat as seen / unseen (updates inbox_events via Supabase RPC)
// ─────────────────────────────────────────────────────────────────────────────

export function useMarkChatSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      const supabase = createClient();
      await supabase.rpc("mark_chat_inbox_seen", { p_chat_id: chatId });
    },
    onMutate: async (chatId) => {
      // Optimistically zero the unread badge without waiting for the next fetch.
      qc.setQueryData<Conversation[]>(messagerieKeys.chats(), (prev) =>
        prev?.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
      );
    },
  });
}

export function useMarkChatUnread() {
  const qc = useQueryClient();
  return useMutation({
    // No Unipile endpoint for forcing unread — optimistic only; resets on next
    // cache invalidation or page reload.
    mutationFn: async (_chatId: string) => {},
    onMutate: async (chatId) => {
      qc.setQueryData<Conversation[]>(messagerieKeys.chats(), (prev) =>
        prev?.map((c) => (c.id === chatId ? { ...c, unread: Math.max(c.unread, 1) } : c)),
      );
    },
  });
}

// Re-exported for convenience so components don't need a second import.
export { resolveVars };
