"use client";

import * as React from "react";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronRight,
  MessageSquare,
  Send,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { Container } from "@/components/marketing/ui/container";
import { Eyebrow } from "@/components/marketing/ui/eyebrow";
import { ConnectRelief } from "@/components/marketing/mockups/relief/connect-relief";
import { ExtensionRelief } from "@/components/marketing/mockups/relief/extension-relief";
import { CampagneRelief } from "@/components/marketing/mockups/relief/campagne-relief";
import { BookingRelief } from "@/components/marketing/mockups/relief/booking-relief";
import { MessagerieRelief } from "@/components/marketing/mockups/relief/messagerie-relief";
import { cn } from "@/lib/utils";

/**
 * Guide complet d'Andoxa : page scrollable, sommaire collant (scroll-spy).
 * Périmètre strict : zéro WhatsApp, zéro Workflow/automatisation, zéro séquence
 * ou relance auto, zéro montant en €. No-show = statut marqué à la main. Appels
 * sur le téléphone perso. L'IA priorise et suggère, n'envoie/ne décide jamais.
 */

type TocItem = { id: string; label: string; children?: { id: string; label: string }[] };

const ESPACE_LINKS = [
  { id: "tableau-de-bord", label: "Tableau de bord" },
  { id: "campagnes", label: "Campagnes LinkedIn" },
  { id: "sessions-appels", label: "Sessions d'appels" },
  { id: "messagerie", label: "Messagerie unifiée" },
  { id: "booking", label: "Booking" },
  { id: "calendrier", label: "Calendrier" },
  { id: "crm", label: "CRM et pipeline" },
  { id: "ia", label: "L'IA dans Andoxa" },
];

const METHODE_LINKS = [
  { id: "cibler", label: "Cibler : le timing" },
  { id: "segmenter", label: "Segmenter et écrire" },
  { id: "caler", label: "Caler les rendez-vous" },
  { id: "piloter", label: "Piloter" },
  { id: "limites", label: "Limites LinkedIn" },
  { id: "demarrage", label: "Vos 30 premiers jours" },
  { id: "erreurs", label: "Erreurs à éviter" },
];

const TOC: TocItem[] = [
  { id: "fonctionnement", label: "Comment fonctionne Andoxa" },
  { id: "demarrer", label: "Démarrer en 4 étapes" },
  { id: "espaces", label: "Chaque espace en détail", children: ESPACE_LINKS },
  { id: "methode", label: "La méthode LinkedIn", children: METHODE_LINKS },
];

const ALL_IDS = TOC.flatMap((t) => [t.id, ...(t.children?.map((c) => c.id) ?? [])]);

function useScrollSpy() {
  const [active, setActive] = React.useState<string>("fonctionnement");
  React.useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-28% 0px -60% 0px", threshold: [0, 1] },
    );
    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);
  return active;
}

/** Capture produit encadrée, bascule clair/sombre si variante fournie. */
function Shot({ light, dark, alt }: { light: string; dark?: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-card shadow-[0_18px_50px_-30px_rgba(2,16,48,0.3)] dark:shadow-[0_18px_50px_-30px_rgba(0,0,0,0.6)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={light} alt={alt} loading="lazy" className={cn("block w-full", dark && "dark:hidden")} />
      {dark && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dark} alt={alt} loading="lazy" className="hidden w-full dark:block" />
      )}
    </div>
  );
}

type MediaRow = {
  id?: string;
  badge?: number;
  title: string;
  paragraphs: string[];
  visual?: React.ReactNode;
  imageRight: boolean;
};

function MediaRow({ id, badge, title, paragraphs, visual, imageRight }: MediaRow) {
  return (
    <div id={id} className={cn(id && "scroll-mt-28")}>
      <div className={cn("grid items-center gap-8 lg:gap-12", visual && "lg:grid-cols-2")}>
        <div className={cn(visual && (imageRight ? "lg:order-1" : "lg:order-2"))}>
          {typeof badge === "number" && (
            <span className="mb-4 grid size-9 place-items-center rounded-xl bg-[var(--brand-blue)] font-display text-sm font-semibold text-white">
              {badge}
            </span>
          )}
          <h3 className="font-display text-2xl text-foreground sm:text-[1.75rem]">{title}</h3>
          <div className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        {visual && <div className={cn(imageRight ? "lg:order-2" : "lg:order-1")}>{visual}</div>}
      </div>
    </div>
  );
}

