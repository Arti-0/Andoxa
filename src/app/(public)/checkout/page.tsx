import { redirect } from "next/navigation";
import Link from "next/link";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Button } from "@/components/marketing/ui/button";
import {
  isSiteBilling,
  isSitePlan,
  priceIdFor,
  SITE_PLAN_LABEL,
  type SiteBilling,
  type SitePlan,
} from "@/lib/marketing/checkout-plans";
import { createClient } from "@/lib/supabase/server";

/**
 * /checkout?plan=solo|team&billing=monthly|annual&seats=N
 *
 * Authenticated Stripe Checkout with `organization_id` in session metadata so
 * webhooks activate the correct workspace. Guests are sent to `/auth/login`
 * then return here → `/api/paiements/checkout` (GET) → Stripe.
 */
export const metadata = {
  title: "Vers le paiement — Andoxa",
  robots: { index: false },
};

export default async function CheckoutRedirect({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; billing?: string; seats?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const plan = isSitePlan(params.plan) ? params.plan : null;
  const billing: SiteBilling = isSiteBilling(params.billing) ? params.billing : "annual";
  const seats = Math.max(1, Number(params.seats) || (plan === "team" ? 3 : 1));

  if (!plan) {
    redirect("/pricing");
  }

  const priceId = priceIdFor(plan, billing);
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !priceId) {
    let configError: string | null = null;
    if (!priceId) {
      configError =
        "Ce tarif n'est pas encore configuré côté serveur (vérifiez les variables STRIPE_PRICE_* ).";
    }
    return (
      <>
        <FloatingNav navItems={SITE_NAV} />
        <main className="pt-28 pb-24 sm:pt-32 sm:pb-32">
          <Container>
            <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-card p-8 text-center shadow-[0_4px_18px_-12px_rgba(0,82,217,0.18)] sm:p-10">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                Plan {SITE_PLAN_LABEL[plan]} ·{" "}
                {billing === "annual" ? "annuel" : "mensuel"}
              </p>
              <h1 className="font-display mt-3 text-3xl text-foreground sm:text-4xl">
                Paiement bientôt disponible.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
                {configError ??
                  "Notre nouveau compte Stripe est en cours d'activation. En attendant, on prend votre demande à la main — c'est plus rapide pour vous et ça nous permet de cadrer votre setup."}
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href={`/contact?objet=demo`}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Réserver une démo
                </Button>
                <Button
                  href="/pricing"
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Revoir les plans
                </Button>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Une question urgente ?{" "}
                <Link
                  href="mailto:contact@andoxa.fr"
                  className="font-medium text-foreground underline underline-offset-2 hover:text-[var(--brand-blue)]"
                >
                  contact@andoxa.fr
                </Link>
              </p>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const qs = new URLSearchParams();
  qs.set("plan", plan);
  qs.set("billing", billing);
  if (plan === "team") {
    qs.set("seats", String(Math.max(3, seats)));
  }

  const checkoutPath = `/checkout?${qs.toString()}`;

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(checkoutPath)}`);
  }

  redirect(`/api/paiements/checkout?${qs.toString()}`);
}
