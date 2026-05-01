import { env } from "@/lib/config/environment";
import type { ApiContext } from "@/lib/api";
import {
  dailyPeriodKey,
  incrementUsageCounter,
  weeklyPeriodKey,
} from "@/lib/campaigns/throttle";
import { ensureLinkedInRelationFromUnipileProfile } from "@/lib/linkedin/ensure-relation-from-unipile-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { applyMessageVariables, extractLinkedInSlug } from "@/lib/unipile/campaign";
import { unipileFetch } from "@/lib/unipile/client";

export type InviteProspectRow = {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
};

/**
 * Resolves provider_id and sends one LinkedIn connection invite via Unipile.
 */
export async function sendLinkedInInviteForProspect(
  ctx: ApiContext,
  prospect: InviteProspectRow,
  accountId: string,
  messageTemplate?: string,
  /** Message final (déjà rédigé), prioritaire sur le modèle + variables */
  messageOverride?: string | null
): Promise<void> {
  const slug = extractLinkedInSlug(prospect.linkedin);
  if (!slug) {
    throw new Error("URL LinkedIn invalide");
  }

  let bookingLink: string | null = null;
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("booking_slug")
    .eq("id", ctx.userId)
    .single();
  if (profile?.booking_slug) {
    const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
    bookingLink = `${appUrl}/booking/${profile.booking_slug}`;
  }

  // No silent default — when the caller passes nothing, send the invite
  // without any note. Callers that want a default (campaigns) set it
  // themselves before invoking this helper.
  const template = (messageTemplate ?? "").trim();
  const personalizedMessage =
    messageOverride != null && String(messageOverride).trim() !== ""
      ? String(messageOverride).trim()
      : template
        ? applyMessageVariables(template, prospect, { bookingLink })
        : "";

  const { providerId, isFirstDegree } = await ensureLinkedInRelationFromUnipileProfile(
    ctx.supabase,
    ctx.userId,
    accountId,
    slug
  );
  if (!providerId) {
    throw new Error("Impossible de résoudre le profil LinkedIn");
  }
  if (isFirstDegree) {
    throw new Error(
      "Vous êtes déjà connecté avec ce contact sur LinkedIn."
    );
  }

  await unipileFetch("/users/invite", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      provider_id: providerId,
      message: personalizedMessage,
    }),
  });

  const serviceSupabase = createServiceClient();
  await incrementUsageCounter(
    serviceSupabase,
    ctx.userId,
    "linkedin_invite_direct",
    dailyPeriodKey()
  );
  await incrementUsageCounter(
    serviceSupabase,
    ctx.userId,
    "linkedin_invite",
    weeklyPeriodKey()
  );
}
