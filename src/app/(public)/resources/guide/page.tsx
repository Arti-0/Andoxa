import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Calculator,
  Database,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  PuzzleIcon,
  Tag,
  Workflow,
} from "lucide-react";
import { FloatingNav } from "@/components/marketing/aceternity/floating-nav";
import { SITE_NAV } from "@/components/marketing/legal-page-layout";
import { Footer } from "@/components/marketing/footer";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";

export const metadata: Metadata = {
  title: "Guide détaillé d'Andoxa — le revenue engine pas à pas",
  description:
    "Tour complet d'Andoxa : onboarding, anatomie des 7 modules, erreurs à éviter. Sans bullshit marketing.",
};

const STEPS = [
  { n: 1, title: "Installation de l'extension Chrome", duration: "1 min", body: "Le flux d'import principal des prospects depuis LinkedIn. Un clic et le profil rejoint Andoxa." },
  { n: 2, title: "Connexion LinkedIn", duration: "2 min", body: "Lecture seule des contacts existants. Aucun message envoyé sans validation explicite." },
  { n: 3, title: "Sync Google Calendar", duration: "2 min", body: "Vos disponibilités alimentent les booking links. Sync bidirectionnelle, pas de double booking." },
  { n: 4, title: "Configuration WhatsApp", duration: "5 min", body: "Andoxa peut relancer par WhatsApp avec votre numéro. C'est ce qui débloque toute la séquence post-booking." },
  { n: 5, title: "Invitation des membres équipe", duration: "5 min", body: "Mail d'onboarding automatique, attribution des rôles, partage du pipeline." },
];

const PAGES = [
  { icon: LayoutDashboard, num: "01", name: "Tableau de bord", short: "Le cockpit du matin.", body: "Priorités du jour, 4 KPIs essentiels, funnel de conversion, top deals, deals à risque, quotas LinkedIn. En 30 secondes, vous savez quoi faire en priorité." },
  { icon: PuzzleIcon, num: "02", name: "Extension Chrome", short: "Import LinkedIn en un clic.", body: "95 % des prospects entrent par ici. Icône dans la barre Chrome, panneau d'import, ajout à une Liste au passage. Respecte les limites de visite LinkedIn." },
  { icon: Inbox, num: "03", name: "Messagerie", short: "Inbox unifiée LinkedIn + WhatsApp.", body: "Trois colonnes : conversations à gauche, fil au centre, contexte CRM à droite. Templates, lien de booking, statut commercial, lancement de workflow depuis la conversation." },
  { icon: CalendarCheck, num: "04", name: "Calendrier", short: "Booking + sync + post-RDV.", body: "RDV centralisés, lien de booking personnalisable, sync bidirectionnelle Google. Marquer un no-show déclenche la séquence de récupération automatique." },
  { icon: Database, num: "05", name: "CRM", short: "Le socle où tout converge.", body: "4 onglets : Prospects, Pipeline (kanban 7 colonnes), Listes (segments réutilisables), Corbeille. Fiche prospect avec timeline complète, workflow actif, notes." },
  { icon: Megaphone, num: "06", name: "Campagnes & Appels", short: "Prospection sortante LinkedIn, WhatsApp, téléphone.", body: "Wizard 4 étapes pour LinkedIn (invitation, invitation+message ou message seul), wizard 2 étapes pour les sessions d'appels téléphoniques. Suivi temps réel." },
  { icon: Workflow, num: "07", name: "Workflows", short: "Le moteur d'automatisation.", body: "Builder visuel type Zapier. Déclencheurs (booking, no-show, silence, statut CRM, réponse) combinés avec actions (WhatsApp, LinkedIn, CRM, notification, délai, conditions)." },
];

const ERRORS = [
  { title: "Tout vouloir activer en même temps.", body: "Une chose à la fois. Setup → CRM → première campagne → premiers workflows. Pas l'inverse." },
  { title: "Sur-automatiser au point de devenir un bot.", body: "L'automatisation sert l'humain, pas le remplace. Les premiers messages restent personnalisés. Les workflows prennent le relais ensuite." },
  { title: "Ne pas mesurer ce qu'on fait.", body: "Mesurez dès la première semaine. Le dashboard sort déjà 7 KPIs prêts. Pas d'excuse." },
  { title: "Lancer un volume LinkedIn trop fort dès J1.", body: "30 connexions/jour la S1, 50/jour la S2, 80/jour à partir de la S3. Au-delà, votre compte LinkedIn est en danger." },
  { title: "Oublier le numéro WhatsApp dans le formulaire de booking.", body: "C'est LA donnée stratégique. Sans elle, votre revenue engine est cassé. Pré-RDV, post-RDV, récupération no-show, tout en dépend." },
];

const FINAL_CARDS = [
  { icon: Tag, title: "Voir les tarifs", body: "Solo, Team, Custom. Mensuel ou annuel.", href: "/pricing" },
  { icon: Calculator, title: "Calculer son ROI", body: "Estimez le gain pour votre équipe en 30 secondes.", href: "/resources/roi-calculator" },
  { icon: CalendarCheck, title: "Réserver une démo", body: "30 minutes avec l'équipe. Sans slides.", href: "/contact?objet=demo" },
];

