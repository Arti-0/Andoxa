/**
 * Schema.org structured-data builders for Andoxa's public pages.
 *
 * These feed answer engines (AI Overviews, Perplexity, ChatGPT search) and
 * rich-result crawlers a machine-readable description of the entity and pages,
 * so they don't have to infer it from prose. Render the output with the
 * `<JsonLd>` component (`@/components/seo/json-ld`).
 *
 * Keep SITE_URL in sync with metadataBase (app/layout.tsx), BASE_URL
 * (app/sitemap.ts) and the Sitemap line in public/robots.txt.
 */
import { PLAN_PRESENTATION } from "@/lib/config/plans-config";

export const SITE_URL = "https://www.andoxa.fr";

const ORG_ID = `${SITE_URL}/#organization`;

/** The Andoxa entity — referenced sitewide so "Andoxa" resolves to one node. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Andoxa",
    url: SITE_URL,
    logo: `${SITE_URL}/assets/favicon/icon-192.png`,
    description:
      "Andoxa réunit CRM, campagnes LinkedIn, prise de rendez-vous et workflows pour transformer vos listes de prospects en rendez-vous.",
    sameAs: ["https://www.linkedin.com/company/andoxa"],
  };
}

/** Site-level node — enables the sitename treatment in search results. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Andoxa",
    inLanguage: "fr-FR",
    publisher: { "@id": ORG_ID },
  };
}

/**
 * The product itself. Offers are derived from PLAN_PRESENTATION so prices never
 * drift from the pricing page. Custom (contact-sales, price: null) is omitted —
 * Schema.org Offers need a concrete price.
 */
export function softwareApplicationSchema() {
  const paid = (["solo", "team"] as const)
    .map((id) => {
      const p = PLAN_PRESENTATION[id];
      if (!p.price) return null;
      return {
        "@type": "Offer",
        name: `Andoxa ${p.tag}`,
        price: p.price.monthly.toFixed(2),
        priceCurrency: "EUR",
        description: `${p.price.monthly} €${p.priceNote && "monthly" in p.priceNote ? " " + p.priceNote.monthly : ""}`,
        url: `${SITE_URL}/pricing`,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Andoxa",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM, Sales Engagement",
    operatingSystem: "Web",
    url: SITE_URL,
    inLanguage: "fr-FR",
    description:
      "Plateforme de prospection commerciale : CRM, campagnes LinkedIn, prise de rendez-vous et workflows dans un seul outil.",
    publisher: { "@id": ORG_ID },
    offers: paid,
  };
}

/** A FAQPage node from plain-text Q&A pairs. */
export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "fr-FR",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}
