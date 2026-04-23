import { z } from "zod";

export const WORKFLOW_STEP_TYPES = [
  "wait",
  "linkedin_invite",
  "linkedin_message",
  "whatsapp_message",
  "condition",
] as const;

// TODO: LinkedIn steps hidden — repositioning to WhatsApp-only workflows
// Re-enable when LinkedIn outreach is reintroduced as a separate feature
/** Types shown in the builder "Ajouter une étape" selector (published runs may still contain LinkedIn steps). */
export const WORKFLOW_STEP_TYPES_BUILDER_UI = WORKFLOW_STEP_TYPES.filter(
  (t) => t !== "linkedin_invite" && t !== "linkedin_message"
);

export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number];

const waitConfigSchema = z.object({
  durationHours: z.number().positive(),
  /** Si true : n'attendre que si le prospect n'a pas répondu depuis le début de cette étape. */
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

const conditionConfigSchema = z.object({
  conditionType: z.literal("prospect_replied"),
});

export const workflowStepSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1, "Identifiant d'étape requis"),
    type: z.literal("wait"),
    config: waitConfigSchema,
    next_id: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("linkedin_invite"),
    config: linkedinInviteConfigSchema,
    next_id: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("linkedin_message"),
    config: linkedinMessageConfigSchema,
    next_id: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("whatsapp_message"),
    config: whatsappMessageConfigSchema,
    next_id: z.string().optional(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("condition"),
    config: conditionConfigSchema,
    on_true_id: z.string().optional(),
    on_false_id: z.string().optional(),
    next_id: z.string().optional(),
  }),
]);

export const workflowDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  steps: z.array(workflowStepSchema),
  /** Graph model: ID of the first step to execute. When absent, linear index-based execution applies. */
  entry_step_id: z.string().optional(),
});

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

// ─── Wizard-only types ────────────────────────────────────────────────────────
// The wizard uses nested branch arrays within the condition step's config.
// On publish these are flattened to the graph format (WorkflowDefinition).

export interface WizardConditionStep {
  id: string;
  type: "condition";
  config: {
    conditionType: "prospect_replied";
    /** OUI branch — wizard-only, stripped on publish */
    on_true_steps: WorkflowStep[];
    /** NON branch — wizard-only, stripped on publish */
    on_false_steps: WorkflowStep[];
  };
}

export type WizardStep = WorkflowStep | WizardConditionStep;

/**
 * Flatten a wizard-step list (which may include WizardConditionSteps with
 * nested branches) into a flat WorkflowDefinition with graph pointers.
 */
export function flattenWizardSteps(wizardSteps: WizardStep[]): {
  steps: WorkflowStep[];
  entry_step_id: string | undefined;
} {
  if (wizardSteps.length === 0) return { steps: [], entry_step_id: undefined };

  // Detect if we have any condition steps (need graph model)
  const hasCondition = wizardSteps.some((s) => s.type === "condition");
  if (!hasCondition) {
    // Pure linear workflow — no need for graph model
    return {
      steps: wizardSteps as WorkflowStep[],
      entry_step_id: undefined,
    };
  }

  // Graph model: assign next_id pointers and flatten condition branches
  const flat: WorkflowStep[] = [];
  const entry_step_id = wizardSteps[0]?.id;

  for (let i = 0; i < wizardSteps.length; i++) {
    const s = wizardSteps[i]!;
    const nextTopLevelId = wizardSteps[i + 1]?.id;

    if (s.type === "condition") {
      const cond = s as WizardConditionStep;
      const trueSteps = cond.config.on_true_steps ?? [];
      const falseSteps = cond.config.on_false_steps ?? [];

      // Wire last step of each branch to the next top-level step
      const wireChain = (chain: WorkflowStep[], afterId: string | undefined): WorkflowStep[] =>
        chain.map((step, j) => ({
          ...step,
          next_id: j < chain.length - 1 ? chain[j + 1]!.id : afterId,
        }));

      const wiredTrue = wireChain(trueSteps, nextTopLevelId);
      const wiredFalse = wireChain(falseSteps, nextTopLevelId);

      const condStep: WorkflowStep = {
        id: cond.id,
        type: "condition",
        config: { conditionType: cond.config.conditionType },
        on_true_id: wiredTrue[0]?.id,
        on_false_id: wiredFalse[0]?.id,
        next_id: nextTopLevelId,
      };
      flat.push(condStep, ...wiredTrue, ...wiredFalse);
    } else {
      flat.push({ ...s, next_id: nextTopLevelId } as WorkflowStep);
    }
  }

  return { steps: flat, entry_step_id };
}

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
      return `L'identifiant d'étape « ${s.id} » est dupliqué.`;
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
