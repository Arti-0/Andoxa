/**
 * Admin authorization utilities
 *
 * Checks if a user has admin privileges.
 * For now, uses environment variable ADMIN_EMAILS (comma-separated list).
 * In the future, this should check a role field in the profiles table.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Check if a user is an admin
 * @param userId - The user ID to check
 * @returns true if the user is an admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Get admin emails from environment variable
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((email) =>
      email.trim().toLowerCase()
    ) || [];

    if (adminEmails.length === 0) {
      // If no admin emails configured, deny access
      return false;
    }

    const supabase = await createClient();

    // Get user email from auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId) {
      return false;
    }

    // Check if user email is in admin list
    const userEmail = user.email?.toLowerCase();
    if (!userEmail) {
      return false;
    }

    return adminEmails.includes(userEmail);
  } catch (error) {
    console.error("[Admin Check] Error checking admin status:", error);
    return false;
  }
}

/**
 * Middleware helper to require admin access
 * Throws an error if user is not an admin
 */
export async function requireAdmin(userId: string): Promise<void> {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error("Admin access required");
  }
}

