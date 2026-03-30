"use client";

import { createClient } from "@/lib/supabase/client";
import {
  optimizeImage,
  validateImageFile,
} from "@/lib/utils/image-optimization";
import { logger } from "@/lib/utils/logger";

export const DEFAULT_PLAN_FOR_PENDING_ORG = "essential" as const;

export function slugifyOrganizationName(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "espace";
}

export type CreateOwnerWorkspaceInput = {
  orgName: string;
  /** Used when inserting a new profile row */
  fullNameForProfile?: string | null;
  logoFile?: File | null;
};

export type CreateOwnerWorkspaceResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

/** Uploads org logo to storage and updates `organizations.logo_url`. Returns the public URL when successful. */
export async function uploadOrgLogoIfPresent(
  organizationId: string,
  logoFile: File | null | undefined
): Promise<string | null> {
  if (!logoFile || logoFile.size <= 0) return null;

  let uploadBody: File = logoFile;
  if (logoFile.type !== "image/svg+xml") {
    const optimized = await optimizeImage(logoFile, 512, 512, 0.85);
    if (optimized) uploadBody = optimized;
  }

  const sizeErr = validateImageFile(uploadBody, 2);
  if (sizeErr) {
    logger.warn("createOwnerWorkspace: org logo over limit after optimize", {
      organizationId,
      message: sizeErr,
    });
    return null;
  }

  const supabase = createClient();
  const ext = uploadBody.name.split(".").pop() || "png";
  const path = `${organizationId}/logo.${ext}`;
  const contentType =
    uploadBody.type && uploadBody.type.startsWith("image/")
      ? uploadBody.type
      : "image/png";

  const { error: upErr } = await supabase.storage
    .from("org-logos")
    .upload(path, uploadBody, {
      upsert: true,
      contentType,
    });
  if (upErr) {
    logger.error("createOwnerWorkspace: org logo upload failed", upErr, {
      organizationId,
      path,
    });
    return null;
  }

  const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
  if (pub?.publicUrl) {
    const { error: logoUpdateErr } = await supabase
      .from("organizations")
      .update({ logo_url: pub.publicUrl })
      .eq("id", organizationId);
    if (logoUpdateErr) {
      logger.error("createOwnerWorkspace: logo_url update failed", logoUpdateErr, {
        organizationId,
      });
      return null;
    }
    return pub.publicUrl;
  }
  return null;
}

/**
 * Creates (or re-attaches) the owner workspace for the current Supabase session.
 * Shared by onboarding setup step 1 and legacy /onboarding/new.
 */
export async function createOwnerWorkspace(
  input: CreateOwnerWorkspaceInput
): Promise<CreateOwnerWorkspaceResult> {
  const name = input.orgName.trim();
  if (!name) {
    return { ok: false, error: "Indiquez un nom d’organisation." };
  }

  const slug = slugifyOrganizationName(name);
  const supabase = createClient();

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return { ok: false, error: "Session expirée. Reconnectez-vous." };
    }

    const now = new Date().toISOString();
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name,
        slug,
        owner_id: user.id,
        plan: DEFAULT_PLAN_FOR_PENDING_ORG,
        status: "pending",
        subscription_status: null,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (orgErr || !org) {
      logger.warn("createOwnerWorkspace: organization insert failed", {
        code: orgErr?.code,
        message: orgErr?.message,
      });
      const dup =
        orgErr?.code === "23505" ||
        String(orgErr?.message ?? "").toLowerCase().includes("duplicate");
      if (dup) {
        const { data: existingOrg } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .eq("slug", slug)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingOrg?.id) {
          const organizationId = existingOrg.id;

          const { data: membership } = await supabase
            .from("organization_members")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (!membership) {
            const { error: membershipErr } = await supabase
              .from("organization_members")
              .insert({
                organization_id: organizationId,
                user_id: user.id,
                role: "owner",
              });
            if (membershipErr) {
              return {
                ok: false,
                error:
                  membershipErr.message ??
                  "Un espace existe déjà, mais impossible de restaurer l’accès.",
              };
            }
          }

          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          const displayName =
            input.fullNameForProfile?.trim() ||
            (typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null);

          const profErr = existingProfile
            ? (
                await supabase
                  .from("profiles")
                  .update({
                    active_organization_id: organizationId,
                    updated_at: now,
                  })
                  .eq("id", user.id)
              ).error
            : (
                await supabase.from("profiles").insert({
                  id: user.id,
                  email: user.email ?? "",
                  full_name: displayName,
                  active_organization_id: organizationId,
                  created_at: now,
                  updated_at: now,
                })
              ).error;

          if (profErr) {
            return {
              ok: false,
              error: profErr.message ?? "Impossible de lier le profil.",
            };
          }

          const currentMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
          const { error: metaErr } = await supabase.auth.updateUser({
            data: {
              ...currentMeta,
              active_organization_id: organizationId,
              active_organization_role: "owner",
            },
          });
          if (metaErr) {
            return {
              ok: false,
              error:
                metaErr.message ??
                "Impossible de synchroniser la session d’organisation.",
            };
          }

          logger.info("createOwnerWorkspace: duplicate slug — restored", {
            organizationId,
          });
          return { ok: true, organizationId };
        }
      }
      return {
        ok: false,
        error: dup
          ? "Un espace avec ce nom existe déjà. Essayez un nom différent."
          : orgErr?.message ?? "Impossible de créer l’organisation.",
      };
    }

    const organizationId = org.id;

    const { error: memErr } = await supabase.from("organization_members").insert({
      organization_id: organizationId,
      user_id: user.id,
      role: "owner",
    });
    if (memErr) {
      return {
        ok: false,
        error: memErr.message ?? "Impossible d’ajouter le propriétaire.",
      };
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const displayName =
      input.fullNameForProfile?.trim() ||
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null);

    const profErr = existingProfile
      ? (
          await supabase
            .from("profiles")
            .update({
              active_organization_id: organizationId,
              updated_at: now,
            })
            .eq("id", user.id)
        ).error
      : (
          await supabase.from("profiles").insert({
            id: user.id,
            email: user.email ?? "",
            full_name: displayName,
            active_organization_id: organizationId,
            created_at: now,
            updated_at: now,
          })
        ).error;
    if (profErr) {
      return {
        ok: false,
        error: profErr.message ?? "Impossible de lier le profil.",
      };
    }

    const currentMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: metaErr } = await supabase.auth.updateUser({
      data: {
        ...currentMeta,
        active_organization_id: organizationId,
        active_organization_role: "owner",
      },
    });
    if (metaErr) {
      return {
        ok: false,
        error:
          metaErr.message ??
          "Impossible de synchroniser la session d’organisation.",
      };
    }

    await uploadOrgLogoIfPresent(organizationId, input.logoFile ?? null);

    logger.info("createOwnerWorkspace: organization ready", { organizationId });
    return { ok: true, organizationId };
  } catch (err) {
    const aborted =
      err instanceof DOMException && err.name === "AbortError";
    const abortedLegacy = err instanceof Error && err.name === "AbortError";
    if (aborted || abortedLegacy) {
      logger.warn("createOwnerWorkspace: aborted", {
        message: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: "Opération interrompue. Réessayez." };
    }
    logger.error("createOwnerWorkspace: unexpected error", err);
    return { ok: false, error: "Une erreur inattendue s’est produite." };
  }
}