const ETAPES: MediaRow[] = [
  {
    badge: 1,
    title: "Connectez votre compte LinkedIn",
    imageRight: true,
    visual: <ConnectRelief />,
    paragraphs: [
      "Andoxa se connecte avec une approche prudente, dans les limites de LinkedIn. Volumes plafonnés, rythme proche d'un usage humain. Votre compte reste protégé.",
    ],
  },
  {
    badge: 2,
    title: "Importez vos prospects",
    imageRight: false,
    visual: <ExtensionRelief />,
    paragraphs: [
      "L'extension Chrome est le moyen le plus rapide : depuis un profil ou une recherche LinkedIn, vous ajoutez vos prospects à Andoxa en un clic. Vous pouvez aussi importer un fichier CSV ou créer un prospect à la main. C'est par là que tout commence.",
    ],
  },
  {
    badge: 3,
    title: "Lancez votre première campagne",
    imageRight: true,
    visual: <CampagneRelief />,
    paragraphs: [
      "Vous choisissez vos prospects, vous écrivez votre invitation et votre premier message, vous prévisualisez le rendu avec les variables, vous lancez. Andoxa envoie au bon rythme et centralise les réponses.",
    ],
  },
  {
    badge: 4,
    title: "Suivez et calez vos rendez-vous",
    imageRight: false,
    visual: <BookingRelief />,
    paragraphs: [
      "Dès qu'un prospect répond, la conversation arrive dans votre messagerie. Vous répondez vous-même, vous envoyez votre lien de réservation, le rendez-vous se cale dans votre calendrier, et le prospect avance dans le pipeline.",
    ],
  },
];

const SIGNALS = [
  "Un changement de poste récent (moins de 90 jours)",
  "Une levée de fonds",
  "Des annonces de recrutement",
  "De l'engagement sur des contenus liés à votre expertise",
  "Des commentaires sur les posts de vos concurrents",
  "La publication d'un problème que vous résolvez",
  "Des connexions récentes avec des profils de votre cible",
];

const METRICS = [
  { name: "Taux d'acceptation des invitations", body: "30 à 40 % est sain. En dessous de 25 %, revoyez votre ciblage ou votre message d'invitation." },
  { name: "Taux de réponse aux messages", body: "20 à 35 % est sain. En dessous de 15 %, vos messages sont trop génériques." },
  { name: "Conversion conversation vers rendez-vous", body: "10 à 20 % est sain. En dessous, votre offre n'est pas assez claire." },
  { name: "Conversion meeting vers deal", body: "20 à 35 % en B2B services. En dessous de 15 %, c'est souvent un problème de qualification en amont." },
];

const RDV_REFLEXES = [
  { t: "La vitesse", d: "Dès qu'un prospect montre de l'intérêt, envoyez le lien de réservation tout de suite, dans la conversation. Plus vous attendez, plus vous perdez." },
  { t: "Le formulaire minimal", d: "Demandez seulement l'essentiel pour caler le rendez-vous. Le reste, vous le saurez au call. Chaque champ en trop est une raison d'abandonner." },
  { t: "Le cadre clair", d: "Le prospect doit savoir avec qui, quand, combien de temps, et pourquoi. Un rendez-vous flou est un rendez-vous oublié." },
];

const SEMAINES = [
  { w: "Semaine 1", d: "Connectez LinkedIn, installez l'extension Chrome, importez vos premiers prospects, définissez précisément votre cible." },
  { w: "Semaine 2", d: "Repérez les signaux d'intention sur votre marché, segmentez une première liste, écrivez vos messages, lancez une campagne pilote sur une cinquantaine de prospects." },
  { w: "Semaine 3", d: "Traitez les réponses dans la messagerie, calez vos premiers rendez-vous, mettez votre pipeline à jour au fil de l'eau." },
  { w: "Semaine 4", d: "Regardez vos indicateurs, installez la routine des 3 chiffres du lundi, ajustez vos messages selon ce qui répond." },
];

