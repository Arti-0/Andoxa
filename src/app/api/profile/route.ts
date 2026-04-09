import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";
import { planAllowsAutoEnrichOnImport } from "@/lib/enrichment/queue-helpers";

/**
 * PATCH /api/profile - Update user profile
 */
export const PATCH = createApiHandler(
  async (req: NextRequest, ctx) => {
    const body = await parseBody<{
      full_name?: string;
      onboarding_step?: string | null;
      linkedin_auto_enrich?: boolean;
    }>(req);

    const hasFullName = typeof body.full_name === "string";
    const hasOnboardingStep = Object.prototype.hasOwnProperty.call(
      body,
      "onboarding_step"
    );
    const hasLinkedInAutoEnrich = Object.prototype.hasOwnProperty.call(
      body,
      "linkedin_auto_enrich"
    );

    if (!hasFullName && !hasOnboardingStep && !hasLinkedInAutoEnrich) {
      throw Errors.badRequest(
        "full_name, onboarding_step and/or linkedin_auto_enrich is required"
      );
    }

    if (hasLinkedInAutoEnrich) {
      if (typeof body.linkedin_auto_enrich !== "boolean") {
        throw Errors.badRequest("linkedin_auto_enrich must be a boolean");
      }
      if (
        body.linkedin_auto_enrich === true &&
        !planAllowsAutoEnrichOnImport(
          ctx.workspace?.plan,
          ctx.workspace?.subscription_status
        )
      ) {
        throw Errors.badRequest(
          "L'enrichissement automatique à l'import est réservé aux plans Pro et Business."
        );
      }
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (hasFullName) {
      patch.full_name = (body.full_name as string).trim() || null;
    }
    if (hasOnboardingStep) {
      patch.onboarding_step = body.onboarding_step;
    }
    if (hasLinkedInAutoEnrich) {
      patch.linkedin_auto_enrich = body.linkedin_auto_enrich;
    }

    const { error } = await ctx.supabase
      .from("profiles")
      .update(patch)
      .eq("id", ctx.userId);

    if (error) {
      throw Errors.internal("Failed to update profile");
    }

    return { updated: true };
  },
  { requireWorkspace: false }
);
