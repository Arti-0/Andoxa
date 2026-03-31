import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";
import {
  createApiHandler,
  Errors,
  parseBody,
  type ApiContext,
} from "@/lib/api";
import { sendOrganizationInviteEmail } from "@/lib/email/send-org-invite";
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export const runtime = "nodejs";

function appOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!u) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for invite links");
  }
  return u;
}

async function assertCallerCanInviteToOrg(
  supabase: SupabaseClient<Database>,
  callerUserId: string,
  organizationId: string
): Promise<void> {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", callerUserId)
    .maybeSingle();

  const isOwner =
    membership?.role === "owner" ||
    (await supabase
      .from("organizations")
      .select("owner_id")
      .eq("id", organizationId)
      .maybeSingle()
      .then(({ data }) => data?.owner_id === callerUserId));

  if (!isOwner && membership?.role !== "admin") {
    throw Errors.forbidden("Seuls le propriétaire ou un admin peuvent inviter");
  }
}

/**
 * POST /api/invitations/send
 * Creates a pending invitation row and sends an email with login deep link (token in URL).
 */
export const POST = createApiHandler(
  async (req: NextRequest, ctx: ApiContext) => {
    const body = await parseBody<{
      email?: string;
      organization_id?: string;
      role?: string;
    }>(req);

    const emailRaw = body.email?.trim();
    const organizationId = body.organization_id?.trim() ?? ctx.workspaceId ?? null;
    const role = ["admin", "member"].includes(body.role ?? "")
      ? body.role!
      : "member";

    if (!emailRaw || !organizationId) {
      throw Errors.badRequest("Email et organisation requis");
    }

    const emailLower = emailRaw.toLowerCase();
    if (emailLower === ctx.email?.toLowerCase()) {
      throw Errors.badRequest("Vous ne pouvez pas vous inviter vous-même");
    }

    await assertCallerCanInviteToOrg(
      ctx.supabase,
      ctx.userId,
      organizationId
    );

    const service = createServiceClient();

    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .eq("email", emailLower)
      .maybeSingle();

    if (existingProfile) {
      const { data: alreadyMember } = await service
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();
      if (alreadyMember) {
        throw Errors.badRequest(
          "Cet utilisateur est déjà membre de cette organisation"
        );
      }
    }

    const { data: orgRow, error: orgErr } = await service
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgErr || !orgRow) {
      throw Errors.internal("Organisation introuvable");
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: delErr } = await service
      .from("invitations")
      .delete()
      .eq("organization_id", organizationId)
      .eq("email", emailLower)
      .is("consumed_at", null);

    if (delErr) {
      throw Errors.internal(delErr.message);
    }

    const { error: insErr } = await service.from("invitations").insert({
      token,
      organization_id: organizationId,
      email: emailLower,
      role,
      expires_at: expiresAt,
    });

    if (insErr) {
      throw Errors.internal(insErr.message);
    }

    const origin = appOrigin();
    const redirectTo = `${origin}/api/auth/confirm?invite_token=${encodeURIComponent(token)}`;

    const { data: linkData, error: linkErr } =
      await service.auth.admin.generateLink({
        type: "magiclink",
        email: emailLower,
        options: { redirectTo },
      });

    if (linkErr || !linkData?.properties?.hashed_token) {
      await service.from("invitations").delete().eq("token", token);
      throw Errors.internal(
        linkErr?.message ?? "Génération du lien de connexion impossible"
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
      /\/$/,
      ""
    );
    if (!supabaseUrl) {
      await service.from("invitations").delete().eq("token", token);
      throw Errors.internal("NEXT_PUBLIC_SUPABASE_URL manquant");
    }

    const confirmUrl =
      linkData.properties.action_link ??
      `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`;

    const { data: inviterProfile } = await ctx.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", ctx.userId)
      .maybeSingle();

    const invitedBy =
      inviterProfile?.full_name?.trim() ||
      inviterProfile?.email?.trim() ||
      "Un collègue";

    try {
      await sendOrganizationInviteEmail({
        to: emailRaw,
        confirmUrl,
        organizationName: orgRow.name,
        invitedBy,
      });
    } catch (e) {
      Sentry.captureException(e, {
        tags: { flow: "org_invite_email" },
        extra: { organizationId, token },
      });
      const msg = e instanceof Error ? e.message : String(e);
      throw Errors.internal(
        `Envoi de l’e-mail d’invitation impossible : ${msg}`
      );
    }

    return { ok: true as const };
  },
  {
    requireWorkspace: true,
    rateLimit: { name: "invite-send", requests: 30, window: "1 m" },
  }
);
