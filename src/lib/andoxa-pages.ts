/**
 * Canonical URLs for the embedded Andoxa product mockups. These files live
 * under `public/andoxa-pages/<folder>/<file>.html` and are rendered inside
 * <EmbeddedPage> as non-interactive "living screenshots" across the site.
 *
 * Folder names contain spaces — those are encoded here once so callers can
 * pass the value as-is to the iframe `src` attribute.
 */
export const ANDOXA_PAGE = {
  dashboard: "/andoxa-pages/Tableau%20de%20bord/Tableau%20de%20bord.html",
  messagerie: "/andoxa-pages/Messagerie/Messagerie.html",
  calendrier: "/andoxa-pages/Calendrier/Calendrier.html",
  campagnes: "/andoxa-pages/Campagne/Campagnes%20%26%20Appels.html",
  callSession: "/andoxa-pages/Campagne/Session%20d%27appels.html",
  crm: "/andoxa-pages/CRM/CRM.html",
  workflows: "/andoxa-pages/Workflow/Workflows.html",
} as const;

export type AndoxaPageKey = keyof typeof ANDOXA_PAGE;
