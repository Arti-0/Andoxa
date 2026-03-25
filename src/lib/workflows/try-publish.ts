import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";
import { getLinkedInAccountIdForUserId, getWhatsAppAccountIdForUserId } from "@/lib/unipile/account";
import {
  definitionRequiresLinkedIn,
  definitionRequiresWhatsApp,
  validateDefinitionForPublish,
  type WorkflowDefinition,
} from "./schema";

export type TryPublishFailureReason = "validation" | "linkedin" | "whatsapp";

export type TryPublishResult =
  | { ok: true; definition: WorkflowDefinition }
  | { ok: false; reason: TryPublishFailureReason; message: string };

/**
 * Returns a publishable definition copy when draft passes publish rules and channel accounts exist.
 */
export async function tryBuildPublishedDefinition(
  supabase: SupabaseClient<Database>,
  userId: string,
  draft: WorkflowDefinition
): Promise<TryPublishResult> {
  const v = validateDefinitionForPublish(draft);
  if (v) {
    return { ok: false, reason: "validation", message: v };
  }

  if (definitionRequiresLinkedIn(draft)) {
    const li = await getLinkedInAccountIdForUserId(supabase, userId);
    if (!li) {
      return {
        ok: false,
        reason: "linkedin",
        message:
          "Connectez LinkedIn (Installation) pour enregistrer un parcours avec des étapes LinkedIn.",
      };
    }
  }

  if (definitionRequiresWhatsApp(draft)) {
    const wa = await getWhatsAppAccountIdForUserId(supabase, userId);
    if (!wa) {
      return {
        ok: false,
        reason: "whatsapp",
        message:
          "Connectez WhatsApp (Installation) pour enregistrer un parcours avec des messages WhatsApp.",
      };
    }
  }

  return { ok: true, definition: draft };
}
