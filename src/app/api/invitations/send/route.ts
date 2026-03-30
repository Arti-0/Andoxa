import { NextRequest } from "next/server";
import {
  createApiHandler,
  Errors,
  parseBody,
  type ApiContext,
} from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export const runtime = "nodejs";

function appOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!u) {
    throw new Error("NEXT_PUBLIC_APP_URL is required for invite redirectTo");
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

async function findUserIdByEmail(
  service: ReturnType<typeof createServiceClient>,
  email: string
): Promise<string | null> {
  const trimmed = email.trim();
  const normalized = trimmed.toLowerCase();

  const { data: byLower } = await service
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (byLower?.id) return byLower.id;

  const { data: byExact } = await service
    .from("profiles")
    .select("id")
    .eq("email", trimmed)
    .maybeSingle();
  if (byExact?.id) return byExact.id;

  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (hit) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

/**
 * POST /api/invitations/send
 * Native Supabase invite: admin.inviteUserByEmail + organization_members + profiles (service role).
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
    const role = ["owner", "admin", "member"].includes(body.role ?? "")
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
    const admin = service.auth.admin;
    const origin = appOrigin();
    const redirectTo = `${origin}/api/auth/confirm?next=${encodeURIComponent("/auth/update-password")}`;

    const meta = {
      active_organization_id: organizationId,
      active_organization_role: role,
    };

    let userId: string | null = null;

    const { data: invited, error: inviteErr } = await admin.inviteUserByEmail(
      emailRaw,
      { data: meta, redirectTo }
    );

    if (!inviteErr && invited?.user?.id) {
      userId = invited.user.id;
    } else {
      const msg = inviteErr?.message?.toLowerCase() ?? "";
      const exists =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists");
      if (!exists) {
        throw Errors.badRequest(
          inviteErr?.message ?? "Impossible d’envoyer l’invitation"
        );
      }
      userId = await findUserIdByEmail(service, emailRaw);
      if (!userId) {
        throw Errors.internal("Utilisateur existant introuvable");
      }
      const { data: existing, error: getErr } = await admin.getUserById(userId);
      if (getErr || !existing?.user) {
        throw Errors.internal("Impossible de charger l’utilisateur");
      }
      const prev = (existing.user.user_metadata ?? {}) as Record<
        string,
        unknown
      >;
      const { error: updErr } = await admin.updateUserById(userId, {
        user_metadata: { ...prev, ...meta },
      });
      if (updErr) {
        throw Errors.internal(updErr.message);
      }
    }

    const now = new Date().toISOString();

    const { error: memErr } = await service.from("organization_members").upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        role,
        created_at: now,
        updated_at: now,
      },
      { onConflict: "organization_id,user_id" }
    );

    if (memErr) {
      throw Errors.internal(memErr.message);
    }

    const { data: existingProfile } = await service
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("id", userId)
      .maybeSingle();

    const { error: profErr } = await service.from("profiles").upsert(
      {
        id: userId,
        email: emailLower,
        full_name: existingProfile?.full_name ?? null,
        active_organization_id: organizationId,
        created_at: existingProfile?.created_at ?? now,
        updated_at: now,
      },
      { onConflict: "id" }
    );

    if (profErr) {
      throw Errors.internal(profErr.message);
    }

    return { ok: true as const, userId };
  },
  {
    requireWorkspace: true,
    rateLimit: { name: "invite-send", requests: 30, window: "1 m" },
  }
);
