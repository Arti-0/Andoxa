/**
 * Unipile Custom (Native) Authentication for LinkedIn with cookies.
 *
 * Used by the extension cookie-sync ingest route (when we ever add silent
 * first-connect — currently out of scope) and the silent-reconnect cron
 * branch. Hosted Auth remains the path for first-time connection.
 *
 * Contracts pinned 2026-05-23 against:
 *   - https://developer.unipile.com/reference/accountscontroller_createaccount.md
 *   - https://developer.unipile.com/reference/accountscontroller_reconnectaccount.md
 *
 * Create:  POST /api/v1/accounts             body { provider:"LINKEDIN", access_token, premium_token?, user_agent?, country?, ip?, proxy? }
 *                                            → 201 { object:"AccountCreated",     account_id }
 * Reconnect: POST /api/v1/accounts/{id}      same body schema
 *                                            → 201 { object:"AccountReconnected", account_id }
 *
 * Field names matter — Unipile responds 400 with `errors/invalid_body` on
 * unknown fields. If you find yourself wanting to add a parameter, verify
 * against the live docs before shipping.
 */

import { unipileFetch } from "./client";

export interface LinkedInCookieAuthInput {
  /** li_at session cookie. Required. */
  accessToken: string;
  /** li_a premium cookie. Required for Premium / Sales Navigator accounts. */
  premiumToken?: string | null;
  /** Browser UA captured when the cookie was collected. Strongly recommended. */
  userAgent?: string;
  /** ISO 3166-1 alpha-2 country code to bind a Unipile proxy. Optional — defaults to Unipile-picked. */
  country?: string;
}

interface CreateAccountResponse {
  object: "AccountCreated";
  account_id: string;
}

interface ReconnectAccountResponse {
  object: "AccountReconnected";
  account_id: string;
}

function buildBody(input: LinkedInCookieAuthInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    provider: "LINKEDIN",
    access_token: input.accessToken,
  };
  if (input.premiumToken) body.premium_token = input.premiumToken;
  if (input.userAgent) body.user_agent = input.userAgent;
  if (input.country) body.country = input.country.toLowerCase();
  return body;
}

/**
 * Create a new Unipile account from collected LinkedIn cookies. Returns the
 * fresh account_id; caller is responsible for persisting it on
 * `user_unipile_accounts`. The webhook will subsequently fire `ACCOUNT_STATUS_OK`.
 *
 * Currently UNUSED — first-time connect always goes through Hosted Auth in
 * this iteration. Exported for the planned Phase 5 silent first-connect.
 */
export async function createLinkedInAccountWithCookies(
  input: LinkedInCookieAuthInput
): Promise<{ accountId: string }> {
  const res = await unipileFetch<CreateAccountResponse>("/accounts", {
    method: "POST",
    body: JSON.stringify(buildBody(input)),
  });
  return { accountId: res.account_id };
}

/**
 * Silently re-establish credentials for an account that flipped to
 * ACCOUNT_CREDENTIALS, using the most recent cookies pushed by the extension.
 * The webhook will fire `RECONNECTED` on success, which flips the local row
 * back to status='connected'.
 *
 * Path parameter is the existing unipile_account_id. Schema mirrors create.
 */
export async function reconnectLinkedInAccountWithCookies(
  accountId: string,
  input: LinkedInCookieAuthInput
): Promise<{ accountId: string }> {
  const res = await unipileFetch<ReconnectAccountResponse>(
    `/accounts/${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      body: JSON.stringify(buildBody(input)),
    }
  );
  return { accountId: res.account_id };
}
