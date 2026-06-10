import { env } from "@/lib/config/environment";
import { buildBookingPublicUrlForProfile } from "@/lib/booking/public-path";
import type { ApiContext } from "@/lib/api";
import {
  dailyPeriodKey,
  incrementUsageCounter,
} from "@/lib/campaigns/throttle";
import { ensureLinkedInRelationFromUnipileProfile } from "@/lib/linkedin/ensure-relation-from-unipile-profile";
import {
  computeInviteBudget,
  inviteQuotaErrorFor,
  reserveInviteSlot,
} from "@/lib/linkedin/weekly-invite-quota";
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

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("booking_public_path, booking_slug")
    .eq("id", ctx.userId)
    .single();
  const appUrl = env.getConfig().appUrl.replace(/\/$/, "");
  const bookingLink = buildBookingPublicUrlForProfile(appUrl, profile);

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

  // Atomic invite-quota reservation. Must happen BEFORE the Unipile call so
  // concurrent senders (workflows / batch campaigns / single sends) cannot all
  // pass an in-memory check and then collectively overshoot the cap.
  const serviceSupabase = createServiceClient();
  const inviteBudget = await computeInviteBudget(serviceSupabase, ctx.userId);
  const reserved = await reserveInviteSlot(serviceSupabase, ctx.userId, inviteBudget);
  if (!reserved.ok) {
    throw inviteQuotaErrorFor(reserved);
  }

  await unipileFetch("/users/invite", {
    method: "POST",
    body: JSON.stringify({
      account_id: accountId,
      provider_id: providerId,
      ...(personalizedMessage ? { message: personalizedMessage } : {}),
    }),
  });

  // The daily + weekly linkedin_invite counters are already incremented inside
  // reserveInviteSlot above. Only the daily direct-invite breakdown counter
  // (used by the dashboard) remains to track here.
  await incrementUsageCounter(
    serviceSupabase,
    ctx.userId,
    "linkedin_invite_direct",
    dailyPeriodKey()
  );
}
