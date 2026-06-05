/**
 * Idempotent seed for the dedicated marketing-screenshot org.
 *
 * Usage:
 *   bun run seed:screenshots
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { loadEnv } from "./lib/load-env";
import {
  SCREENSHOT_ORG_ID,
  SCREENSHOT_ORG_NAME,
  SCREENSHOT_STATE_PATH,
  SCREENSHOT_USER_EMAIL,
  SCREENSHOT_USER_NAME,
  SCREENSHOT_USER_PASSWORD,
  isFixtureSeedEmail,
  resolveSeedViewerEmails,
  type ScreenshotState,
} from "./lib/screenshot-config";
import { MOCK_PROSPECT_ID } from "./lib/messagerie-mocks";
import {
  CAMPAIGN_JOB_DEFS,
  COLLEAGUE_USERS,
  SCREENSHOT_DASHBOARD_STATS,
  SCREENSHOT_PROSPECT_COUNT,
  WORKFLOW_LINKEDIN_ID,
  WORKFLOW_RELANCES_ID,
  avatarUrl,
  buildActivityVolumeBookingRows,
  buildActivityVolumeCallSessions,
  buildActivityVolumeMessageRows,
  buildBddLists,
  buildBulkActivityRows,
  buildClosingActivityRows,
  buildEventSlots,
  buildFunnelChatRows,
  buildFunnelInviteRows,
  buildFunnelRdvRows,
  buildLinkedInAcceptanceRows,
  buildLinkedInMessageRows,
  buildProspectSeeds,
  buildCallSessionProspectRows,
  daysAgo,
  funnelClosingProspectIds,
  todayAt,
} from "./lib/screenshot-seed-data";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CANVAS_WORKFLOW_ID = "c1111111-1111-4111-8111-111111111111";
const CALL_SESSION_ID = "d1111111-1111-4111-8111-111111111111";
const CALL_SESSION_2_ID = "d2222222-2222-4222-8222-222222222222";
/** Must match `TRIGGER_NODE_ID` in workflows/_components/xy-canvas.tsx */
const TRIGGER_NODE_ID = "__trigger__";

const WORKFLOW_DEF_SNAPSHOT = {
  schemaVersion: 1 as const,
  steps: [
    {
      id: "wa_confirm",
      type: "whatsapp_message",
      config: { messageTemplate: "Bonjour {{prenom}}, merci pour votre RDV !" },
      next_id: "wait_1",
    },
    {
      id: "wait_1",
      type: "wait",
      config: { durationHours: 24, onlyIfNoReply: false },
      next_id: "wa_followup",
    },
    {
      id: "wa_followup",
      type: "whatsapp_message",
      config: { messageTemplate: "Comment s'est passé notre échange ?" },
      next_id: "crm_1",
    },
    {
      id: "crm_1",
      type: "crm",
      config: { field: "status", value: "qualified", notifyOwner: true },
    },
  ],
};

function buildCanvasWorkflowDefinition() {
  return WORKFLOW_DEF_SNAPSHOT;
}

function buildCanvasMetadata() {
  return {
    icon: "Workflow",
    color: "emerald",
    trigger: "on_booking",
    canvas: {
      [TRIGGER_NODE_ID]: { x: 80, y: 220 },
      wa_confirm: { x: 320, y: 180 },
      wait_1: { x: 560, y: 220 },
      wa_followup: { x: 800, y: 180 },
      crm_1: { x: 1040, y: 220 },
    },
  };
}

async function findAuthUserByEmail(
  email: string
): Promise<{ id: string } | null> {
  for (let page = 1; page <= 20; page++) {
    const { data: listed, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`list users — ${error.message}`);
    const hit = listed?.users?.find((u) => u.email === email);
    if (hit) return { id: hit.id };
    if ((listed?.users?.length ?? 0) < 200) break;
  }
  return null;
}

async function ensureUser(
  email: string,
  password: string,
  fullName: string,
  fixedId?: string
): Promise<string> {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    return existing.id;
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    ...(fixedId ? { id: fixedId } : {}),
  });
  if (error || !created.user) {
    throw new Error(`Could not create user ${email} — ${error?.message}`);
  }
  return created.user.id;
}

async function ensureScreenshotUser(): Promise<string> {
  return ensureUser(
    SCREENSHOT_USER_EMAIL,
    SCREENSHOT_USER_PASSWORD,
    SCREENSHOT_USER_NAME
  );
}

async function ensureColleagues(): Promise<string[]> {
  const ids: string[] = [];
  for (const c of COLLEAGUE_USERS) {
    const id = await ensureUser(
      c.email,
      SCREENSHOT_USER_PASSWORD,
      c.name,
      c.id
    );
    await admin.from("profiles").upsert(
      {
        id,
        email: c.email,
        full_name: c.name,
        avatar_url: avatarUrl(c.email),
        active_organization_id: SCREENSHOT_ORG_ID,
      },
      { onConflict: "id" }
    );
    await admin.from("organization_members").upsert(
      {
        organization_id: SCREENSHOT_ORG_ID,
        user_id: id,
        role: "member",
      },
      { onConflict: "organization_id,user_id" }
    );
    ids.push(id);
  }
  return ids;
}

