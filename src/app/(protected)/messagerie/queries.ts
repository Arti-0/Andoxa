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
import { PROSPECT_STATUS_LABELS } from "@/lib/types/prospects";
import { createClient } from "@/lib/supabase/client";
import {
  accountTypeToChannel,
  buildThreadEntries,
  formatChatTimestamp,
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
  prospect: (id: string) => [...messagerieKeys.all, "prospect", id] as const,
  prospectActivity: (id: string) =>
    [...messagerieKeys.all, "prospect-activity", id] as const,
  thread: (chatId: string) =>
    [...messagerieKeys.all, "thread", chatId] as const,
  templates: () => [...messagerieKeys.all, "templates"] as const,
};

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

interface AndoxaIdsPayload {
  ids?: string[];
  chatToProspect?: Record<string, string>;
}

interface ChatsPayload {
  items?: UnipileChat[];
  cursor?: string | null;
}

async function fetchChats(): Promise<UnipileChat[]> {
  const data = await getJson<ChatsPayload | UnipileChat[]>(
    "/api/unipile/chats?channel=all",
  );
  if (Array.isArray(data)) return data;
  return data.items ?? [];
}

async function fetchChatToProspect(): Promise<Record<string, string>> {
  const data = await getJson<AndoxaIdsPayload>("/api/unipile/chats/andoxa-ids");
  return data.chatToProspect ?? {};
}

// Batch-fetch prospects by IDs through the prospect API. The list endpoint
// doesn't accept an `ids` filter, so we issue one request per ID via React
// Query's per-key cache — the heavy lifting is amortized on subsequent renders.
//
// In production, if the list grows large we should add `?ids=` server-side.
async function fetchProspects(ids: string[]): Promise<Map<string, Prospect>> {
  const out = new Map<string, Prospect>();
  if (ids.length === 0) return out;
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const p = await getJson<Prospect>(`/api/prospects/${id}`);
        return [id, p] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );
  for (const [id, p] of results) if (p) out.set(id, p);
  return out;
}

function mergeConversations(
  chats: UnipileChat[],
  chatToProspect: Record<string, string>,
  prospects: Map<string, Prospect>,
): Conversation[] {
  return chats
    .map((c) => {
      const prospectId = chatToProspect[c.id] ?? null;
      const p = prospectId ? (prospects.get(prospectId) ?? null) : null;
      // Hide conversations that have no linked prospect (hors CRM)
      if (!prospectId) return null;
      const name = p?.full_name?.trim() || c.name?.trim() || "Inconnu";
      const enrichedPicture =
        (p?.enrichment_metadata as { profile_picture_url?: string | null } | undefined)
          ?.profile_picture_url ?? null;
      return {
        id: c.id,
        prospectId,
        name,
        role: p?.job_title ?? null,
        company: p?.company ?? null,
        linkedinUrl: p?.linkedin ?? null,
        channel: accountTypeToChannel(c.account_type),
        stage: statusToStage(p?.status),
        lastTime: formatChatTimestamp(c.timestamp),
        unread: c.unread_count ?? 0,
        silentDays: silentDaysFrom(c.timestamp),
        // Prefer enriched profile picture; fall back to Unipile attendee picture.
        pictureUrl: enrichedPicture ?? c.picture_url ?? null,
      };
    })
    .filter((c): c is Conversation => c !== null);
}

export function useConversations(): UseQueryResult<Conversation[]> {
  const qc = useQueryClient();

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
      const [chats, chatToProspect] = await Promise.all([
        fetchChats(),
        fetchChatToProspect(),
      ]);
      const prospectIds = [...new Set(Object.values(chatToProspect))];
      const prospects = await fetchProspects(prospectIds);
      // Hydrate per-prospect cache so cockpit reads are instant when a row is selected.
      for (const [id, p] of prospects) {
        qc.setQueryData(messagerieKeys.prospect(id), p);
      }
      return mergeConversations(chats, chatToProspect, prospects);
    },
    staleTime: FIVE_MIN,
    placeholderData: (prev) => prev,
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
    mutationFn: async (vars: { chatId: string; text: string }) => {
      const res = await fetch(`/api/unipile/chats/${vars.chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: vars.text }),
      });
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
function translateStatusValues(text: string): string {
  return text.replace(
    /\b(new|contacted|qualified|rdv|proposal|won|lost)\b/g,
    (match) =>
      PROSPECT_STATUS_LABELS[match as keyof typeof PROSPECT_STATUS_LABELS] ??
      match,
  );
}

function activityToTimeline(rows: ActivityRow[]): TimelineEvent[] {
  return rows
    .map((r): TimelineEvent | null => {
      const date = new Date(r.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
      // Use the description field; the design's "kind" maps to an icon only.
      if (r.action === "status_change") {
        return { kind: "reply", label: translateStatusValues(r.description), date };
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
      return (data.items ?? []).map(
        (t): QuickTemplate => ({
          id: t.id,
          name: t.name,
          channel: backendChannelToDesign(t.channel),
          content: t.content,
        }),
      );
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
