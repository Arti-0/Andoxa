/**
 * Manual IDOR probe — sensitive routes (do NOT run in CI).
 *
 * Prerequisites:
 *   - Two tenants (orgs) in the same environment: "attacker" and "victim".
 *   - Attacker: valid Supabase access JWT (same as browser session) for a user in org A.
 *   - Victim: known UUIDs from org B (prospect id, campaign_jobs id, workflows id, call_sessions id)
 *     obtained legally (second test account, SQL export in staging, etc.).
 *
 * Workspace context: API uses Bearer token OR cookies; this script uses Bearer only.
 * Active org is the profile's active_organization_id for the token user — you attack from org A
 * while passing B's resource IDs.
 *
 * Run from Andoxa repo root:
 *   BASE_URL=https://... ACCESS_TOKEN=eyJ... \
 *   VICTIM_PROSPECT_ID=... VICTIM_JOB_ID=... VICTIM_WORKFLOW_ID=... VICTIM_CALL_SESSION_ID=... \
 *   bun run scripts/test-idor.ts
 *
 * Expected if secured: HTTP 200 with body { success: true, data: ... } only for prospects when
 * victim id is wrong org → actually createApiHandler returns 404 as JSON with success: false.
 * Check printed status + parsed error code.
 *
 * DO NOT commit real tokens. Rotate any token used in testing.
 */

const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "") || "";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN?.trim() || "";

const VICTIM_PROSPECT_ID = process.env.VICTIM_PROSPECT_ID?.trim() || "";
const VICTIM_JOB_ID = process.env.VICTIM_JOB_ID?.trim() || "";
const VICTIM_WORKFLOW_ID = process.env.VICTIM_WORKFLOW_ID?.trim() || "";
const VICTIM_CALL_SESSION_ID = process.env.VICTIM_CALL_SESSION_ID?.trim() || "";

type Probe = { name: string; method: string; path: string; victimId: string };

function probes(): Probe[] {
  const list: Probe[] = [];
  if (VICTIM_PROSPECT_ID) {
    list.push({
      name: "GET /api/prospects/[id]",
      method: "GET",
      path: `/api/prospects/${encodeURIComponent(VICTIM_PROSPECT_ID)}`,
      victimId: VICTIM_PROSPECT_ID,
    });
    list.push({
      name: "PATCH /api/prospects/[id] (empty body — expect 404 if org mismatch; no row updated)",
      method: "PATCH",
      path: `/api/prospects/${encodeURIComponent(VICTIM_PROSPECT_ID)}`,
      victimId: VICTIM_PROSPECT_ID,
    });
  }
  if (VICTIM_JOB_ID) {
    list.push({
      name: "GET /api/campaigns/jobs/[id]",
      method: "GET",
      path: `/api/campaigns/jobs/${encodeURIComponent(VICTIM_JOB_ID)}`,
      victimId: VICTIM_JOB_ID,
    });
  }
  if (VICTIM_WORKFLOW_ID) {
    list.push({
      name: "GET /api/workflows/[id]",
      method: "GET",
      path: `/api/workflows/${encodeURIComponent(VICTIM_WORKFLOW_ID)}`,
      victimId: VICTIM_WORKFLOW_ID,
    });
  }
  if (VICTIM_CALL_SESSION_ID) {
    list.push({
      name: "GET /api/call-sessions/[id]",
      method: "GET",
      path: `/api/call-sessions/${encodeURIComponent(VICTIM_CALL_SESSION_ID)}`,
      victimId: VICTIM_CALL_SESSION_ID,
    });
  }
  return list;
}

async function runProbe(p: Probe): Promise<void> {
  const url = `${BASE_URL}${p.path}`;
  const init: RequestInit = {
    method: p.method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      Accept: "application/json",
      ...(p.method === "PATCH"
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      p.method === "PATCH"
        ? JSON.stringify({})
        : undefined,
  };

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    console.log(`[FAIL] ${p.name} — fetch error: ${e}`);
    return;
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text.slice(0, 200);
  }

  const summary = {
    route: p.name,
    victim_id: p.victimId,
    http_status: res.status,
    body_preview:
      typeof parsed === "object" && parsed !== null
        ? parsed
        : String(parsed).slice(0, 500),
  };

  const okEnvelope =
    typeof parsed === "object" &&
    parsed !== null &&
    "success" in parsed &&
    (parsed as { success?: boolean }).success === true;

  /** Secured expectation: 401 if bad token, or 4xx with no successful cross-tenant data */
  const likelyBlocked =
    res.status === 401 ||
    res.status === 403 ||
    res.status === 404 ||
    (res.status === 400 &&
      typeof parsed === "object" &&
      parsed !== null &&
      "success" in parsed &&
      (parsed as { success?: boolean }).success === false);

  const flag =
    okEnvelope && res.status < 400
      ? "🚨 REVIEW — success envelope with 2xx (possible IDOR if data is victim tenant)"
      : likelyBlocked
        ? "✅ Likely blocked (401/403/404 or success:false)"
        : "⚠️ Ambiguous — inspect body_preview";

  console.log(JSON.stringify({ ...summary, assessment: flag }, null, 2));
}

async function main() {
  if (!BASE_URL || !ACCESS_TOKEN) {
    console.error(
      "Set BASE_URL and ACCESS_TOKEN (attacker session JWT). Optional: VICTIM_* UUIDs."
    );
    process.exit(1);
  }

  const ps = probes();
  if (ps.length === 0) {
    console.error(
      "Set at least one of VICTIM_PROSPECT_ID, VICTIM_JOB_ID, VICTIM_WORKFLOW_ID, VICTIM_CALL_SESSION_ID."
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        message: "IDOR manual probe — attacker token against victim resource IDs",
        base_url: BASE_URL,
        probe_count: ps.length,
      },
      null,
      2
    )
  );

  for (const p of ps) {
    await runProbe(p);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