async function wipeOrgData(orgId: string): Promise<void> {
  const { data: runs } = await admin
    .from("workflow_runs")
    .select("id")
    .eq("organization_id", orgId);
  const runIds = (runs ?? []).map((r) => r.id);
  if (runIds.length) {
    await admin.from("workflow_step_executions").delete().in("run_id", runIds);
  }
  await admin.from("workflow_runs").delete().eq("organization_id", orgId);

  const { data: wfs } = await admin
    .from("workflows")
    .select("id")
    .eq("organization_id", orgId);
  const wfIds = (wfs ?? []).map((w) => w.id);
  if (wfIds.length) {
    await admin.from("workflow_versions").delete().in("workflow_id", wfIds);
  }
  await admin.from("workflows").delete().eq("organization_id", orgId);

  const { data: sessions } = await admin
    .from("call_sessions")
    .select("id")
    .eq("organization_id", orgId);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length) {
    await admin.from("call_session_notes").delete().in("call_session_id", sessionIds);
    await admin.from("call_session_prospects").delete().in("call_session_id", sessionIds);
  }
  await admin.from("call_sessions").delete().eq("organization_id", orgId);

  const { data: jobs } = await admin
    .from("campaign_jobs")
    .select("id")
    .eq("organization_id", orgId);
  const jobIds = (jobs ?? []).map((j) => j.id);
  if (jobIds.length) {
    await admin.from("campaign_job_prospects").delete().in("job_id", jobIds);
  }
  await admin.from("campaign_jobs").delete().eq("organization_id", orgId);

  await admin.from("quick_bookings").delete().eq("organization_id", orgId);
  await admin.from("events").delete().eq("organization_id", orgId);
  await admin.from("prospect_activity").delete().eq("organization_id", orgId);
  await admin.from("unipile_chat_prospects").delete().eq("organization_id", orgId);
  await admin.from("prospects").delete().eq("organization_id", orgId);
  await admin.from("bdd").delete().eq("organization_id", orgId);
}

/**
 * Point local dev account(s) at the screenshot org so /dashboard reads seeded data
 * without logging in as screenshots@andoxa.dev.
 */
async function loadAuthUsers(): Promise<Array<{ id: string; email?: string }>> {
  const authUsers: Array<{ id: string; email?: string }> = [];
  for (let page = 1; page <= 20; page++) {
    const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listErr) throw new Error(`list users for seed viewers — ${listErr.message}`);
    const batch = listed?.users ?? [];
    authUsers.push(...batch.map((u) => ({ id: u.id, email: u.email })));
    if (batch.length < 200) break;
  }
  return authUsers;
}

async function attachSeedViewers(): Promise<string[]> {
  const authUsers = await loadAuthUsers();
  const emails = [...resolveSeedViewerEmails()];
  const attached: string[] = [];

  const realAccounts = authUsers
    .map((u) => u.email)
    .filter((e): e is string => !!e && !isFixtureSeedEmail(e));

  if (emails.length === 0) return attached;

  for (const email of emails) {
    if (email === SCREENSHOT_USER_EMAIL) continue;

    const userId = authUsers.find((u) => u.email === email)?.id ?? null;
    if (!userId) {
      console.warn(`  ⚠ Seed viewer not found (sign up first): ${email}`);
      continue;
    }

    const { error: memberErr } = await admin.from("organization_members").upsert(
      {
        organization_id: SCREENSHOT_ORG_ID,
        user_id: userId,
        role: "owner",
      },
      { onConflict: "organization_id,user_id" }
    );
    if (memberErr) {
      throw new Error(`attach member ${email} — ${memberErr.message}`);
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ active_organization_id: SCREENSHOT_ORG_ID })
      .eq("id", userId);
    if (profileErr) {
      throw new Error(`attach profile ${email} — ${profileErr.message}`);
    }

    console.log(`  ✓ Active org → ${SCREENSHOT_ORG_NAME} for ${email}`);
    attached.push(email);
  }

  if (attached.length === 0 && realAccounts.length > 0) {
    console.warn(
      `  ⚠ No dev viewer attached. Set ANDOXA_DEV_EMAIL to one of: ${realAccounts.slice(0, 5).join(", ")}`
    );
  }

  return attached;
}

