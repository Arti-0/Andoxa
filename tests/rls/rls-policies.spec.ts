/**
 * RLS Policy Integration Tests
 *
 * These tests verify that Row Level Security policies work correctly:
 * 1. Users can access their own tenant's data
 * 2. Users cannot access other tenants' data
 * 3. Unauthenticated users cannot access protected data
 */

import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Validate environment variables at runtime
// Returns the value or throws if missing (expected behavior for tests)
// Note: Linter may show an error here during static analysis, but this is expected
// - the function only throws at runtime when tests are executed without env vars
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    // This is intentional - we want to fail fast if env vars are missing
    // The linter may flag this, but it's correct behavior for test files
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Test users - should be set up in test environment
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "test-password";

test.describe("RLS Policy Tests", () => {
  test.describe.configure({ mode: "serial" });

  // Lazy evaluation of env vars - only validated when tests run
  let serviceClient: ReturnType<typeof createClient>;
  let anonClient: ReturnType<typeof createClient>;
  let env: { url: string; serviceKey: string; publishableKey: string };

  test.beforeAll(() => {
    // Validate env vars only when tests actually run (not at module load time)
    env = {
      url: requireEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL),
      serviceKey: requireEnv("SUPABASE_SECRET_KEY", SUPABASE_SECRET_KEY),
      publishableKey: requireEnv(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        SUPABASE_PUBLISHABLE_KEY
      ),
    };

    // Service role client for setup/teardown
    serviceClient = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false },
    });

    // Anonymous client for unauthenticated tests
    anonClient = createClient(env.url, env.publishableKey, {
      auth: { persistSession: false },
    });
  });

  test("unauthenticated users cannot access profiles", async () => {
    const { data, error } = await anonClient
      .from("profiles")
      .select("*")
      .limit(1);

    // Should return empty array or error, not actual data
    expect(data?.length || 0).toBe(0);
  });

  test("unauthenticated users cannot access prospects", async () => {
    const { data, error } = await anonClient
      .from("prospects")
      .select("*")
      .limit(1);

    // Should return empty array (RLS blocks access)
    expect(data?.length || 0).toBe(0);
  });

  test("unauthenticated users cannot access campaigns", async () => {
    const { data, error } = await anonClient
      .from("campaigns")
      .select("*")
      .limit(1);

    // Should return empty array (RLS blocks access)
    expect(data?.length || 0).toBe(0);
  });

  test("unauthenticated users cannot access enrichment_credits", async () => {
    const { data, error } = await anonClient
      .from("enrichment_credits")
      .select("*")
      .limit(1);

    // Should return empty array (RLS blocks access)
    expect(data?.length || 0).toBe(0);
  });

  test("unauthenticated users CAN read active tenants (for signup)", async () => {
    const { data, error } = await anonClient
      .from("tenant")
      .select("id, domain")
      .eq("active", true)
      .limit(1);

    // This SHOULD work - tenants need to be readable for domain verification
    expect(error).toBeNull();
    // If there are active tenants, we should be able to see them
  });

  test("service role can access all data", async () => {
    // Service role bypasses RLS
    const { data: profiles, error: profilesError } = await serviceClient
      .from("profiles")
      .select("id")
      .limit(1);

    // Service role should be able to access data
    expect(profilesError).toBeNull();
  });

  test.describe("Authenticated User Tests", () => {
    let authClient: ReturnType<typeof createClient>;
    let testOrganizationId: string | null = null;

    test.beforeAll(async () => {
      // Skip if no test credentials
      if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
        console.log("Skipping authenticated tests - no test credentials");
        return;
      }

      // Create authenticated client (env vars already validated in parent beforeAll)
      authClient = createClient(env.url, env.publishableKey);

      // Sign in
      const { error } = await authClient.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });

      if (error) {
        console.log("Could not sign in test user:", error.message);
        return;
      }

      // Get user's tenant
      const { data: profile } = await authClient
        .from("profiles")
        .select("organization_id")
        .single();

      testOrganizationId =
        (profile as { organization_id: string } | null)?.organization_id ||
        null;
    });

    test.afterAll(async () => {
      if (authClient) {
        await authClient.auth.signOut();
      }
    });

    test("authenticated user can read their own profile", async () => {
      if (!authClient) {
        test.skip();
        return;
      }

      const {
        data: { user },
      } = await authClient.auth.getUser();

      if (!user) {
        test.skip();
        return;
      }

      const { data, error } = await authClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      expect(error).toBeNull();
      expect((data as { id: string } | null)?.id).toBe(user.id);
    });

    test("authenticated user can read their tenant's prospects", async () => {
      if (!authClient || !testOrganizationId) {
        test.skip();
        return;
      }

      const { data, error } = await authClient
        .from("prospects")
        .select("id, organization_id")
        .limit(5);

      expect(error).toBeNull();

      // All returned prospects should be from user's tenant
      if (data && data.length > 0) {
        (data as Array<{ id: string; organization_id: string }>).forEach(
          (prospect) => {
            expect(prospect.organization_id).toBe(testOrganizationId);
          }
        );
      }
    });

    test("authenticated user can read their tenant's campaigns", async () => {
      if (!authClient || !testOrganizationId) {
        test.skip();
        return;
      }

      const { data, error } = await authClient
        .from("campaigns")
        .select("id, organization_id")
        .limit(5);

      expect(error).toBeNull();

      // All returned campaigns should be from user's tenant
      if (data && data.length > 0) {
        (data as Array<{ id: string; organization_id: string }>).forEach(
          (campaign) => {
            expect(campaign.organization_id).toBe(testOrganizationId);
          }
        );
      }
    });

    test("authenticated user can read their tenant's enrichment credits", async () => {
      if (!authClient || !testOrganizationId) {
        test.skip();
        return;
      }

      const { data, error } = await authClient
        .from("enrichment_credits")
        .select("id, organization_id")
        .limit(1);

      expect(error).toBeNull();

      // All returned credits should be from user's tenant
      if (data && data.length > 0) {
        (data as Array<{ id: string; organization_id: string }>).forEach(
          (credit) => {
            expect(credit.organization_id).toBe(testOrganizationId);
          }
        );
      }
    });

    test("authenticated user cannot see other tenants' data", async () => {
      if (!authClient || !testOrganizationId) {
        test.skip();
        return;
      }

      // Get a different tenant's ID using service role
      const { data: otherTenants } = await serviceClient
        .from("tenant")
        .select("id")
        .neq("id", testOrganizationId)
        .limit(1);

      if (!otherTenants || otherTenants.length === 0) {
        console.log("No other tenants to test against");
        test.skip();
        return;
      }

      const otherOrganizationId = (otherTenants[0] as { id: string }).id;

      // Try to access other tenant's prospects directly
      const { data: prospects } = await authClient
        .from("prospects")
        .select("id")
        .eq("organization_id", otherOrganizationId)
        .limit(1);

      // Should return empty - RLS should block access
      expect(prospects?.length || 0).toBe(0);
    });
  });
});

