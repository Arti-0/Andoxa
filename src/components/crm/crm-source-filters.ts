/**
 * Source keys stored on `prospects.source` — shared by Prospects & Pipeline
 * toolbars and the Listes filter.
 *
 * Canonical taxonomy: LinkedIn, CSV/Excel import, Manual, Inbound. "Booking"
 * is intentionally absent — a booking is an event on an existing prospect, not
 * an acquisition source (the prospect must already exist to book). The
 * `booking` config stays defined in crm-shared for the Canaux column.
 *
 * Inbound is reserved for prospects who reach out to us; its acquisition logic
 * will be wired when third-party integrations / a public event page land.
 */
export const CRM_SOURCE_FILTER_OPTIONS = [
  { value: "linkedin_extension", label: "LinkedIn" },
  { value: "csv", label: "Import CSV" },
  { value: "xlsx", label: "Import Excel" },
  { value: "manual", label: "Manuel" },
  { value: "inbound", label: "Inbound" },
] as const;
