/**
 * Single source of truth for the "Andoxa vs X" comparison pages that actually
 * exist. Drives the nav mega-menu ("Alternatives à Andoxa" column) so adding a
 * comparison = one entry here + its page. Only list comparisons whose page
 * route exists (no dead links).
 */
export type Comparison = {
  competitor: string;
  href: string;
};

export const COMPARISONS: Comparison[] = [
  { competitor: "Waalaxy", href: "/comparatif/andoxa-vs-waalaxy" },
  { competitor: "Lemlist", href: "/comparatif/andoxa-vs-lemlist" },
  { competitor: "La Growth Machine", href: "/comparatif/andoxa-vs-la-growth-machine" },
  { competitor: "Phantombuster", href: "/comparatif/andoxa-vs-phantombuster" },
  { competitor: "HubSpot", href: "/comparatif/andoxa-vs-hubspot" },
  { competitor: "Calendly", href: "/comparatif/andoxa-vs-calendly" },
  { competitor: "Monday", href: "/comparatif/andoxa-vs-monday" },
  { competitor: "Odoo", href: "/comparatif/andoxa-vs-odoo" },
];
