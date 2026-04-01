"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  createOwnerWorkspace,
  uploadOrgLogoIfPresent,
} from "@/lib/onboarding/create-workspace-client";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/utils/image-optimization";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import { useOnboardingRuntime } from "../../_components/OnboardingContext";
import {
  fieldLabelClass,
  inputPremiumClass,
  setupFormMax,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";
import type { StepProps } from "../types";

export function CreateOrgStep({ onNext, onError }: StepProps) {
  const {
    fullName,
    orgId,
    setOrgId,
    orgName,
    setOrgName,
    orgLogoRemoteUrl,
    setOrgLogoRemoteUrl,
    refresh,
  } = useOnboardingRuntime();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const applyLogoFile = useCallback((file: File | null) => {
    if (!file || file.size === 0) {
      setLogoFile(null);
      setLogoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const msg = validateImageFile(file, 2);
    if (msg) {
      toast.error(msg);
      return;
    }
    setLogoFile(file);
    setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const handleLogoDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setLogoDragActive(true);
    } else if (e.type === "dragleave") {
      setLogoDragActive(false);
    }
  }, []);

  const handleLogoDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setLogoDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) applyLogoFile(file);
    },
    [applyLogoFile]
  );

  const canContinue = !!orgId || orgName.trim().length >= 2;

  const handleContinue = async () => {
    if (!canContinue) return;
    if (orgId) {
      setSaving(true);
      try {
        const res = await fetch(`/api/organizations/${orgId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: orgName.trim() }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? "Mise à jour impossible");
        }
        const newLogoUrl = await uploadOrgLogoIfPresent(orgId, logoFile);
        setLogoFile(null);
        setLogoPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        if (newLogoUrl) {
          setOrgLogoRemoteUrl(newLogoUrl);
        }
        await refresh();
        onNext();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    try {
      const created = await createOwnerWorkspace({
        orgName: orgName.trim(),
        fullNameForProfile: fullName.trim(),
        logoFile,
      });
      if (!created.ok) {
        onError(created.error);
        return;
      }
      setOrgId(created.organizationId);
      await refresh();
      onNext();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8">
        <div
          className={cn(
            setupFormMax,
            "flex min-h-[450px] w-full flex-col justify-center gap-20"
          )}
        >
          <div className="flex w-full flex-col gap-12">
            <h1 className={welcomeStepTitleClass}>Créez votre organisation</h1>
            <div className="space-y-5 text-left">
              <div className="space-y-2">
                <Label htmlFor="setup-org-name" className={fieldLabelClass}>
                  Nom de l’organisation
                </Label>
                <Input
                  id="setup-org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme"
                  autoComplete="organization"
                  className={cn(
                    inputPremiumClass,
                    "min-h-11 text-base sm:min-h-10 sm:text-sm"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className={fieldLabelClass}>Logo (optionnel)</Label>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      document.getElementById("setup-org-logo-input")?.click();
                    }
                  }}
                  onDragEnter={handleLogoDrag}
                  onDragLeave={handleLogoDrag}
                  onDragOver={handleLogoDrag}
                  onDrop={handleLogoDrop}
                  onClick={() =>
                    document.getElementById("setup-org-logo-input")?.click()
                  }
                  className={cn(
                    "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 p-3 transition-colors dark:border-white/10 sm:min-h-30 sm:p-4",
                    "hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-white/20 dark:hover:bg-white/5",
                    logoDragActive &&
                      "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-white/10"
                  )}
                >
                  <input
                    id="setup-org-logo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={saving}
                    onChange={(ev) =>
                      applyLogoFile(ev.target.files?.[0] ?? null)
                    }
                  />
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- blob preview
                    <img
                      src={logoPreviewUrl}
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-white/15 sm:h-16 sm:w-16"
                    />
                  ) : orgLogoRemoteUrl ? (
                    <Image
                      src={orgLogoRemoteUrl}
                      alt=""
                      width={64}
                      height={64}
                      className="h-14 w-14 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-white/15 sm:h-16 sm:w-16"
                      unoptimized
                    />
                  ) : (
                    <>
                      <Upload
                        className={cn(
                          "size-6",
                          logoDragActive
                            ? "text-zinc-600 dark:text-zinc-300"
                            : "text-zinc-400 dark:text-zinc-500"
                        )}
                      />
                      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                        Glisser-déposer ou cliquer — max 2 Mo
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full justify-center">
            <OnboardingContinueButton
              disabled={!canContinue}
              loading={saving}
              onClick={() => void handleContinue()}
            >
              Continuer
            </OnboardingContinueButton>
          </div>
        </div>
      </div>
    </div>
  );
}