async function upsertOrg(userId: string): Promise<void> {
  const trialEnds = new Date();
  trialEnds.setFullYear(trialEnds.getFullYear() + 1);

  const { error: orgErr } = await admin.from("organizations").upsert(
    {
      id: SCREENSHOT_ORG_ID,
      name: SCREENSHOT_ORG_NAME,
      owner_id: userId,
      slug: "acme-sales",
      plan: "team",
      status: "active",
      subscription_status: "active",
      trial_ends_at: trialEnds.toISOString(),
      credits: 500,
      logo_url: null,
      metadata: {
        dashboard_targets: {
          rdv_per_month: 48,
          closings_per_month: SCREENSHOT_DASHBOARD_STATS.kpi.closingsTarget,
        },
      },
    },
    { onConflict: "id" }
  );
  if (orgErr) throw new Error(`organizations upsert — ${orgErr.message}`);

  await admin.from("organization_members").upsert(
    {
      organization_id: SCREENSHOT_ORG_ID,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "organization_id,user_id" }
  );

  await admin.from("profiles").upsert(
    {
      id: userId,
      email: SCREENSHOT_USER_EMAIL,
      full_name: SCREENSHOT_USER_NAME,
      avatar_url: avatarUrl(SCREENSHOT_USER_EMAIL),
      booking_slug: "marie-dupont",
      active_organization_id: SCREENSHOT_ORG_ID,
    },
    { onConflict: "id" }
  );
}

/** Re-apply after wipe/seed so the fixture account always lands on Acme Sales. */
async function ensureScreenshotActiveWorkspace(userId: string): Promise<void> {
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: SCREENSHOT_USER_EMAIL,
      full_name: SCREENSHOT_USER_NAME,
      avatar_url: avatarUrl(SCREENSHOT_USER_EMAIL),
      booking_slug: "marie-dupont",
      active_organization_id: SCREENSHOT_ORG_ID,
    },
    { onConflict: "id" }
  );
  if (profileErr) {
    throw new Error(`screenshot active workspace — ${profileErr.message}`);
  }

  const { error: memberErr } = await admin.from("organization_members").upsert(
    {
      organization_id: SCREENSHOT_ORG_ID,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "organization_id,user_id" }
  );
  if (memberErr) {
    throw new Error(`screenshot org membership — ${memberErr.message}`);
  }
}

async function insertInBatches<T extends Record<string, unknown>>(
  table: "prospect_activity" | "prospects",
  rows: T[],
  batchSize = 80
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await admin.from(table).insert(batch as any);
    if (error) throw new Error(`${table} batch ${i} — ${error.message}`);
  }
}

async function seedBddLists(userId: string): Promise<Map<number, string>> {
  const lists = buildBddLists();
  const map = new Map<number, string>();
  for (let i = 0; i < lists.length; i++) {
    const list = lists[i]!;
    const { error } = await admin.from("bdd").upsert(
      {
        id: list.id,
        organization_id: SCREENSHOT_ORG_ID,
        name: list.name,
        proprietaire: userId,
        source: i % 3 === 0 ? "csv" : i % 3 === 1 ? "linkedin_extension" : "manual",
        created_at: daysAgo(10 + i * 3),
      },
      { onConflict: "id" }
    );
    if (error) throw new Error(`bdd ${list.name} — ${error.message}`);
    map.set(i, list.id);
  }
  return map;
}

async function seedProspects(
  userId: string,
  bddMap: Map<number, string>
): Promise<string[]> {
  const ids: string[] = [];
  const seeds = buildProspectSeeds(SCREENSHOT_PROSPECT_COUNT);

  const messagerieRow = {
    id: MOCK_PROSPECT_ID,
    user_id: userId,
    organization_id: SCREENSHOT_ORG_ID,
    full_name: "Sophie Martin",
    company: "NovaTech",
    job_title: "Directrice Marketing",
    email: "sophie.martin@novatech.fr",
    phone: "+33601020304",
    linkedin: "https://linkedin.com/in/sophiemartin",
    status: "qualified",
    source: "linkedin_extension",
    created_at: daysAgo(45),
    updated_at: daysAgo(1),
    last_contact: daysAgo(1),
    enrichment_metadata: { profile_picture_url: avatarUrl(MOCK_PROSPECT_ID) },
    bdd_id: bddMap.get(0) ?? null,
  };

  const { error: mErr } = await admin.from("prospects").upsert(messagerieRow, {
    onConflict: "id",
  });
  if (mErr) throw new Error(`messagerie prospect — ${mErr.message}`);
  ids.push(MOCK_PROSPECT_ID);

  const bulkRows: Array<Record<string, unknown>> = [];
  for (const p of seeds) {
    if (p.name === "Sophie Martin") continue;
    const slug = p.name.toLowerCase().replace(/\s+/g, ".");
    bulkRows.push({
      user_id: userId,
      organization_id: SCREENSHOT_ORG_ID,
      full_name: p.name,
      company: p.company,
      job_title: p.jobTitle,
      email: `${slug}@${p.company.toLowerCase().replace(/\s+/g, "")}.fr`,
      phone: `+336${String(10000000 + bulkRows.length).slice(-8)}`,
      status: p.status,
      source: p.source,
      bdd_id: p.bddIndex != null ? bddMap.get(p.bddIndex) ?? null : null,
      created_at: daysAgo(p.createdDaysAgo),
      updated_at: daysAgo(p.lastContactDaysAgo),
      last_contact: daysAgo(p.lastContactDaysAgo),
      enrichment_metadata: {
        profile_picture_url: avatarUrl(`${p.name}-${p.company}`),
      },
    });
  }

  for (let i = 0; i < bulkRows.length; i += 50) {
    const batch = bulkRows.slice(i, i + 50);
    const { data, error } = await admin
      .from("prospects")
      .insert(batch)
      .select("id");
    if (error) throw new Error(`prospect batch ${i} — ${error.message}`);
    ids.push(...(data ?? []).map((r) => r.id));
  }

  return ids;
}

