import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

/**
 * Creates a Supabase client for browser-side usage
 * Uses environment variables directly - fail fast if missing
 */
export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  // @supabase/ssr createBrowserClient merges options.auth then hardcodes flowType: "pkce",
  // so implicit flow cannot be enabled from here. Email confirmation links should be opened
  // in the same browser session as signup when possible, or rely on server /api/auth/confirm.
  const client = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  // createBrowserClient<Database> infers a different schema generic than SupabaseClient<Database>
  return client as unknown as SupabaseClient<Database>;
}
