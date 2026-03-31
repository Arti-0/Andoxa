import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

export function createImplicitClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const client = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    auth: { flowType: "implicit" },
  });

  return client as unknown as SupabaseClient<Database>;
}