"use client";

import { useCallback, useEffect, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  optimizeImage,
  validateImageFile,
} from "@/lib/utils/image-optimization";
import { logger } from "@/lib/utils/logger";

const DEFAULT_PLAN_FOR_PENDING_ORG = "essential" as const;

function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "espace";
}

export default function OnboardingCreateClient() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applyLogoFile = useCallback((file: File | null) => {
    if (!file || file.size === 0) {
      setLogoFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    const msg = validateImageFile(file, 2);
    if (msg) {
      setError(msg);
      return;
    }

    setError(null);
    setLogoFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) applyLogoFile(file);
    },
    [applyLogoFile]
  );

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const name = orgName.trim();
      if (!name) {
        setError("Indiquez un nom d’organisation.");
        return;
      }

      const slug = slugify(name);
      setSubmitting(true);
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user) {
          setError("Session expirée. Reconnectez-vous.");
          setSubmitting(false);
          return;
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
          logger.warn("onboarding/workspace: organization insert failed", {
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
                  setError(
                    membershipErr.message ??
                      "Un espace existe deja, mais impossible de restaurer l'accès."
                  );
                  setSubmitting(false);
                  return;
                }
              }

              const { data: existingProfile } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

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
                      full_name: user.user_metadata?.full_name ?? null,
                      active_organization_id: organizationId,
                      created_at: now,
                      updated_at: now,
                    })
                  ).error;

              if (profErr) {
                setError(profErr.message ?? "Impossible de lier le profil.");
                setSubmitting(false);
                return;
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
                setError(
                  metaErr.message ?? "Impossible de synchroniser la session d'organisation."
                );
                setSubmitting(false);
                return;
              }

              logger.info("onboarding/new: organization restored", { organizationId });
              router.replace("/onboarding/plan");
              return;
            }
          }
          setError(
            dup
              ? "Un espace avec ce nom existe deja. Essayez un nom different."
              : orgErr?.message ?? "Impossible de créer l’organisation."
          );
          setSubmitting(false);
          return;
        }

        const organizationId = org.id;

        if (logoFile && logoFile.size > 0) {
          let uploadBody: File = logoFile;
          if (logoFile.type !== "image/svg+xml") {
            const optimized = await optimizeImage(logoFile, 512, 512, 0.85);
            if (optimized) uploadBody = optimized;
          }

          const ext = uploadBody.name.split(".").pop() || "png";
          const path = `org-logos/${organizationId}/logo.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("avatars")
            .upload(path, uploadBody, {
              upsert: true,
              contentType: uploadBody.type || undefined,
            });
          if (!upErr) {
            const { data: pub } = supabase.storage
              .from("avatars")
              .getPublicUrl(path);
            if (pub?.publicUrl) {
              await supabase
                .from("organizations")
                .update({ logo_url: pub.publicUrl })
                .eq("id", organizationId);
            }
          }
        }

        const { error: memErr } = await supabase
          .from("organization_members")
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            role: "owner",
          });
        if (memErr) {
          setError(memErr.message ?? "Impossible d’ajouter le propriétaire.");
          setSubmitting(false);
          return;
        }

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

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
                full_name: user.user_metadata?.full_name ?? null,
                active_organization_id: organizationId,
                created_at: now,
                updated_at: now,
              })
            ).error;
        if (profErr) {
          setError(profErr.message ?? "Impossible de lier le profil.");
          setSubmitting(false);
          return;
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
          setError(metaErr.message ?? "Impossible de synchroniser la session d'organisation.");
          setSubmitting(false);
          return;
        }

        logger.info("onboarding/new: organization ready", { organizationId });
        router.replace("/onboarding/plan");
      } catch (err) {
        logger.error("onboarding/workspace: unexpected error", err);
        setError("Une erreur inattendue s’est produite.");
        setSubmitting(false);
      }
    },
    [logoFile, orgName, router]
  );

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:py-12">
      <div className="w-full max-w-[460px]">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground dark:text-[#f7f7f8]">
          Créez votre espace
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground dark:text-[#8a8a8e]">
          Configurez votre espace de travail puis invitez votre equipe.
        </p>

        <form onSubmit={onSubmit} className="mt-8">
          <div className="rounded-[10px] border border-border/80 bg-card p-6 shadow-sm dark:border-white/8 dark:bg-[#151516] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="org-logo-input"
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-[#8a8a8e]"
                >
                  Logo (optionnel)
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      document.getElementById("org-logo-input")?.click();
                    }
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("org-logo-input")?.click()}
                  className={cn(
                    "relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 transition-colors",
                    "border-border bg-background/50 dark:border-white/12 dark:bg-[#0c0c0e]/80",
                    dragActive &&
                      "border-primary/50 bg-primary/10 dark:border-[#5e6ad2]/45 dark:bg-[#5e6ad2]/6"
                  )}
                >
                  <input
                    id="org-logo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={submitting}
                    onChange={(ev) => applyLogoFile(ev.target.files?.[0] ?? null)}
                  />
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Aperçu du logo"
                      className="h-20 w-20 rounded-full object-cover ring-1 ring-border dark:ring-white/15"
                    />
                  ) : (
                    <>
                      <Upload
                        className={cn(
                          "h-7 w-7",
                          dragActive
                            ? "text-primary dark:text-[#5e6ad2]"
                            : "text-muted-foreground dark:text-[#6e6e73]"
                        )}
                      />
                      <p className="text-center text-[13px] text-muted-foreground dark:text-[#a1a1a6]">
                        Glissez-deposez ou cliquez
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="org-name"
                  className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground dark:text-[#8a8a8e]"
                >
                  Nom de l’organisation
                </Label>
                <input
                  id="org-name"
                  value={orgName}
                  onChange={(ev) => setOrgName(ev.target.value)}
                  placeholder="Acme"
                  disabled={submitting}
                  autoComplete="organization"
                  className={cn(
                    "h-10 w-full rounded-lg border border-border bg-background px-3",
                    "text-sm text-foreground outline-none placeholder:text-muted-foreground/70",
                    "focus:border-primary/50 focus:ring-1 focus:ring-primary/30",
                    "dark:border-white/8 dark:bg-[#0c0c0e] dark:text-[#f7f7f8] dark:placeholder:text-[#5c5c6f] dark:focus:border-[#5e6ad2]/45 dark:focus:ring-[#5e6ad2]/25"
                  )}
                />
              </div>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#5e6ad2] dark:text-white dark:hover:bg-[#5369d0]"
              >
                {submitting ? "Creation..." : "Créer l’espace"}
              </Button>
            </div>
          </div>

          <div className="my-5 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border/80 dark:bg-white/12" />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-[#8a8a8e]">
              OU
            </span>
            <span className="h-px flex-1 bg-border/80 dark:bg-white/12" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={() => router.push("/onboarding/join")}
            className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground dark:text-[#8a8a8e] dark:hover:text-[#b4b4b8]"
          >
            Rejoindre une organisation existante
          </button>
        </form>
      </div>
    </div>
  );
}