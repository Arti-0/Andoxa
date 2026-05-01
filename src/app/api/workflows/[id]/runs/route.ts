import { createApiHandler, Errors, getPagination, parseBody } from "@/lib/api";
import { assertMessagerieAndTemplatesPlan } from "@/lib/billing/plan-gates";
import type { Database, Json } from "@/lib/types/supabase";

type WorkflowRunRow = Database["public"]["Tables"]["workflow_runs"]["Row"];
import { logWorkflowEnrolled } from "@/lib/prospect-activity";
import {
  enqueueFirstStep,
  parseEnrollmentBddIdsFromContext,
  parseWorkflowDefinition,
} from "@/lib/workflows";
import {
  definitionRequiresLinkedIn,
  definitionRequiresWhatsApp,
} from "@/lib/workflows/schema";
import { getWorkflowPublishedDefinition } from "@/lib/workflows/queries";
import {
  getLinkedInAccountIdForUserId,
  getWhatsAppAccountIdForUserId,
} from "@/lib/unipile/account";

function getWorkflowIdFromUrl(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = segments.indexOf("workflows");
  return segments[i + 1] ?? "";
}

/**
 * GET /api/workflows/[id]/runs
 */
export const GET = createApiHandler(async (req, ctx) => {
  assertMessagerieAndTemplatesPlan(ctx);
  if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
  const workflowId = getWorkflowIdFromUrl(req);
  if (!workflowId) throw Errors.badRequest("ID workflow manquant");

  const { data: wf } = await ctx.supabase
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("organization_id", ctx.workspaceId)
    .maybeSingle();

  if (!wf) throw Errors.notFound("Workflow");

  const { page, pageSize, offset } = getPagination(req);
  const bddId = new URL(req.url).searchParams.get("bdd_id");

  const FETCH_CAP = 2500;

  let runs: WorkflowRunRow[] = [];
  let count: number;

  if (bddId) {
    const { data: batch, error } = await ctx.supabase
      .from("workflow_runs")
      .select("*")
      .eq("workflow_id", workflowId)
      .eq("organization_id", ctx.workspaceId)
      .order("created_at", { ascending: false })
      .limit(FETCH_CAP);

    if (error) throw Errors.internal("Impossible de charger les exécutions");

    const filtered = (batch ?? []).filter((r) => {
      const ids = parseEnrollmentBddIdsFromContext(
        (r as { context?: unknown }).context
      );
      if (bddId === "__none__") return ids.length === 0;
      return ids.includes(bddId);
    });

    count = filtered.length;
    runs = filtered.slice(offset, offset + pageSize);
  } else {
    const res = await ctx.supabase
      .from("workflow_runs")
      .select("*", { count: "exact" })
      .eq("workflow_id", workflowId)
      .eq("organization_id", ctx.workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (res.error) throw Errors.internal("Impossible de charger les exécutions");
    runs = res.data ?? [];
    count = res.count ?? 0;
  }

  const pids = [...new Set((runs ?? []).map((r) => r.prospect_id))];
  let prospectById: Record<string, { full_name: string | null; company: string | null }> =
    {};
  if (pids.length) {
    const { data: plist } = await ctx.supabase
      .from("prospects")
      .select("id, full_name, company")
      .in("id", pids);
    prospectById = Object.fromEntries(
      (plist ?? []).map((p) => [
        p.id,
        { full_name: p.full_name, company: p.company },
      ])
    );
  }

  const runIds = (runs ?? []).map((r) => r.id);
  const completedByRun = new Map<string, number>();
  if (runIds.length) {
    const { data: execRows } = await ctx.supabase
      .from("workflow_step_executions")
      .select("run_id, status")
      .in("run_id", runIds)
      .eq("status", "completed");
    for (const e of execRows ?? []) {
      completedByRun.set(e.run_id, (completedByRun.get(e.run_id) ?? 0) + 1);
    }
  }

  const allBddIds = new Set<string>();
  for (const r of runs ?? []) {
    for (const bid of parseEnrollmentBddIdsFromContext(r.context)) {
      allBddIds.add(bid);
    }
  }
  let bddNameById: Record<string, string> = {};
  if (allBddIds.size) {
    const { data: bdds } = await ctx.supabase
      .from("bdd")
      .select("id, name")
      .in("id", [...allBddIds])
      .eq("organization_id", ctx.workspaceId);
    bddNameById = Object.fromEntries((bdds ?? []).map((b) => [b.id, b.name ?? "Liste"]));
  }

  const items = (runs ?? []).map((r) => {
    const bddIds = parseEnrollmentBddIdsFromContext(r.context);
    let stepsTotal = 0;
    try {
      const def = parseWorkflowDefinition(r.definition_snapshot);
      stepsTotal = def.steps.length;
    } catch {
      stepsTotal = 0;
    }
    const stepsCompleted = completedByRun.get(r.id) ?? 0;
    return {
      ...r,
      prospect: prospectById[r.prospect_id] ?? null,
      enrollment_bdd_ids: bddIds,
      enrollment_list_labels: bddIds.map((id) => bddNameById[id] ?? id.slice(0, 8)),
      steps_total: stepsTotal,
      steps_completed: stepsCompleted,
    };
  });

  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
  };
});

