import { z } from "zod";

export const WORKFLOW_STEP_TYPES = [
  "wait",
  "linkedin_invite",
  "linkedin_message",
  "whatsapp_message",
] as const;

// TODO: LinkedIn steps hidden — repositioning to WhatsApp-only workflows
// Re-enable when LinkedIn outreach is reintroduced as a separate feature
/** Types shown in the builder “Ajouter une étape” selector (published runs may still contain LinkedIn steps). */
export const WORKFLOW_STEP_TYPES_BUILDER_UI = WORKFLOW_STEP_TYPES.filter(
  (t) => t !== "linkedin_invite" && t !== "linkedin_message"
);

export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

const waitConfigSchema = z.object({
  durationHours: z.number().positive(),
  /** Si true : n’attendre que si le prospect n’a pas répondu depuis le début de cette étape. */
  onlyIfNoReply: z.boolean().optional().default(false),
});

const linkedinInviteConfigSchema = z.object({
  messageTemplate: z.string().optional(),
});

const linkedinMessageConfigSchema = z.object({
  messageTemplate: z.string().optional(),
});

const whatsappMessageConfigSchema = z.object({
  messageTemplate: z.string().min(1, "Message requis"),
});

export const workflowStepSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1, "Identifiant d’étape requis"),
    type: z.literal("wait"),
    config: waitConfigSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("linkedin_invite"),
    config: linkedinInviteConfigSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("linkedin_message"),
    config: linkedinMessageConfigSchema,
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("whatsapp_message"),
    config: whatsappMessageConfigSchema,
  }),
]);

export const workflowDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  steps: z.array(workflowStepSchema),
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export function parseWorkflowDefinition(raw: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(raw);
}

export function safeParseWorkflowDefinition(raw: unknown) {
  return workflowDefinitionSchema.safeParse(raw);
}

/** Unique step ids and non-empty steps for publish. */
export function validateDefinitionForPublish(def: WorkflowDefinition): string | null {
  if (!def.steps.length) {
    return "Ajoutez au moins une étape avant de pouvoir lancer le parcours sur des listes.";
  }
  const ids = new Set<string>();
  for (const s of def.steps) {
    if (ids.has(s.id)) {
      return `L’identifiant d’étape « ${s.id} » est dupliqué.`;
    }
    ids.add(s.id);
  }
  return null;
}

export function definitionRequiresLinkedIn(def: WorkflowDefinition): boolean {
  return def.steps.some(
    (s) => s.type === "linkedin_invite" || s.type === "linkedin_message"
  );
}

export function definitionRequiresWhatsApp(def: WorkflowDefinition): boolean {
  return def.steps.some((s) => s.type === "whatsapp_message");
}