async function seedUnipileChats(prospectIds: string[]): Promise<void> {
  const rows = buildFunnelChatRows(SCREENSHOT_ORG_ID, prospectIds);
  await admin.from("unipile_chat_prospects").upsert(rows, {
    onConflict: "prospect_id,unipile_chat_id",
  });
}

async function seedFunnelRdvs(userId: string, prospectIds: string[]): Promise<void> {
  const rows = buildFunnelRdvRows(SCREENSHOT_ORG_ID, userId, prospectIds);
  const { error } = await admin.from("events").insert(rows);
  if (error) throw new Error(`funnel RDV events — ${error.message}`);
}

async function seedFunnelClosings(prospectIds: string[]): Promise<void> {
  const ids = funnelClosingProspectIds(prospectIds);
  for (let i = 0; i < ids.length; i++) {
    const closedAt = daysAgo(4 + (i % 18), 14);
    const { error } = await admin
      .from("prospects")
      .update({
        status: "won",
        updated_at: closedAt,
        last_contact: closedAt,
      })
      .eq("id", ids[i]!);
    if (error) throw new Error(`funnel closing prospect — ${error.message}`);
  }
}

async function seedWorkflowRuns(
  userId: string,
  prospectIds: string[],
  bddMap: Map<number, string>
): Promise<void> {
  const seeds = buildProspectSeeds(SCREENSHOT_PROSPECT_COUNT);
  const steps = WORKFLOW_DEF_SNAPSHOT.steps;
  const bddIds = [...bddMap.values()];
  const bddFor = (i: number) => bddIds[i % bddIds.length] ?? null;

  type RunSeed = {
    workflow_id: string;
    prospect_id: string;
    status: string;
    current_step_index: number;
    last_error?: string | null;
    enrollBdd: string | null;
    createdDaysAgo: number;
  };
  const runSeeds: RunSeed[] = [];

  // Active runs (running / paused) — these also back the CRM prospect workflow
  // badges, so their status mirrors `seed.inWorkflow`. Enrollment list ids in
  // `context` populate the workflow detail's "par liste" filter.
  prospectIds.forEach((pid, i) => {
    const seed = seeds[i];
    if (!seed?.inWorkflow) return;
    runSeeds.push({
      workflow_id:
        seed.inWorkflow === "paused" ? WORKFLOW_RELANCES_ID : CANVAS_WORKFLOW_ID,
      prospect_id: pid,
      status: seed.inWorkflow,
      current_step_index: (seed.workflowStep ?? 1) - 1,
      enrollBdd: bddFor(i),
      createdDaysAgo: 3 + (i % 10),
    });
  });

  // Completed runs — drive runs_completed_pct and steps_progress_pct (every
  // step done). Distinct prospect slice so the one-active-run-per-prospect
  // partial unique index never trips.
  prospectIds.slice(120, 156).forEach((pid, i) => {
    runSeeds.push({
      workflow_id: i % 3 === 0 ? WORKFLOW_RELANCES_ID : CANVAS_WORKFLOW_ID,
      prospect_id: pid,
      status: "completed",
      current_step_index: steps.length,
      enrollBdd: bddFor(i + 2),
      createdDaysAgo: 10 + (i % 20),
    });
  });

  // Failed runs — drive failed_runs_count + sample_errors.
  const errs = [
    "Compte LinkedIn déconnecté pendant l'envoi.",
    "Limite d'invitations LinkedIn atteinte pour aujourd'hui.",
    "Numéro WhatsApp introuvable pour ce prospect.",
    "Prospect désinscrit avant la fin du parcours.",
  ];
  prospectIds.slice(156, 164).forEach((pid, i) => {
    runSeeds.push({
      workflow_id: CANVAS_WORKFLOW_ID,
      prospect_id: pid,
      status: "failed",
      current_step_index: 1 + (i % 2),
      last_error: errs[i % errs.length],
      enrollBdd: bddFor(i + 5),
      createdDaysAgo: 6 + (i % 12),
    });
  });

  if (runSeeds.length === 0) return;

  const { data: insertedRuns, error } = await admin
    .from("workflow_runs")
    .insert(
      runSeeds.map((r) => ({
        organization_id: SCREENSHOT_ORG_ID,
        workflow_id: r.workflow_id,
        prospect_id: r.prospect_id,
        started_by: userId,
        status: r.status,
        current_step_index: r.current_step_index,
        definition_snapshot: WORKFLOW_DEF_SNAPSHOT,
        context: r.enrollBdd ? { enrollment_bdd_ids: [r.enrollBdd] } : {},
        has_outbound_step: true,
        last_error: r.last_error ?? null,
        created_at: daysAgo(r.createdDaysAgo),
      }))
    )
    .select("id, status, current_step_index");
  if (error) throw new Error(`workflow runs — ${error.message}`);

  // Per-run step executions — these power `steps_progress_pct` and the
  // queue counters (pending / processing) on the workflow detail page.
  const execRows: Array<Record<string, unknown>> = [];
  (insertedRuns ?? []).forEach((run, runIdx) => {
    const csi = run.current_step_index ?? 0;
    steps.forEach((step, idx) => {
      let status: string | null = null;
      let processedAt: string | null = null;
      if (run.status === "completed") {
        status = "completed";
        processedAt = daysAgo(2 + (idx % 5));
      } else if (run.status === "failed") {
        if (idx < csi) {
          status = "completed";
          processedAt = daysAgo(3 + idx);
        } else if (idx === csi) {
          status = "failed";
          processedAt = daysAgo(2);
        } else return;
      } else {
        // running / paused
        if (idx < csi) {
          status = "completed";
          processedAt = daysAgo(2 + idx);
        } else if (idx === csi) {
          // A handful of running runs sit "processing"; the rest are queued.
          status =
            run.status === "running" && runIdx % 7 === 0
              ? "processing"
              : "pending";
        } else return;
      }
      execRows.push({
        run_id: run.id,
        step_id: step.id,
        step_index: idx,
        step_type: step.type,
        status,
        processed_at: processedAt,
        run_after: daysAgo(1),
        config_snapshot: step.config ?? {},
        idempotency_key: `${run.id}:${step.id}`,
      });
    });
  });

  for (let i = 0; i < execRows.length; i += 100) {
    const batch = execRows.slice(i, i + 100);
    const { error: eErr } = await admin
      .from("workflow_step_executions")
      .insert(batch);
    if (eErr) throw new Error(`workflow step executions ${i} — ${eErr.message}`);
  }
}

