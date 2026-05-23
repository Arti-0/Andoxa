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

export async function sendWhatsAppMessage(opts: {
  accountId: string;
  phone: string;
  text: string;
}): Promise<{ id?: string }> {
  const form = new FormData();
  form.append("account_id", opts.accountId);
  form.append("attendees_ids", whatsappJid(opts.phone));
  form.append("text", opts.text);
  return unipileFetch<{ id?: string }>("/chats", {
    method: "POST",
    body: form,
  });
}