const ERREURS = [
  { t: "Tout faire en même temps", d: "Une semaine, une étape. C'est comme ça que ça tient dans la durée." },
  { t: "Confondre activité et résultat", d: "« Ça a l'air de mieux marcher » n'est pas une mesure. Regardez les chiffres dès la première semaine, même imparfaits." },
  { t: "Industrialiser le mauvais message", d: "Une grande liste mal ciblée force des messages génériques. Plusieurs petites listes bien ciblées permettent des messages qui touchent." },
];

export function GuideArticle() {
  const active = useScrollSpy();

  const espaces: MediaRow[] = [
    {
      id: "tableau-de-bord",
      title: "Tableau de bord",
      imageRight: true,
      visual: <Shot light="/dashboard-hero.png" dark="/dashboard-dark.png" alt="Tableau de bord Andoxa" />,
      paragraphs: [
        "Le cockpit du matin. En quelques secondes, vous voyez vos priorités du jour, l'état de votre pipeline et les deals à relancer.",
        "Vos indicateurs clés (pipeline actif, rendez-vous calés, taux de réponse, closings face à l'objectif), votre funnel de conversion des invitations jusqu'aux closings, les deals en cours et ceux à risque restés silencieux trop longtemps, et votre activité récente. Tout est cliquable pour aller droit à l'action.",
        "C'est aussi ici que vit votre suivi de performance : invitations envoyées, taux d'acceptation, taux de réponse, rendez-vous, no-show, closing, par utilisateur ou pour toute l'équipe.",
      ],
    },
    {
      id: "campagnes",
      title: "Campagnes LinkedIn",
      imageRight: false,
      visual: <Shot light="/campagnes-section.png" dark="/campagnes-dark.png" alt="Campagnes LinkedIn Andoxa" />,
      paragraphs: [
        "Là où vous lancez votre prospection sortante. Vous créez une campagne en quelques étapes : vous sélectionnez vos prospects, vous choisissez le type (invitation seule, message, ou invitation puis message), vous rédigez avec un aperçu en temps réel et des variables, vous confirmez, vous lancez.",
        "Andoxa envoie au bon rythme et suit en direct les invitations envoyées, acceptées et les réponses reçues. Le point important : la campagne s'arrête à la réponse. Andoxa envoie l'invitation et le premier message, rien de plus. Dès que le prospect répond, c'est vous qui prenez la conversation en main.",
      ],
    },
    {
      id: "sessions-appels",
      title: "Sessions d'appels",
      imageRight: true,
      visual: <Shot light="/session-section.png" alt="Sessions d'appels Andoxa" />,
      paragraphs: [
        "Pour la prospection téléphonique, sans quitter Andoxa. Vous montez une session avec une file de prospects, vous déroulez vos appels un par un avec la fiche sous les yeux, et vous qualifiez chaque contact au fil de l'eau : joignable, pas joignable, pas intéressé, rendez-vous pris.",
        "Vous pouvez caler un rendez-vous directement pendant l'appel. Les appels se passent sur votre téléphone, Andoxa garde la trace et le suivi.",
      ],
    },
    {
      id: "messagerie",
      title: "Messagerie unifiée",
      imageRight: false,
      visual: <MessagerieRelief />,
      paragraphs: [
        "Toutes vos conversations LinkedIn au même endroit, avec une lecture commerciale. Chaque échange porte un statut clair (contacté, répondu, intéressé, rendez-vous confirmé), une timeline d'activité, et une prochaine action suggérée.",
        "À gauche, vos conversations avec des filtres (non lus, à relancer, rendez-vous calés, prospects chauds). À droite, la fiche du prospect, son mini-pipeline et son historique. Vous répondez, vous envoyez un message type ou votre lien de rendez-vous, vous changez le statut, sans jamais quitter la conversation.",
      ],
    },
    {
      id: "booking",
      title: "Booking et lien de réservation",
      imageRight: true,
      visual: <Shot light="/booking-section.png" alt="Lien de réservation Andoxa" />,
      paragraphs: [
        "Votre lien de prise de rendez-vous, entièrement configurable : durée, type de meeting, outil de visio, assignation au bon membre de l'équipe.",
        "Au moment de réserver, le prospect renseigne les informations essentielles, avec son consentement. Le lien se partage dans une conversation, se colle dans une signature, ou se met où vous voulez. Plus le prospect réserve vite, moins vous perdez d'opportunités.",
      ],
    },
    {
      id: "calendrier",
      title: "Calendrier",
      imageRight: false,
      visual: <Shot light="/calendrier-section.png" dark="/calendrier-dark.png" alt="Calendrier Andoxa" />,
      paragraphs: [
        "Tous vos rendez-vous, par utilisateur ou pour toute l'équipe. Chaque événement est rattaché à un prospect et à son deal, vous n'arrivez jamais en rendez-vous sans contexte.",
        "Vous synchronisez avec Google Calendar, vous suivez vos rendez-vous de la semaine, et vous marquez un rendez-vous comme réalisé ou en no-show d'un clic. Le no-show est une décision que vous prenez, pas une détection automatique.",
      ],
    },
    {
      id: "crm",
      title: "CRM et pipeline",
      imageRight: true,
      visual: <Shot light="/crm-section.png" dark="/crm-dark.png" alt="CRM et pipeline Andoxa" />,
      paragraphs: [
        "Le socle. Tous vos prospects dans une vue claire, et un pipeline en kanban, de Nouveau à Signé. Vous faites glisser un prospect d'une étape à l'autre, vous repérez d'un coup d'œil les bouchons et les deals qui stagnent. Vous segmentez vos prospects en listes, par campagne ou par source.",
        "La fiche prospect réunit tout : statut, timeline d'activité complète, conversations liées, rendez-vous, notes. En haut, la prochaine action suggérée vous dit quoi faire ensuite. C'est la page que vous ouvrez pour répondre en dix secondes à : où en est-on, qu'est-ce qu'on s'est dit, quelle est la prochaine étape.",
      ],
    },
    {
      id: "ia",
      title: "L'IA dans Andoxa",
      imageRight: true,
      paragraphs: [
        "L'IA vous fait gagner du temps sans jamais prendre votre place. Elle priorise vos conversations, suggère la prochaine action, vous aide à repérer les prospects chauds et ceux à relancer.",
        "Elle n'envoie jamais un message à votre place et ne décide jamais seule. Vous qualifiez, Andoxa exécute.",
      ],
    },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-background py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_55%_45%_at_50%_25%,black,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-60px] -z-10 h-[380px] w-[720px] -translate-x-1/2 rounded-full bg-[var(--brand-blue-tint)]/50 blur-3xl"
        />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow className="justify-center">Guide</Eyebrow>
            <h1 className="font-display mt-4 text-4xl text-foreground sm:text-5xl">
              Le guide complet d&apos;Andoxa
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-muted-foreground">
              Du profil LinkedIn au rendez-vous calé dans votre pipeline. Comment fonctionne
              Andoxa, comment vous en servir au quotidien, et comment prospecter sur LinkedIn sans y
              passer vos journées.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/pricing" size="lg">
                Essai gratuit de 14 jours
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* BODY : sommaire + contenu */}
      <section className="bg-background py-14 sm:py-16">
        <Container>
          {/* Sommaire mobile */}
          <details className="mb-10 rounded-xl border border-[var(--border)] bg-card p-1 lg:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
              Sommaire
            </summary>
            <nav className="px-2 pb-2">
              {TOC.map((item) => (
                <div key={item.id}>
                  <a href={`#${item.id}`} className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                    {item.label}
                  </a>
                  {item.children && (
                    <div className="ml-3 border-l border-[var(--border)] pl-2">
                      {item.children.map((c) => (
                        <a key={c.id} href={`#${c.id}`} className="block rounded-md px-3 py-1.5 text-[13px] text-muted-foreground/80 hover:text-foreground">
                          {c.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </details>

          <div className="grid gap-12 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
            {/* Sommaire collant desktop */}
            <aside className="hidden lg:block">
              <nav className="sticky top-28 max-h-[calc(100vh-9rem)] space-y-1 overflow-y-auto pr-2 text-sm">
                <p className="px-3 pb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  Sommaire
                </p>
                {TOC.map((item) => (
                  <div key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={cn(
                        "block rounded-md px-3 py-1.5 transition-colors",
                        active === item.id
                          ? "font-medium text-[var(--brand-blue)]"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </a>
                    {item.children && (
                      <div className="mb-1 ml-3 mt-0.5 space-y-0.5 border-l border-[var(--border)] pl-2">
                        {item.children.map((c) => (
                          <a
                            key={c.id}
                            href={`#${c.id}`}
                            className={cn(
                              "block rounded-md px-2.5 py-1 text-[13px] transition-colors",
                              active === c.id
                                ? "font-medium text-[var(--brand-blue)]"
                                : "text-muted-foreground/80 hover:text-foreground",
                            )}
                          >
                            {c.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Contenu */}
            <div className="min-w-0 space-y-20 sm:space-y-24">
              {/* PARTIE 1 */}
              <section id="fonctionnement" className="scroll-mt-28">
                <Eyebrow>01 · Le principe</Eyebrow>
                <h2 className="font-display mt-3 text-3xl text-foreground sm:text-4xl">
                  Comment fonctionne Andoxa
                </h2>
                <div className="mt-6 space-y-4 text-base leading-7 text-muted-foreground">
                  <p>
                    La plupart des équipes commerciales perdent des opportunités entre les étapes.
                    Un prospect qui répond mais qu&apos;on oublie de relancer. Un rendez-vous calé
                    dans un coin, suivi nulle part. Une conversation LinkedIn d&apos;un côté, le
                    pipeline de l&apos;autre, et le fil qui se perd au milieu.
                  </p>
                  <p>
                    Andoxa supprime ce trou. Tout votre cycle commercial tient au même endroit : vous
                    trouvez un prospect sur LinkedIn, vous lancez une campagne, vous échangez à la
                    main quand il répond, vous calez le rendez-vous, et tout se suit dans un pipeline
                    clair.
                  </p>
                  <p>
                    Le principe tient en une phrase : vous qualifiez, Andoxa exécute. Vous décidez qui
                    contacter et quoi écrire. Andoxa s&apos;occupe de la mécanique : envoyer les
                    invitations au bon rythme, centraliser les réponses, proposer le lien de
                    rendez-vous, tenir le pipeline à jour. L&apos;outil ne prend jamais la parole à
                    votre place.
                  </p>
                  <p>
                    Le cycle tient en quatre temps : vous importez un prospect, vous lancez la
                    campagne, vous échangez quand il répond, vous calez le rendez-vous. Ensuite, tout
                    vit dans votre pipeline et vos statistiques.
                  </p>
                </div>

                {/* Petit schéma du cycle */}
                <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--neutral-50)]/60 p-5 sm:flex-row sm:items-center sm:gap-2">
                  {[
                    { icon: UserPlus, label: "Importer" },
                    { icon: Send, label: "Lancer" },
                    { icon: MessageSquare, label: "Échanger" },
                    { icon: CalendarCheck, label: "Caler le RDV" },
                  ].map((step, i, arr) => (
                    <React.Fragment key={step.label}>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-blue-tint)] text-[var(--brand-blue)]">
                          <step.icon size={17} />
                        </span>
                        <span className="text-sm font-medium text-foreground">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <ChevronRight size={16} className="hidden shrink-0 text-muted-foreground/50 sm:block" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>

              {/* PARTIE 2 */}
              <section id="demarrer" className="scroll-mt-28">
                <Eyebrow>02 · Prise en main</Eyebrow>
                <h2 className="font-display mt-3 text-3xl text-foreground sm:text-4xl">
                  Démarrer en 4 étapes
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Voici comment passer de zéro à votre première campagne.
                </p>
                <div className="mt-12 space-y-16 sm:space-y-20">
                  {ETAPES.map((e) => (
                    <MediaRow key={e.badge} {...e} />
                  ))}
                </div>
              </section>

              {/* PARTIE 3 */}
              <section id="espaces" className="scroll-mt-28">
                <Eyebrow>03 · Le produit</Eyebrow>
                <h2 className="font-display mt-3 text-3xl text-foreground sm:text-4xl">
                  Chaque espace en détail
                </h2>
                <div className="mt-10 space-y-16 sm:space-y-20">
                  {espaces.map((e) => (
                    <MediaRow key={e.id} {...e} />
                  ))}
                </div>
              </section>

              {/* PARTIE 4 : MÉTHODE */}
              <section id="methode" className="scroll-mt-28">
                <Eyebrow>04 · La méthode</Eyebrow>
                <h2 className="font-display mt-3 text-3xl text-foreground sm:text-4xl">
                  La méthode pour prospecter sur LinkedIn
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Andoxa exécute proprement. Mais un bon outil ne remplace pas une bonne méthode.
                  Voici celle qu&apos;on voit fonctionner chez les boîtes de services qu&apos;on
                  accompagne.
                </p>

                <div className="mt-12 space-y-14">
                  {/* Cibler */}
                  <div id="cibler" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">Cibler : le timing bat le volume</h3>
                    <div className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
                      <p>
                        La vieille logique LinkedIn (plus de profils, plus d&apos;invitations, plus
                        de messages) est en train de mourir. LinkedIn la pénalise, les prospects la
                        détectent, les taux de réponse s&apos;effondrent. La bonne question n&apos;est
                        pas « comment envoyer plus », c&apos;est « comment envoyer le bon message au
                        bon moment ». Un prospect qui vient de vivre un de ces signaux convertit bien
                        mieux qu&apos;un nom tiré d&apos;une liste froide :
                      </p>
                    </div>
                    <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      {SIGNALS.map((sig) => (
                        <li
                          key={sig}
                          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-card px-4 py-3 text-sm leading-6 text-foreground/90"
                        >
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-blue)]" />
                          {sig}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-base leading-7 text-muted-foreground">
                      Un seul de ces signaux suffit à prioriser un prospect. Plusieurs combinés,
                      c&apos;est une priorité absolue. À vous de les repérer, dans votre veille ou
                      avec un outil comme Sales Navigator. Andoxa prend le relais une fois la liste
                      prête.
                    </p>
                  </div>

                  {/* Segmenter et écrire */}
                  <div id="segmenter" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">
                      Segmenter et écrire : un segment, un signal, un message
                    </h3>
                    <div className="mt-4 space-y-3 text-base leading-7 text-muted-foreground">
                      <p>
                        Une campagne ne convertit que si votre message est relié à un signal commun à
                        toute votre liste. Vous ne lancez pas une campagne sur « directeurs
                        commerciaux en France », mais sur « directeurs commerciaux de boîtes de
                        services qui recrutent activement », et votre message fait référence à ce
                        signal partagé. Les variables dynamiques (prénom, société, poste)
                        personnalisent la surface, mais ne suffisent pas. Un message qui dit juste
                        « Bonjour [Prénom], je vois que vous êtes [Poste] chez [Société] » reste un
                        copier-coller déguisé, et le prospect le sent.
                      </p>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--neutral-50)]/60 p-5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                          <X size={12} strokeWidth={2.5} />
                          Ne fonctionne pas
                        </span>
                        <p className="mt-3 text-sm leading-6 text-foreground/80">
                          {"Bonjour {{prenom}}, je vois que vous êtes directeur commercial chez {{societe}}. J'aimerais échanger sur nos solutions."}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--brand-blue)]/25 bg-[var(--brand-blue-tint)]/40 p-5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          <Check size={12} strokeWidth={2.5} />
                          Fonctionne
                        </span>
                        <p className="mt-3 text-sm leading-6 text-foreground/90">
                          {"Bonjour {{prenom}}, je vois que {{societe}} recrute activement, c'est souvent la phase où la prospection devient un vrai sujet. On accompagne plusieurs boîtes de services exactement à ce moment-là. Ouvert à un échange ?"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-base leading-7 text-muted-foreground">
                      La règle : une campagne, un segment, un signal, un message. Plus votre segment
                      est précis, plus votre message peut être fort. C&apos;est cette discipline qui
                      sépare une campagne à 5 % de réponses d&apos;une campagne qui dépasse 25 %.
                    </p>
                  </div>

                  {/* Caler des RDV */}
                  <div id="caler" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">Caler des rendez-vous qui se tiennent</h3>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">
                      Entre l&apos;intérêt et le rendez-vous calé, beaucoup de prospects disparaissent.
                      Trois réflexes limitent la casse :
                    </p>
                    <div className="mt-5 space-y-3">
                      {RDV_REFLEXES.map((r) => (
                        <div key={r.t} className="rounded-xl border border-[var(--border)] bg-card p-4">
                          <p className="text-sm font-semibold text-foreground">{r.t}</p>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">{r.d}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Piloter */}
                  <div id="piloter" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">Piloter : les indicateurs qui comptent</h3>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">
                      Concentrez-vous sur ceux qui pilotent vraiment, tous visibles dans Andoxa :
                    </p>
                    <ul className="mt-5 space-y-3">
                      {METRICS.map((m) => (
                        <li key={m.name} className="rounded-xl border border-[var(--border)] bg-card p-4">
                          <span className="text-sm font-semibold text-foreground">{m.name}</span>
                          <span className="mt-1 block text-sm leading-6 text-muted-foreground">{m.body}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-base leading-7 text-muted-foreground">
                      Et la routine la plus simple qui soit : tous les lundis, regardez seulement
                      trois chiffres. Combien de rendez-vous la semaine passée, combien se sont tenus,
                      combien sont passés en proposition. Si l&apos;un des trois bouge, vous savez où
                      agir. Le reste est secondaire.
                    </p>
                  </div>

                  {/* Limites LinkedIn */}
                  <div id="limites" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">Rester dans les limites de LinkedIn</h3>
                    <p className="mt-4 text-base leading-7 text-muted-foreground">
                      Andoxa est pensé pour protéger votre compte. L&apos;invitation et le premier
                      message, rien de plus. Des volumes plafonnés, un rythme proche d&apos;un usage
                      humain. C&apos;est vous qui décidez qui contacter et quoi écrire. Moins
                      d&apos;automatisation, moins de risque.
                    </p>
                  </div>

                  {/* 30 premiers jours */}
                  <div id="demarrage" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">Vos 30 premiers jours</h3>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {SEMAINES.map((s) => (
                        <div key={s.w} className="rounded-xl border border-[var(--border)] bg-card p-5">
                          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-blue)]">
                            {s.w}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.d}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Erreurs */}
                  <div id="erreurs" className="scroll-mt-28">
                    <h3 className="font-display text-2xl text-foreground">Les erreurs à éviter</h3>
                    <div className="mt-5 space-y-3">
                      {ERREURS.map((er) => (
                        <div key={er.t} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-card p-4">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">
                            <X size={12} strokeWidth={2.5} />
                          </span>
                          <span>
                            <span className="text-sm font-semibold text-foreground">{er.t}. </span>
                            <span className="text-sm leading-6 text-muted-foreground">{er.d}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA FINAL */}
      <section className="bg-background pb-24 sm:pb-32">
        <Container>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[var(--brand-blue)] bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-dark)] p-10 text-center text-white shadow-[0_30px_60px_-30px_rgba(0,82,217,0.5)] sm:p-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_10%,rgba(255,255,255,0.16),transparent_60%)]"
            />
            <div className="relative">
              <h2 className="font-display text-2xl text-white sm:text-3xl">Prêt à prospecter autrement ?</h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-white/80">
                Importez vos premiers prospects, lancez une campagne, calez vos rendez-vous. Tout au
                même endroit, sans gérer la prospection.
              </p>
              <div className="mt-8 flex justify-center">
                <Button
                  href="/pricing"
                  size="lg"
                  className="bg-white !text-[var(--brand-blue-dark)] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] hover:bg-white/95"
                >
                  Essai gratuit de 14 jours
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