/**
 * Workflow activity feed — `prospect_activity` rows carrying `workflow_id` so
 * the workflow detail page's "Activité récente" panel isn't empty (it filters
 * strictly on workflow_id, which none of the other activity rows set).
 */
async function seedWorkflowActivity(
  userId: string,
  prospectIds: string[]
): Promise<void> {
  const plans = [
    { id: CANVAS_WORKFLOW_ID, name: "Post-RDV WhatsApp", offset: 0 },
    { id: WORKFLOW_RELANCES_ID, name: "Relance 48 h sans réponse", offset: 60 },
  ];
  const stepTypes = ["whatsapp_message", "wait", "linkedin_message"];
  const rows: Array<Record<string, unknown>> = [];

  for (const wf of plans) {
    for (let i = 0; i < 28; i++) {
      const pid = prospectIds[(wf.offset + i) % prospectIds.length]!;
      const day = i % 14;
      rows.push({
        organization_id: SCREENSHOT_ORG_ID,
        prospect_id: pid,
        actor_id: userId,
        workflow_id: wf.id,
        action: "workflow_enrolled",
        details: { workflow_name: wf.name },
        created_at: daysAgo(day + 2, 9 + (i % 6)),
      });
      rows.push({
        organization_id: SCREENSHOT_ORG_ID,
        prospect_id: pid,
        actor_id: userId,
        workflow_id: wf.id,
        action: "workflow_step_completed",
        details: { workflow_name: wf.name, step_type: stepTypes[i % 3] },
        created_at: daysAgo(day + 1, 12 + (i % 5)),
      });
      if (i % 4 === 0) {
        rows.push({
          organization_id: SCREENSHOT_ORG_ID,
          prospect_id: pid,
          actor_id: userId,
          workflow_id: wf.id,
          action: "workflow_run_completed",
          details: { workflow_name: wf.name },
          created_at: daysAgo(day, 16 + (i % 3)),
        });
      }
    }
  }

  await insertInBatches("prospect_activity", rows, 100);
}

