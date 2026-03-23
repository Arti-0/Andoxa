import { NextRequest } from "next/server";
import { createApiHandler, Errors, parseBody } from "@/lib/api";

/**
 * PATCH /api/profile - Update user profile
 */
export const PATCH = createApiHandler(
  async (req: NextRequest, ctx) => {
    const body = await parseBody<{ full_name?: string }>(req);
    const fullName = body.full_name;

    if (typeof fullName !== "string") {
      throw Errors.badRequest("full_name is required");
    }

    const { error } = await ctx.supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.userId);

    if (error) {
      throw Errors.internal("Failed to update profile");
    }

    return { updated: true };
  },
  { requireWorkspace: false }
);
