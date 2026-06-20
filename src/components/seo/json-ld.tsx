import type { ReactElement } from "react";

/**
 * Renders a JSON-LD structured-data block. Answer engines (Google AI Overviews,
 * Perplexity, ChatGPT search) and rich-result crawlers read this to understand
 * what a page *is* without inferring from prose. Works in both server and
 * client components.
 *
 * `data` is a Schema.org object (or array of objects). Build them with the
 * helpers in `@/lib/seo/structured-data`.
 */
export function JsonLd({ data }: { data: object }): ReactElement {
  return (
    <script
      type="application/ld+json"
      // Schema objects are app-controlled (no user input). Escape `<` so a stray
      // "</script>" in any string can never break out of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