async function seedCampaigns(
  userId: string,
  prospectIds: string[]
): Promise<string[]> {
  const jobIds: string[] = [];

  for (const job of CAMPAIGN_JOB_DEFS) {
    const { data: row, error } = await admin
      .from("campaign_jobs")
      .insert({
        organization_id: SCREENSHOT_ORG_ID,
        created_by: userId,
        type: job.type,
        status: job.status,
        total_count: job.total,
        processed_count: job.processed,
        success_count: job.success,
        error_count: job.errors,
        batch_size: 10,
        delay_ms: 2000,
        message_template: "Bonjour {{prenom}}, ...",
        metadata: { name: job.name },
        created_at: daysAgo(job.createdDaysAgo),
        started_at: daysAgo(job.startedDaysAgo),
        completed_at:
          job.status === "completed" ? daysAgo(job.startedDaysAgo - 1) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`campaign job — ${error.message}`);
    jobIds.push(row.id);

    const slice = prospectIds.slice(
      (jobIds.length - 1) * 8,
      (jobIds.length - 1) * 8 + 28
    );
    if (slice.length) {
      await admin.from("campaign_job_prospects").insert(
        slice.map((pid, i) => ({
          job_id: row.id,
          prospect_id: pid,
          status: i % 8 === 0 ? "error" : "success",
          processed_at: daysAgo(job.startedDaysAgo - (i % 5)),
        }))
      );
    }
  }

  return jobIds;
}

async function seedAllActivity(
  userId: string,
  prospectIds: string[],
  jobIds: string[]
): Promise<void> {
  const rows = [
    ...buildFunnelInviteRows(SCREENSHOT_ORG_ID, userId, prospectIds, jobIds),
    ...buildLinkedInMessageRows(SCREENSHOT_ORG_ID, userId, prospectIds),
    ...buildLinkedInAcceptanceRows(SCREENSHOT_ORG_ID, userId, prospectIds, jobIds),
    ...buildActivityVolumeMessageRows(SCREENSHOT_ORG_ID, userId, prospectIds),
    ...buildClosingActivityRows(SCREENSHOT_ORG_ID, userId, prospectIds),
    ...buildBulkActivityRows(SCREENSHOT_ORG_ID, userId, prospectIds, jobIds),
  ];

  await insertInBatches("prospect_activity", rows, 100);
}

async function seedActivityVolumeBookings(
  userId: string,
  prospectIds: string[]
): Promise<void> {
  const rows = buildActivityVolumeBookingRows(
    SCREENSHOT_ORG_ID,
    userId,
    prospectIds,
  );
  for (let i = 0; i < rows.length; i += 40) {
    const batch = rows.slice(i, i + 40);
    const { error } = await admin.from("quick_bookings").insert(batch);
    if (error) throw new Error(`activity volume quick_bookings — ${error.message}`);
  }
}

async function seedActivityVolumeCallSessions(userId: string): Promise<void> {
  const sessions = buildActivityVolumeCallSessions();
  for (const session of sessions) {
    const { error } = await admin.from("call_sessions").insert({
      organization_id: SCREENSHOT_ORG_ID,
      created_by: userId,
      title: session.title,
      status: "completed",
      script_template: "Script volume activité",
      created_at: session.createdAt,
      ended_at: session.createdAt,
      total_duration_s: 900,
    });
    if (error) {
      throw new Error(`activity volume call session — ${error.message}`);
    }
  }
}

async function seedCallSessions(
  userId: string,
  prospectIds: string[]
): Promise<void> {
  const sessions = [
    {
      id: CALL_SESSION_ID,
      title: "Session — ICP Enterprise",
      status: "active" as const,
      script:
        "1. Intro — présenter Andoxa\n2. Qualifier le besoin CRM\n3. Proposer un RDV démo",
      created_at: daysAgo(15, 12),
      total_duration_s: 4_200,
    },
    {
      id: CALL_SESSION_2_ID,
      title: "Relance Q2 — PME",
      status: "completed" as const,
      script: "1. Rappel contexte\n2. Objections\n3. Next steps",
      created_at: daysAgo(22, 10),
      ended_at: daysAgo(21, 18),
      total_duration_s: 7_800,
    },
  ];

  for (const s of sessions) {
    const { error: sErr } = await admin.from("call_sessions").upsert(
      {
        id: s.id,
        organization_id: SCREENSHOT_ORG_ID,
        created_by: userId,
        title: s.title,
        status: s.status,
        script_template: s.script,
        created_at: s.created_at,
        ended_at: "ended_at" in s ? s.ended_at : null,
        total_duration_s: s.total_duration_s,
      },
      { onConflict: "id" }
    );
    if (sErr) throw new Error(`call session — ${sErr.message}`);
  }

  // Older completed sessions (each with prospects so cards are not 0/0)
  const olderPlans = [
    { title: "Session 30 avr. · MQL T1", daysAgoVal: 28, total: 14, processed: 14, rdv: 4, noanswer: 2, callback: 3, refused: 3, wrong: 2 },
    { title: "Session 24 avr. · Inbound demos", daysAgoVal: 34, total: 10, processed: 10, rdv: 5, noanswer: 1, callback: 2, refused: 1, wrong: 1 },
    { title: "Session 18 avr. · Renewals Q2", daysAgoVal: 40, total: 22, processed: 22, rdv: 3, noanswer: 8, callback: 5, refused: 4, wrong: 2 },
  ] as const;

  let prospectOffset = 40;
  for (const plan of olderPlans) {
    const { data: inserted, error: insErr } = await admin
      .from("call_sessions")
      .insert({
        organization_id: SCREENSHOT_ORG_ID,
        created_by: userId,
        title: plan.title,
        status: "completed",
        script_template: "Script standard outbound",
        created_at: daysAgo(plan.daysAgoVal, 10),
        ended_at: daysAgo(plan.daysAgoVal - 1, 17),
        total_duration_s: 5_400 + plan.total * 120,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      throw new Error(`call session (older) — ${insErr?.message ?? "no id"}`);
    }
    const rows = buildCallSessionProspectRows(
      inserted.id,
      prospectIds.slice(prospectOffset, prospectOffset + plan.total),
      { ...plan, calling: 0 },
    );
    prospectOffset += plan.total;
    const { error: linkErr } = await admin.from("call_session_prospects").insert(rows);
    if (linkErr) throw new Error(`call session prospects — ${linkErr.message}`);
  }

  // Primary running session — mirrors design mock (18 total, 7 processed, 2 RDV, ~71% pickup)
  const primaryRows = buildCallSessionProspectRows(
    CALL_SESSION_ID,
    prospectIds.slice(0, 24),
    {
      total: 24,
      processed: 11,
      rdv: 3,
      noanswer: 3,
      callback: 2,
      refused: 2,
      wrong: 1,
      calling: 1,
    },
  );
  const { error: primaryErr } = await admin
    .from("call_session_prospects")
    .insert(primaryRows);
  if (primaryErr) throw new Error(`call session prospects (primary) — ${primaryErr.message}`);

  const completedRows = buildCallSessionProspectRows(
    CALL_SESSION_2_ID,
    prospectIds.slice(24, 38),
    {
      total: 14,
      processed: 14,
      rdv: 4,
      noanswer: 3,
      callback: 3,
      refused: 2,
      wrong: 2,
      calling: 0,
    },
  );
  const { error: completedErr } = await admin
    .from("call_session_prospects")
    .insert(completedRows);
  if (completedErr) {
    throw new Error(`call session prospects (completed) — ${completedErr.message}`);
  }
}

async function seedWorkflows(userId: string): Promise<void> {
  const canvasDef = buildCanvasWorkflowDefinition();
  const canvasMeta = buildCanvasMetadata();

  const { error: canvasErr } = await admin.from("workflows").upsert(
    {
      id: CANVAS_WORKFLOW_ID,
      organization_id: SCREENSHOT_ORG_ID,
      name: "Post-RDV WhatsApp",
      description: "Confirmation, rappel et suivi après chaque rendez-vous.",
      created_by: userId,
      is_active: true,
      is_template: false,
      draft_definition: canvasDef,
      published_definition: canvasDef,
      metadata: canvasMeta,
      trigger_kind: "on_booking",
      run_mode: "terminating",
    },
    { onConflict: "id" }
  );
  if (canvasErr) throw new Error(`canvas workflow — ${canvasErr.message}`);

  const relanceDef = {
    schemaVersion: 1,
    steps: [
      {
        id: "wa_1",
        type: "whatsapp_message",
        config: { messageTemplate: "Bonjour {{prenom}} !" },
        next_id: "wait_1",
      },
      { id: "wait_1", type: "wait", config: { durationHours: 48 } },
    ],
  };

  const linkedinDef = {
    schemaVersion: 1,
    steps: [
      {
        id: "li_1",
        type: "linkedin_message",
        config: { messageTemplate: "Ravi de vous connecter {{prenom}} !" },
      },
    ],
  };

  const fixedWorkflows = [
    {
      id: WORKFLOW_RELANCES_ID,
      name: "Relance 48 h sans réponse",
      description: "WhatsApp automatique si pas de réponse sous 48 h.",
      is_active: true,
      trigger_kind: "manual",
      tags: ["WhatsApp"],
      color: "emerald",
      def: relanceDef,
    },
    {
      id: WORKFLOW_LINKEDIN_ID,
      name: "LinkedIn → Bienvenue",
      description: "Message de bienvenue après acceptation.",
      is_active: true,
      trigger_kind: "manual",
      tags: ["LinkedIn"],
      color: "indigo",
      def: linkedinDef,
    },
  ];

  for (const wf of fixedWorkflows) {
    await admin.from("workflows").upsert(
      {
        id: wf.id,
        organization_id: SCREENSHOT_ORG_ID,
        name: wf.name,
        description: wf.description,
        created_by: userId,
        is_active: wf.is_active,
        draft_definition: wf.def,
        published_definition: wf.def,
        metadata: { icon: "Workflow", color: wf.color, trigger: wf.trigger_kind },
        trigger_kind: wf.trigger_kind,
      },
      { onConflict: "id" }
    );
  }

  const listWorkflows = [
    {
      name: "No-show recovery",
      description: "Relance après absence au RDV.",
      is_active: false,
      trigger_kind: "manual",
      tags: ["WhatsApp", "CRM"],
      color: "amber",
    },
    {
      name: "Onboarding liste inbound",
      description: "Brouillon — séquence pour leads entrants.",
      is_active: false,
      trigger_kind: "on_list_add",
      tags: ["CRM"],
      color: "slate",
    },
  ];

  for (const wf of listWorkflows) {
    const def = relanceDef;
    await admin.from("workflows").insert({
      organization_id: SCREENSHOT_ORG_ID,
      name: wf.name,
      description: wf.description,
      created_by: userId,
      is_active: wf.is_active,
      draft_definition: def,
      published_definition: wf.is_active ? def : null,
      metadata: { icon: "Workflow", color: wf.color, trigger: wf.trigger_kind },
      trigger_kind: wf.trigger_kind,
    });
  }
}

async function seedCalendarEvents(
  userId: string,
  colleagueIds: string[],
  prospectIds: string[]
): Promise<void> {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + mondayOffset);

  const slots = buildEventSlots(userId, colleagueIds);

  for (let idx = 0; idx < slots.length; idx++) {
    const slot = slots[idx]!;
    let start: Date;
    if (slot.dayOffset === 0) {
      start = new Date(todayAt(slot.hour));
    } else if (slot.dayOffset < 0) {
      start = new Date(daysAgo(-slot.dayOffset, slot.hour));
    } else {
      start = new Date(base);
      start.setDate(start.getDate() + slot.dayOffset);
      start.setHours(slot.hour, 0, 0, 0);
    }
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const eventCreatedAt =
      slot.dayOffset === 0
        ? daysAgo(1, 8 + (idx % 4))
        : slot.dayOffset < 0
          ? daysAgo(-slot.dayOffset + 2, 9)
          : daysAgo(slot.dayOffset + 1, 9);

    await admin.from("events").insert({
      organization_id: SCREENSHOT_ORG_ID,
      title: slot.title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      prospect_id: slot.internal ? null : prospectIds[idx % prospectIds.length] ?? null,
      status: slot.status === "internal" ? "internal" : slot.status,
      meeting_kind: slot.internal ? "other" : "meet",
      event_type: slot.internal ? "internal" : "meeting",
      is_all_day: false,
      source: "andoxa",
      created_by: slot.owner,
      created_at: eventCreatedAt,
      attendee_user_ids: slot.attendees,
      guest_name: slot.internal
        ? null
        : buildProspectSeeds(SCREENSHOT_PROSPECT_COUNT)[idx % SCREENSHOT_PROSPECT_COUNT]?.name ?? null,
    });
  }

}

function writeState(userId: string): void {
  const state: ScreenshotState = {
    orgId: SCREENSHOT_ORG_ID,
    userId,
    email: SCREENSHOT_USER_EMAIL,
    routes: {
      dashboard: "/dashboard",
      crm: "/crm",
      campaigns: "/campaigns",
      callSession: `/campaigns/sessions/${CALL_SESSION_ID}`,
      messagerie: "/messagerie",
      calendar: "/calendar",
      workflowsList: "/workflows",
      workflowsCanvas: `/workflows/${CANVAS_WORKFLOW_ID}`,
    },
    updatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(SCREENSHOT_STATE_PATH), { recursive: true });
  fs.writeFileSync(SCREENSHOT_STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`\n✓ Wrote ${SCREENSHOT_STATE_PATH}`);
}

async function main(): Promise<void> {
  console.log("Seeding screenshot fixtures…");
  console.log(`  Org:   ${SCREENSHOT_ORG_ID} (${SCREENSHOT_ORG_NAME})`);
  console.log(`  User:  ${SCREENSHOT_USER_EMAIL}`);

  const userId = await ensureScreenshotUser();
  const colleagueIds = await ensureColleagues();
  await upsertOrg(userId);
  await wipeOrgData(SCREENSHOT_ORG_ID);

  const bddMap = await seedBddLists(userId);
  const prospectIds = await seedProspects(userId, bddMap);
  await seedFunnelClosings(prospectIds);
  await seedUnipileChats(prospectIds);
  await seedWorkflows(userId);
  await seedWorkflowRuns(userId, prospectIds, bddMap);
  await seedWorkflowActivity(userId, prospectIds);
  const jobIds = await seedCampaigns(userId, prospectIds);
  await seedAllActivity(userId, prospectIds, jobIds);
  await seedFunnelRdvs(userId, prospectIds);
  await seedCallSessions(userId, prospectIds);
  await seedCalendarEvents(userId, colleagueIds, prospectIds);
  await seedActivityVolumeBookings(userId, prospectIds);
  await seedActivityVolumeCallSessions(userId);

  await ensureScreenshotActiveWorkspace(userId);
  const attachedViewers = await attachSeedViewers();

  writeState(userId);
  console.log(`\n✓ Seeded ${prospectIds.length} prospects, ${jobIds.length} campaigns`);
  console.log(`\nDashboard fixtures — org « ${SCREENSHOT_ORG_NAME} »`);
  console.log(`  Period: « Ce mois » (30 derniers jours)`);
  console.log(`  Sign in: ${SCREENSHOT_USER_EMAIL}`);
  console.log(`  Password: ${SCREENSHOT_USER_PASSWORD}`);
  console.log(`  Profile: ${SCREENSHOT_USER_NAME}`);
  if (attachedViewers.length > 0) {
    console.log(`  Also attached: ${attachedViewers.join(", ")}`);
  }
  console.log("  → Sign out, log in as Marie Dupont, open /dashboard.");
  console.log("\n✓ Screenshot org ready. Run: bun run images:sync");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
