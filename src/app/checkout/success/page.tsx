import { redirect } from "next/navigation";

/**
 * Legacy Stripe success URL (/checkout/success). The app route lives at /success
 * (see (checkout)/success). Keeps old sessions and bookmarks working.
 */
export default async function CheckoutSuccessLegacyRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, value);
    }
  }
  const query = qs.toString();
  redirect(query ? `/success?${query}` : "/success");
}
