/**
 * Server-side validation for `workflows.trigger_config` jsonb.
 *
 * Kept separate from trigger-kind.ts so the client bundle that imports the
 * registry doesn't pull Zod transitively. Imported by the API PATCH route
 * and by emitWorkflowTrigger at write time.
 */

import { z } from "zod";
import type { WorkflowTriggerKind } from "./trigger-kind";

/** Empty config — used by triggers whose `configTarget` is "none". */
const EmptySchema = z
  .object({})
  .strict()
  .or(z.null())
  .transform(() => ({}));

const StatusConfigSchema = z
  .object({
    targetStatusId: z.string().uuid().nullable().optional(),
  })
  .strict();

const TagConfigSchema = z
  .object({
    targetTagId: z.string().uuid().nullable().optional(),
  })
  .strict();

const ListConfigSchema = z
  .object({
    targetListId: z.string().uuid().nullable().optional(),
  })
  .strict();

const CampaignJobConfigSchema = z
  .object({
    campaignJobId: z.string().uuid().nullable().optional(),
  })
  .strict();

const SCHEMAS: Record<WorkflowTriggerKind, z.ZodTypeAny> = {
  manual: EmptySchema,
  on_booking: EmptySchema,
  on_no_show: EmptySchema,
  on_linkedin_reply: EmptySchema,
  on_whatsapp_reply: EmptySchema,
  on_status_change: StatusConfigSchema,
  on_tag: TagConfigSchema,
  on_list_add: ListConfigSchema,
  on_campaign_reply: CampaignJobConfigSchema,
};

/**
 * Validate (and normalise) the `trigger_config` jsonb against the schema
 * for the chosen kind. Returns the parsed object on success, or a flat
 * `{ ok: false, error }` shape on failure so the API route can surface
 * a friendly validation error.
 */
export function validateTriggerConfig(
  kind: WorkflowTriggerKind,
  raw: unknown
):
  | { ok: true; config: Record<string, unknown> }
  | { ok: false; error: string } {
  const schema = SCHEMAS[kind];
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "config"}: ${i.message}`)
        .join("; "),
    };
  }
  return { ok: true, config: (parsed.data ?? {}) as Record<string, unknown> };
}
