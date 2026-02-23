import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/**
 * Creates a Supabase client with the service role key (bypasses RLS).
 * Use only for server-side operations without a user session (e.g. webhooks).
 * Do not expose to the browser or normal API routes.
 */
export function createServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase service env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY"
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
