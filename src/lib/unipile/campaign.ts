/**
 * Unipile Campaign utilities – variable replacement, LinkedIn slug extraction,
 * WhatsApp send helper.
 */

import { unipileFetch } from "./client";

export type {
  MessageVariablesContext,
  ProspectForVariables,
} from "@/lib/messaging/template-variables";
export {
  applyImportMetadataVariables,
  applyMessageVariables,
  normalizeTemplateSyntax,
} from "@/lib/messaging/template-variables";

/**
 * Extract LinkedIn profile slug from URL (e.g. "john-doe" from linkedin.com/in/john-doe)
 */
export function extractLinkedInSlug(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/linkedin\.com\/in\/([^/?#]+)/i);
    return match?.[1]?.replace(/\/$/, "") ?? null;
  } catch {
    const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
    return match?.[1]?.replace(/\/$/, "") ?? null;
  }
}

export function whatsappJid(normalizedPhone: string): string {
  const clean = normalizedPhone.trim();
  return clean.includes("@") ? clean : `${clean}@s.whatsapp.net`;
}

/** Normalize outbound WA text so https:// URLs autolink in the WhatsApp client. */
export function prepareWhatsAppOutboundText(text: string): string {
  let out = text.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ");

  // Join URLs broken across lines (common when CONFERENCE_WHATSAPP_MESSAGE wraps in .env).
  for (let i = 0; i < 4; i++) {
    const next = out.replace(
      /(https?:\/\/[^\s\n]*)\s*\n\s*([^\s\n]+)/gi,
      "$1$2"
    );
    if (next === out) break;
    out = next;
  }

  out = out.replace(/https?:\/\/[^\s\u200B]+/gi, (url) => {
    let cleaned = url;
    while (/[.,;:!?»»\u2019'"]$/.test(cleaned)) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  });

  return out;
}

/**
 * Open (or reuse) a LinkedIn chat and post a message via Unipile `/chats`.
 *
 * Without an attachment this sends the same JSON body the campaign worker has
 * always used. With one, it switches to multipart/form-data so the file rides
 * along — Unipile expects `attachments` as a file part, mirroring the inbox
 * send route. The attachment blob is downloaded by the caller
 * (downloadCampaignAttachment) so this helper stays free of storage concerns.
 */
/** Unipile `/chats` (start new chat) returns the new conversation id under
 *  `chat_id` (with `object: "ChatStarted"`), not `id`. Normalize to `{ id }` so
 *  callers can upsert `unipile_chat_prospects` at send time. We keep an `id`
 *  fallback in case the field name varies across Unipile API versions. */
type ChatStartResponse = { chat_id?: string; id?: string };
function normalizeChatStart(res: ChatStartResponse): { id?: string } {
  return { id: res.chat_id ?? res.id };
}

export async function sendLinkedInChatMessage(opts: {
  accountId: string;
  providerId: string;
  text: string;
  attachment?: { blob: Blob; name: string } | null;
}): Promise<{ id?: string }> {
  if (opts.attachment) {
    const form = new FormData();
    form.append("account_id", opts.accountId);
    form.append("attendees_ids", opts.providerId);
    if (opts.text?.trim()) form.append("text", opts.text);
    form.append("attachments", opts.attachment.blob, opts.attachment.name);
    return normalizeChatStart(
      await unipileFetch<ChatStartResponse>("/chats", {
        method: "POST",
        body: form,
      })
    );
  }
  return normalizeChatStart(
    await unipileFetch<ChatStartResponse>("/chats", {
      method: "POST",
      body: JSON.stringify({
        account_id: opts.accountId,
        attendees_ids: [opts.providerId],
        text: opts.text,
      }),
    })
  );
}

export async function sendWhatsAppMessage(opts: {
  accountId: string;
  phone: string;
  text: string;
}): Promise<{ id?: string }> {
  const form = new FormData();
  form.append("account_id", opts.accountId);
  form.append("attendees_ids", whatsappJid(opts.phone));
  form.append("text", prepareWhatsAppOutboundText(opts.text));
  return normalizeChatStart(
    await unipileFetch<ChatStartResponse>("/chats", {
      method: "POST",
      body: form,
    })
  );
}
