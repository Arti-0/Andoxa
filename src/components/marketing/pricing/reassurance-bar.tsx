import { CreditCard, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/marketing/ui/container";

const ITEMS = [
  {
    icon: Sparkles,
    title: "Sans engagement",
    body: "Résiliable en un clic, à tout moment depuis votre espace client.",
  },
  {
    icon: ShieldCheck,
    title: "Conforme RGPD",
    body: "Données hébergées en Europe, chiffrées au repos et en transit. DPA sur demande.",
  },
  {
    icon: CreditCard,
    title: "Paiement sécurisé",
    body: "Carte bancaire ou SEPA via Stripe. Virement annuel pour les plans Custom.",
  },
  {
    icon: RotateCcw,
    title: "Migration assistée",
    body: "Import CSV guidé et accompagnement la première semaine, sans frais.",
  },
];

export function ReassuranceBar() {
  return (
    <section className="border-t border-[var(--border)] bg-background py-16 sm:py-20">
      <Container>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => (
            <div key={it.title} className="flex items-start gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                <it.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{it.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