export default function GuidePage() {
  return (
    <>
      <FloatingNav navItems={SITE_NAV} />
      <main>
        <section className="relative isolate overflow-hidden pb-12 pt-32 sm:pb-16 sm:pt-40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-32 top-0 -z-[5] h-[400px] w-[580px] rounded-full bg-[var(--brand-blue-tint)]/55 blur-3xl"
          />
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow className="justify-center">Guide détaillé</Eyebrow>
              <h1 className="font-display mt-6 text-4xl text-foreground sm:text-5xl lg:text-6xl">
                <span className="block">Tour complet d&apos;Andoxa,</span>
                <span className="block text-[var(--brand-blue)]">page par page.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Ce que fait la plateforme, comment l&apos;utiliser au quotidien, et les erreurs
                classiques à éviter. Sans bullshit marketing.
              </p>
            </div>
          </Container>
        </section>

        {/* Onboarding */}
        <section className="border-t border-[var(--border)] py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Onboarding</Eyebrow>
              <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
                Premiers pas avec Andoxa.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                15 minutes de setup, et la plateforme est opérationnelle. Voici l&apos;ordre
                recommandé pour ne rien oublier.
              </p>
              <ol className="mt-12 space-y-4">
                {STEPS.map((s) => (
                  <li
                    key={s.n}
                    className="flex gap-5 rounded-2xl border border-[var(--border)] bg-card p-6 sm:gap-6 sm:p-8"
                  >
                    <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand-blue-tint)] text-sm font-medium tabular text-[var(--brand-blue)]">
                      {s.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                        <h3 className="text-base font-semibold text-foreground sm:text-lg">
                          {s.title}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-[var(--neutral-50)] px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {s.duration}
                        </span>
                      </div>
                      <p className="mt-2.5 text-[0.95rem] leading-7 text-muted-foreground sm:text-base">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-10 flex gap-4 rounded-2xl border border-[var(--brand-blue)]/15 bg-[var(--brand-blue-tint)]/40 p-6 sm:p-7">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card text-[var(--brand-blue)]">
                  <Lightbulb size={15} />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                    Tip
                  </p>
                  <p className="mt-2 text-[0.95rem] leading-7 text-foreground/90 sm:text-base">
                    Une fois le setup terminé,{" "}
                    <strong className="font-semibold text-foreground">
                      ne créez pas de campagne tout de suite
                    </strong>
                    . Passez 10 minutes à explorer le dashboard, ouvrez quelques fiches prospect,
                    chargez 20 profils LinkedIn via l&apos;extension. Vous gagnerez 2&nbsp;h sur
                    votre première campagne.
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Tour des 7 pages */}
        <section className="border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-20 sm:py-28">
          <Container>
            <div className="mx-auto mb-14 max-w-3xl">
              <Eyebrow>Tour de la plateforme</Eyebrow>
              <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
                Sept pages,{" "}
                <span className="text-[var(--brand-blue)]">une par une</span>.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
                Pour chaque module : ce qu&apos;il fait, ce qu&apos;on y trouve, comment on
                l&apos;utilise au quotidien.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
              {PAGES.map((p) => (
                <article
                  key={p.num}
                  className="rounded-2xl border border-[var(--border)] bg-card p-6 transition-shadow hover:shadow-[0_18px_40px_-22px_rgba(0,82,217,0.18)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                      <p.icon size={18} />
                    </span>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Page {p.num} / 07
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-xl text-foreground sm:text-2xl">
                    {p.name}, {p.short}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
                    {p.body}
                  </p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* Erreurs à éviter */}
        <section className="border-t border-[var(--border)] py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Crédibilité</Eyebrow>
              <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
                Cinq erreurs <span className="text-[var(--brand-blue)]">à éviter</span>.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Ce qu&apos;on voit sur le terrain. Si vous évitez ces 5 pièges, vous avez déjà 80 %
                du revenue engine en place.
              </p>
              <ol className="mt-12 space-y-4">
                {ERRORS.map((e, i) => (
                  <li
                    key={e.title}
                    className="flex gap-5 rounded-2xl border border-[var(--border)] bg-card p-6 sm:gap-6 sm:p-8"
                  >
                    <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-sm font-medium tabular text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground sm:text-lg">{e.title}</h3>
                      <p className="mt-2.5 text-[0.95rem] leading-7 text-muted-foreground sm:text-base">
                        {e.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        {/* Aller plus loin */}
        <section className="border-t border-[var(--border)] bg-[var(--neutral-50)]/60 py-20 sm:py-28">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Suite logique</Eyebrow>
              <h2 className="font-display mt-4 text-3xl text-foreground sm:text-4xl lg:text-5xl">
                Aller <span className="text-[var(--brand-blue)]">plus loin</span>.
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
              {FINAL_CARDS.map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="group flex flex-col rounded-2xl border border-[var(--border)] bg-card p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--brand-blue)]/40 hover:shadow-[0_18px_40px_-22px_rgba(0,82,217,0.22)] sm:p-8"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                    <c.icon size={18} />
                  </span>
                  <h3 className="font-display mt-5 text-xl text-foreground sm:text-2xl">{c.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
                    {c.body}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-blue)] transition-transform group-hover:translate-x-0.5">
                    Y aller
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
            <p className="mx-auto mt-14 max-w-2xl text-center text-sm leading-8 text-muted-foreground sm:text-base">
              Une question ?{" "}
              <Link
                href="/contact"
                className="font-medium text-foreground underline underline-offset-2 hover:text-[var(--brand-blue)]"
              >
                Parlez-nous directement
              </Link>
              .
            </p>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
