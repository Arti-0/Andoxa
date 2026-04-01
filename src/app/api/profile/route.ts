import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";

/**
 * PATCH /api/profile - Update user profile
 */
export const PATCH = createApiHandler(
  async (req: NextRequest, ctx) => {
    const body = await parseBody<{
      full_name?: string;
      onboarding_step?: string | null;
    }>(req);

    const hasFullName = typeof body.full_name === "string";
    const hasOnboardingStep = Object.prototype.hasOwnProperty.call(
      body,
      "onboarding_step"
    );

    if (!hasFullName && !hasOnboardingStep) {
      throw Errors.badRequest("full_name and/or onboarding_step is required");
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
