/**
 * Hand-off contract between the CRM "Inviter" action and the campaigns wizard.
 *
 * The CRM toolbar writes the selected prospect ids (+ a sample prospect for the
 * wizard preview) to sessionStorage under this key, then routes to
 * `/campaigns?new=campaign&from=selection`. The campaigns page reads it once,
 * opens the wizard in selection mode, and clears the key.
 *
 * sessionStorage is used because a 100+ id selection can't fit in a URL.
 */
export const WIZARD_PROSPECT_SELECTION_KEY = "andoxa:wizard-prospect-selection";

export interface WizardProspectSelection {
  prospectIds: string[];
  sample: {
    full_name: string | null;
    company: string | null;
    job_title: string | null;
  } | null;
}
