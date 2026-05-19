/**
 * Values match `public.workflows.trigger_kind` (migration M-FEAT-4).
 * Automation dispatch will use this column; UI trigger templates stay in metadata.
 */
export type WorkflowTriggerKind =
  | "manual"
  | "on_list_add"
  | "on_tag"
  | "on_status_change"
  | "on_booking";

export function isWorkflowTriggerKind(
  v: string | null | undefined
): v is WorkflowTriggerKind {
  return (
    v === "manual" ||
    v === "on_list_add" ||
    v === "on_tag" ||
    v === "on_status_change" ||
    v === "on_booking"
  );
}

export const WORKFLOW_TRIGGER_KIND_OPTIONS: {
  id: WorkflowTriggerKind;
  label: string;
  description: string;
}[] = [
  {
    id: "manual",
    label: "Manuel",
    description:
      "Inscription via le bouton ou les listes — le comportement actuel.",
  },
  {
    id: "on_list_add",
    label: "À l’ajout dans une liste",
    description:
      "Quand un prospect entre dans une liste surveillée (automatisation à brancher côté backend).",
  },
  {
    id: "on_tag",
    label: "Sur tag / étiquette",
    description: "Réservé — déclenchement quand un tag CRM est appliqué.",
  },
  {
    id: "on_status_change",
    label: "Changement d’étape pipeline",
    description: "Réservé — quand le statut CRM ou le pipeline change.",
  },
  {
    id: "on_booking",
    label: "Réunion réservée",
    description:
      "Quand un prospect réserve un créneau via la page de booking. Un run par (prospect, événement) — un nouveau RDV redéclenche.",
  },
];
