"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOnboardingStore } from "@/app/onboarding/store";
import { useEffect, useState, useCallback, useRef } from "react";
import { User, CheckCircle, Upload, X } from "lucide-react";
import { RiLinkedinFill } from "@remixicon/react";
import { cn } from "../../../../../src/lib/utils";
import { Row } from "@tanstack/react-table";
import { logger } from "@/lib/utils/logger";
import { validateAndNormalizeLinkedIn } from "@/lib/utils/linkedin";
import Balancer from "react-wrap-balancer";
import Link from "next/link";

const AdditionalSchema = z.object({
  profilePicture: z.instanceof(File).optional(),
  linkedinUsername: z.string().optional(),
  gdprConsent: z
    .boolean()
    .refine((val) => val, { message: "Consentement RGPD requis" }),
});

type AdditionalSchema = z.infer<typeof AdditionalSchema>;

export default function AdditionalForm() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fullName = useOnboardingStore((state) => state.fullName);
  const jeRole = useOnboardingStore((state) => state.jeRole);
  const setData = useOnboardingStore((state) => state.setData);
  const hasHydrated = useOnboardingStore((state) => state._hasHydrated);

  const form = useForm<AdditionalSchema>({
    resolver: zodResolver(AdditionalSchema),
    defaultValues: {
      linkedinUsername: "",
      gdprConsent: false,
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && hasHydrated && (!fullName || !jeRole)) {
      window.location.href = "/onboarding/name";
    }
  }, [isMounted, hasHydrated, fullName, jeRole]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
          form.setError("profilePicture", {
            message: "Le fichier est trop volumineux (max 2MB)",
          });
          return;
        }
        form.setValue("profilePicture", file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        form.setError("profilePicture", {
          message: "Veuillez sélectionner une image",
        });
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        form.setError("profilePicture", {
          message: "Veuillez sélectionner une image",
        });
        return;
      }

      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        form.setError("profilePicture", {
          message: "Le fichier est trop volumineux (max 2MB)",
        });
        return;
      }

      form.setValue("profilePicture", file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: AdditionalSchema) => {
    if (!data.gdprConsent) {
      form.setError("gdprConsent", { message: "Consentement RGPD requis" });
      return;
    }

    setData(data);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    let avatar_url = null;

    // Handle profile picture upload
    if (data.profilePicture) {
      try {
        const fileExt = data.profilePicture.name.split(".").pop();
        // La politique RLS attend que le fichier soit dans un dossier avec le nom de l'utilisateur
        const fileName = `${user.id}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload with upsert to replace existing file
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, data.profilePicture, {
            upsert: true,
            contentType: data.profilePicture.type,
          });

        if (uploadError) {
          logger.error("Avatar upload error", uploadError, {
            userId: user.id,
            fileName,
            filePath,
          });
          form.setError("profilePicture", {
            message: `Erreur lors de l'upload: ${uploadError.message}`,
          });
        } else {
          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(filePath);
          avatar_url = publicUrl;
          logger.info("Avatar uploaded successfully", {
            userId: user.id,
            avatarUrl: avatar_url,
          });
        }
      } catch (error) {
        logger.error("Avatar upload exception", error, {
          userId: user.id,
        });
        form.setError("profilePicture", {
          message: "Erreur lors de l'upload de la photo",
        });
      }
    }

    // Generate LinkedIn URL from username with validation
    let linkedin_url = null;
    if (data.linkedinUsername && data.linkedinUsername.trim()) {
      linkedin_url = validateAndNormalizeLinkedIn(data.linkedinUsername);

      // If validation failed (e.g., user entered just a name), log a warning but don't block
      if (!linkedin_url && data.linkedinUsername.trim()) {
        logger.warn(
          "LinkedIn input appears to be invalid (possibly just a name)",
          {
            input: data.linkedinUsername,
            userId: user.id,
          }
        );
      }
    }

    // Create profile without organization assignment
    // User will select or create organization after onboarding
    // Profile is created with all values from onboarding forms (Zod schema)
    // Default values from database schema will be applied automatically:
    // - status: 'available'
    // - timezone: 'Europe/Paris'
    // - enrichment_credits_used: 0
    // - calendar_status: 'disconnected'
    const profileData = {
      id: user.id,
      email: user.email || null,
      full_name: fullName || null, // From name form (Zod validated)
      je_role: jeRole || null, // From JE form (Zod validated)
      gdpr_consent: data.gdprConsent ?? false, // From additional form (Zod validated)
      consent_obtained_at: data.gdprConsent ? new Date().toISOString() : null,
      avatar_url: avatar_url || null, // From additional form (optional)
      linkedin_url: linkedin_url || null, // From additional form (optional, Zod validated)
      // No active_organization_id - user will select organization next
      // Other fields will use database defaults
    };

    logger.info("Attempting profile upsert", {
      userId: user.id,
      email: user.email,
      profileDataKeys: Object.keys(profileData),
      profileData: profileData,
    });

    // Check if profile already exists (optional - we'll handle duplicate in API route)
    // Skip this check to avoid 406 errors - the API route will handle duplicates
    const existingProfile = null;

    // Verify user is authenticated and session is valid
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (authError || !authUser || authUser.id !== user.id) {
      logger.error("Authentication verification failed", authError, {
        userId: user.id,
        authUserId: authUser?.id,
        hasSession: !!session,
        sessionError,
      });
      form.setError("root", {
        message: "Erreur d'authentification. Veuillez vous reconnecter.",
      });
      return;
    }

    if (!session) {
      logger.error("No active session found", {
        userId: user.id,
        sessionError,
      });
      form.setError("root", {
        message: "Session expirée. Veuillez vous reconnecter.",
      });
      return;
    }

    logger.info("User authenticated, attempting profile insert", {
      userId: user.id,
      authUserId: authUser.id,
      profileDataId: profileData.id,
      sessionExpiresAt: session.expires_at,
      accessToken: session.access_token ? "present" : "missing",
    });

    // Use API route to create profile (server-side, bypasses RLS issues)
    let error: any = null;
    let profileResult: any = null;

    try {
      const response = await fetch("/api/profiles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        error = {
          code: response.status === 401 ? "401" : "500",
          message: errorData.error || "Erreur lors de la création du profil",
        };
        logger.error("API route error", error, {
          userId: user.id,
          status: response.status,
        });
      } else {
        const data = await response.json();
        profileResult = data.profile;
        logger.info("Profile created via API route", {
          userId: user.id,
        });
      }
    } catch (fetchError) {
      error = {
        code: "NETWORK_ERROR",
        message:
          fetchError instanceof Error
            ? fetchError.message
            : "Erreur réseau lors de la création du profil",
      };
      logger.error("Network error calling API route", fetchError, {
        userId: user.id,
      });
    }

    if (error) {
      // Log error in multiple ways to ensure we capture it
      const errorInfo = {
        message: error.message || "No message",
        code: error.code || "No code",
        details: error.details || "No details",
        hint: error.hint || "No hint",
        errorString: String(error),
        errorJSON: JSON.stringify(error, null, 2),
        errorKeys: Object.keys(error),
      };

      logger.error("Profile upsert error", error, {
        userId: user.id,
        email: user.email,
        fullName,
        jeRole,
        gdprConsent: data.gdprConsent,
        profileData,
        errorInfo,
      } as any);

      console.error("Full error object:", error);
      console.error("Error info:", errorInfo);
      console.error("Error keys:", Object.keys(error));
      console.error("Error stringified:", JSON.stringify(error, null, 2));

      // Afficher l'erreur à l'utilisateur avec plus de détails
      const errorMessage = errorInfo.message || "Erreur inconnue";
      const errorHint = errorInfo.hint || "";
      const errorDetails = errorInfo.details || "";

      const userFriendlyMessage =
        errorMessage.includes("duplicate") || errorMessage.includes("unique")
          ? "Un profil existe déjà pour cet utilisateur. Veuillez vous connecter."
          : errorMessage.includes("permission") ||
            errorMessage.includes("policy")
          ? "Erreur de permissions. Veuillez réessayer ou contacter le support."
          : `Erreur lors de la création du profil: ${errorMessage}${
              errorHint ? ` (${errorHint})` : ""
            }${errorDetails ? ` - ${errorDetails}` : ""}`;

      form.setError("root", {
        message: userFriendlyMessage,
      });

      // Ne pas nettoyer l'utilisateur automatiquement - laisser l'utilisateur réessayer
      // L'utilisateur peut toujours se connecter et réessayer l'onboarding

      return;
    }

    // Send onboarding completion email (async, don't wait)
    fetch("/api/authentification/send-onboarding-complete-email", {
      method: "POST",
    }).catch((err) => logger.error("Failed to send onboarding email", err));

    // Redirect to organization selection page
    // User must join or create an organization to continue
    // Use window.location for full page navigation to avoid RSC payload issues
    window.location.href = "/select-organization";
  };

  // Empêche le mismatch d'hydratation
  if (!isMounted) return null;

  return (
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture Upload */}
            <FormField
              control={form.control}
              name="profilePicture"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Photo de profil (optionnel)
                  </FormLabel>
                  <FormControl>
                    {previewUrl ? (
                      <div className="relative inline-block group animate-in zoom-in-95 duration-300">
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-24 w-24 object-cover rounded-xl border-2 border-primary/20 shadow-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full shadow-md hover:scale-110 transition-transform"
                            onClick={() => {
                              form.setValue("profilePicture", undefined);
                              if (previewUrl) {
                                URL.revokeObjectURL(previewUrl);
                              }
                              setPreviewUrl(null);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 text-center">
                          Cliquez sur la croix pour supprimer
                        </p>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer",
                          dragActive
                            ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                        )}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={handleDrop}
                        onClick={() =>
                          document
                            .getElementById("profile-picture-upload")
                            ?.click()
                        }
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className={cn(
                              "p-2.5 rounded-full transition-colors",
                              dragActive ? "bg-primary/20" : "bg-muted"
                            )}
                          >
                            <Upload
                              className={cn(
                                "h-5 w-5 transition-colors",
                                dragActive
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-0.5">
                              {dragActive
                                ? "Déposez l&apos;image ici"
                                : "Glissez-déposez une image ici"}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              ou
                            </p>
                            <label
                              htmlFor="profile-picture-upload"
                              className="cursor-pointer text-xs text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              cliquez pour sélectionner
                            </label>
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="profile-picture-upload"
                            onChange={(e) => {
                              handleFileSelect(e);
                            }}
                          />
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            PNG, JPG jusqu&apos;à 2MB
                          </p>
                        </div>
                      </div>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* LinkedIn Username */}
            <FormField
              control={form.control}
              name="linkedinUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <RiLinkedinFill className="h-4 w-4 text-blue-600" />
                    Profil LinkedIn (optionnel)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="linkedin.com/in/votre-nom ou votre-nom"
                      className="h-12 input-neumorphism"
                      {...field}
                      onChange={(e) => {
                        // Allow full URLs or just the username
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-slate-600 dark:text-slate-400 text-xs">
                    Vous pouvez coller l&apos;URL complète ou juste le nom
                    d&apos;utilisateur
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* RGPD Consent */}
            <FormField
              control={form.control}
              name="gdprConsent"
              render={({ field }) => (
                <FormItem id="gdpr-consent-item">
                  <FormControl>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-xl p-6 transition-all duration-300 select-none",
                        field.value
                          ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-start">
                        <div className="shrink-0 pt-0.5">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="checkbox-neumorphism h-5 w-5"
                          />
                        </div>
                        <div className="flex-1 space-y-2 text-center">
                          <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer leading-tight">
                            <Balancer>
                              J&apos;accepte les{" "}
                              <Link
                                href="/terms"
                                className="text-primary hover:underline font-semibold"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                conditions d&apos;utilisation
                              </Link>{" "}
                              et la{" "}
                              <Link
                                href="/privacy"
                                className="text-primary hover:underline font-semibold"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                politique de confidentialité
                              </Link>
                            </Balancer>
                          </FormLabel>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <Balancer>
                              En cochant cette case, vous acceptez le traitement
                              de vos données personnelles.
                            </Balancer>
                          </p>
                          <FormMessage />
                        </div>
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.root.message}
                </p>
              </div>
            )}

            <div className="pt-6">
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold btn-neumorphism glassmorphism btn-gradient-border rounded-full border-0 text-slate-800 dark:text-slate-100"
                disabled={!form.watch("gdprConsent")}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Finaliser mon inscription
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