/**
 * POST /api/workflows/[id]/runs — enroll prospects (one run per prospect)
 */
export const POST = createApiHandler(
  async (req, ctx) => {
    assertMessagerieAndTemplatesPlan(ctx);
    if (!ctx.workspaceId) throw Errors.badRequest("Workspace requis");
    const workflowId = getWorkflowIdFromUrl(req);
    if (!workflowId) throw Errors.badRequest("ID workflow manquant");

    const body = await parseBody<{ prospect_ids?: string[]; bdd_ids?: string[] }>(req);
    const bddIds = body.bdd_ids ?? [];
    let prospectIds = [...(body.prospect_ids ?? [])];

    if (bddIds.length) {
      const { data: bddRows, error: bddErr } = await ctx.supabase
        .from("bdd")
        .select("id")
        .in("id", bddIds)
        .eq("organization_id", ctx.workspaceId);

      if (bddErr) throw Errors.internal("Erreur listes");
      const validBdd = new Set((bddRows ?? []).map((b) => b.id));
      for (const bid of bddIds) {
        if (!validBdd.has(bid)) {
          throw Errors.badRequest(`Liste invalide ou hors workspace : ${bid}`);
        }
      }

      const { data: fromLists, error: plErr } = await ctx.supabase
        .from("prospects")
        .select("id")
        .eq("organization_id", ctx.workspaceId)
        .in("bdd_id", bddIds);

      if (plErr) throw Errors.internal("Erreur prospects des listes");
      for (const p of fromLists ?? []) {
        prospectIds.push(p.id);
      }
    }

    prospectIds = [...new Set(prospectIds)];

    if (!prospectIds.length) {
      throw Errors.validation({
        prospect_ids: "Sélectionnez au moins un prospect ou une liste non vide.",
      });
    }

    const { data: wf } = await ctx.supabase
      .from("workflows")
      .select("id, is_active, metadata")
      .eq("id", workflowId)
      .eq("organization_id", ctx.workspaceId)
      .maybeSingle();

    if (!wf) throw Errors.notFound("Workflow");

    const definition = await getWorkflowPublishedDefinition(ctx.supabase, workflowId);
    if (!definition) {
      throw Errors.badRequest(
        "Ce parcours n’est pas encore enregistré comme prêt. Vérifiez les étapes et les comptes connectés."
      );
    }

    // Pre-flight account checks: hard-block if the workflow needs a channel
    // account that isn't linked. Avoids creating runs that would just fail at
    // executor time after 5 retries.
    const needsWhatsApp = definitionRequiresWhatsApp(definition);
    const needsLinkedIn = definitionRequiresLinkedIn(definition);

    if (needsWhatsApp) {
      const accountId = await getWhatsAppAccountIdForUserId(
        ctx.supabase,
        ctx.userId!
      );
      if (!accountId) {
        throw Errors.badRequest(
          "Connectez votre compte WhatsApp depuis les paramètres pour lancer ce parcours."
        );
      }
    }
    if (needsLinkedIn) {
      const accountId = await getLinkedInAccountIdForUserId(
        ctx.supabase,
        ctx.userId!
      );
      if (!accountId) {
        throw Errors.badRequest(
          "Connectez votre compte LinkedIn depuis les paramètres pour lancer ce parcours."
        );
      }
    }

    // Pull phone alongside id so we can pre-skip prospects without numbers
    // when the workflow contains a WhatsApp step.
    const { data: prospects, error: pErr } = await ctx.supabase
      .from("prospects")
      .select("id, phone")
      .eq("organization_id", ctx.workspaceId)
      .in("id", prospectIds);

    if (pErr) throw Errors.internal("Erreur vérification prospects");

    const validIds = new Set((prospects ?? []).map((p) => p.id));
    const phoneById = new Map<string, string | null>();
    for (const p of prospects ?? []) {
      phoneById.set(p.id, (p.phone as string | null) ?? null);
    }

    if (needsWhatsApp) {
      const haveAtLeastOnePhone = Array.from(phoneById.values()).some(
        (p) => typeof p === "string" && p.trim().length > 0
      );
      if (!haveAtLeastOnePhone) {
        throw Errors.badRequest(
          "Aucun prospect sélectionné n'a de numéro de téléphone."
        );
      }
    }

    const created: string[] = [];
    const skipped: { prospect_id: string; reason: string }[] = [];

    for (const prospectId of prospectIds) {
      if (!validIds.has(prospectId)) {
        skipped.push({ prospect_id: prospectId, reason: "not_in_workspace" });
        continue;
      }
      if (needsWhatsApp) {
        const phone = phoneById.get(prospectId);
        if (!phone || !phone.trim()) {
          skipped.push({ prospect_id: prospectId, reason: "missing_phone" });
          continue;
        }
      }

      const runContext: Record<string, unknown> =
        bddIds.length > 0 ? { enrollment_bdd_ids: bddIds } : {};

      const { data: run, error: runErr } = await ctx.supabase
        .from("workflow_runs")
        .insert({
          workflow_id: workflowId,
          organization_id: ctx.workspaceId,
          prospect_id: prospectId,
          started_by: ctx.userId!,
          status: "running",
          current_step_index: 0,
          context: runContext as Json,
          definition_snapshot: definition as Json,
        })
        .select("id")
        .single();

      if (runErr || !run) {
        if (runErr?.code === "23505") {
          skipped.push({ prospect_id: prospectId, reason: "already_active" });
        } else {
          skipped.push({
            prospect_id: prospectId,
            reason: runErr?.message ?? "insert_failed",
          });
        }
        continue;
      }

      const enq = await enqueueFirstStep(ctx.supabase, run.id, definition);
      if (!enq.ok) {
        await ctx.supabase.from("workflow_runs").delete().eq("id", run.id);
        skipped.push({ prospect_id: prospectId, reason: enq.error });
        continue;
      }

      await logWorkflowEnrolled(ctx.supabase, {
        organization_id: ctx.workspaceId!,
        prospect_id: prospectId,
        workflow_id: workflowId,
        actor_id: ctx.userId!,
        run_id: run.id,
      });

      created.push(run.id);
    }

    if (bddIds.length > 0 && created.length > 0) {
      const prevMeta =
        wf.metadata && typeof wf.metadata === "object" && !Array.isArray(wf.metadata)
          ? { ...(wf.metadata as Record<string, unknown>) }
          : {};
      delete prevMeta.pending_enrollment_bdd_ids;
      await ctx.supabase
        .from("workflows")
        .update({
          metadata: prevMeta as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workflowId)
        .eq("organization_id", ctx.workspaceId);
    }

    return { created_run_ids: created, skipped };
  },
  { rateLimit: { name: "workflows-enroll", requests: 20, window: "1 m" } }
);
