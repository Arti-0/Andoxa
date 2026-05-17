import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales de vente, Andoxa",
  description:
    "Conditions générales de vente régissant les abonnements à la plateforme Andoxa.",
};

export default function CgvPage() {
  return (
    <LegalPageLayout
      title="Conditions générales de vente"
      updatedOn="10 mai 2026"
      intro="Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre la société ANDOXA et toute personne morale ou physique agissant à des fins professionnelles souscrivant à un abonnement à la plateforme Andoxa."
      sections={[
        {
          id: "objet",
          heading: "Article 1 — Objet",
          body: (
            <>
              <p>
                Les présentes CGV régissent les relations contractuelles entre la société{" "}
                <strong className="text-foreground">ANDOXA</strong>, SAS au capital de{" "}
                <strong className="text-foreground">500 €</strong>, immatriculée au RCS de{" "}
                <strong className="text-foreground">Bobigny</strong> sous le numéro{" "}
                <strong className="text-foreground">990 974 370</strong>, dont le siège social est
                situé{" "}
                <strong className="text-foreground">
                  18 rue du Général Leclerc, 93110 Rosny-sous-Bois
                </strong>{" "}
                («&nbsp;Andoxa&nbsp;» ou «&nbsp;le Prestataire&nbsp;»), et toute personne morale ou
                physique agissant à des fins professionnelles («&nbsp;le Client&nbsp;»).
              </p>
              <p>
                Andoxa est une plateforme SaaS B2B destinée à orchestrer et automatiser le cycle de
                conversion commerciale des Clients («&nbsp;la Plateforme&nbsp;» ou «&nbsp;le
                Service&nbsp;»).
              </p>
              <p>
                Les présentes CGV s&apos;appliquent à l&apos;exclusion de tout autre document. Toute
                souscription à un abonnement emporte acceptation pleine et entière des CGV.
              </p>
            </>
          ),
        },
        {
          id: "service",
          heading: "Article 2 — Description du Service",
          body: (
            <>
              <p>
                Andoxa met à disposition du Client une plateforme en ligne accessible via un
                navigateur web, permettant notamment&nbsp;:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>la gestion de campagnes de prospection commerciale (LinkedIn, WhatsApp, appels)&nbsp;;</li>
                <li>la centralisation et le suivi des conversations commerciales&nbsp;;</li>
                <li>la prise de rendez-vous via un système de booking intégré&nbsp;;</li>
                <li>la gestion d&apos;un CRM&nbsp;;</li>
                <li>la création et l&apos;exécution de workflows automatisés&nbsp;;</li>
                <li>la production de tableaux de bord et de statistiques commerciales.</li>
              </ul>
              <p>
                Andoxa se réserve le droit de faire évoluer le Service sous réserve de ne pas
                dégrader substantiellement le Service souscrit.
              </p>
            </>
          ),
        },
        {
          id: "souscription",
          heading: "Article 3 — Souscription et accès au Service",
          body: (
            <>
              <p>
                <strong className="text-foreground">3.1 Création de compte.</strong> L&apos;accès au
                Service nécessite la création d&apos;un compte utilisateur. Le Client garantit
                l&apos;exactitude des informations fournies.
              </p>
              <p>
                <strong className="text-foreground">3.2 Démonstration.</strong> Andoxa propose une
                démonstration commerciale gratuite et sans engagement, sur prise de rendez-vous. Elle
                ne constitue pas un essai gratuit du Service.
              </p>
              <p>
                <strong className="text-foreground">3.3 Identifiants.</strong> Les identifiants de
                connexion sont strictement personnels et confidentiels. Toute utilisation non
                autorisée doit être signalée sans délai à Andoxa.
              </p>
            </>
          ),
        },
        {
          id: "tarifs",
          heading: "Article 4 — Tarifs et modalités de paiement",
          body: (
            <>
              <p>
                <strong className="text-foreground">4.1 Tarifs.</strong> Les tarifs sont indiqués sur
                le site d&apos;Andoxa, en euros et hors taxes. Andoxa propose un abonnement mensuel
                (facturé chaque mois d&apos;avance) et un abonnement annuel (facturé en une fois à la
                souscription, pour douze mois consécutifs).
              </p>
              <p>
                <strong className="text-foreground">4.2 Évolution des tarifs.</strong> Toute
                modification sera notifiée au Client par email avec un préavis minimum de trente (30)
                jours.
              </p>
              <p>
                <strong className="text-foreground">4.3 Modalités de paiement.</strong> Le paiement
                s&apos;effectue par carte bancaire ou prélèvement SEPA, via le prestataire de paiement
                sécurisé partenaire d&apos;Andoxa.
              </p>
              <p>
                <strong className="text-foreground">4.4 Défaut de paiement.</strong> Tout retard
                entraîne de plein droit des pénalités égales à trois fois le taux d&apos;intérêt
                légal, une indemnité forfaitaire de 40 €, la suspension de l&apos;accès après mise en
                demeure infructueuse de huit (8) jours, et la résiliation après quinze (15) jours de
                non-régularisation.
              </p>
            </>
          ),
        },
        {
          id: "duree",
          heading: "Article 5 — Durée de l'abonnement",
          body: (
            <>
              <p>
                L&apos;abonnement prend effet à la date de la première souscription, pour la durée
                choisie (mensuelle ou annuelle).
              </p>
              <p>
                Il est <strong className="text-foreground">renouvelé tacitement</strong> pour des
                périodes successives de même durée, sauf résiliation dans les conditions de
                l&apos;article 6.
              </p>
            </>
          ),
        },
        {
          id: "resiliation",
          heading: "Article 6 — Résiliation",
          body: (
            <>
              <p>
                <strong className="text-foreground">6.1 Par le Client.</strong> Résiliation à tout
                moment depuis l&apos;espace Client ou par demande écrite à{" "}
                <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>. Pour un abonnement mensuel,
                effet à la fin de la période en cours&nbsp;; pour un abonnement annuel, effet à la fin
                de la période annuelle, sans remboursement prorata temporis.
              </p>
              <p>
                <strong className="text-foreground">6.2 Par Andoxa.</strong> Résiliation de plein
                droit en cas de non-paiement, de manquement grave, ou d&apos;utilisation contraire aux
                CGV ou aux conditions des plateformes tierces.
              </p>
              <p>
                <strong className="text-foreground">6.3 Effets.</strong> À la résiliation,
                l&apos;accès est désactivé. Les données sont conservées trente (30) jours pour
                récupération, puis supprimées.
              </p>
            </>
          ),
        },
        {
          id: "obligations-client",
          heading: "Article 7 — Obligations du Client",
          body: (
            <>
              <p>Le Client s&apos;engage à&nbsp;:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>utiliser le Service conformément à sa destination et aux présentes CGV&nbsp;;</li>
                <li>
                  respecter les conditions d&apos;utilisation des plateformes tierces (LinkedIn,
                  WhatsApp, Google Calendar)&nbsp;;
                </li>
                <li>
                  ne pas utiliser le Service à des fins de spam ou de prospection abusive (RGPD,
                  LCEN, e-Privacy)&nbsp;;
                </li>
                <li>obtenir et maintenir les consentements requis auprès des personnes concernées&nbsp;;</li>
                <li>ne pas contourner les mesures de sécurité ou les limites du Service.</li>
              </ul>
              <p>
                Le Client demeure seul responsable du contenu des messages envoyés via la
                Plateforme.
              </p>
            </>
          ),
        },
        {
          id: "obligations-andoxa",
          heading: "Article 8 — Obligations d'Andoxa",
          body: (
            <>
              <p>Andoxa s&apos;engage à&nbsp;:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  mettre tout en œuvre pour assurer la disponibilité du Service, sous réserve de
                  maintenance et de force majeure&nbsp;;
                </li>
                <li>assurer la sécurité et la confidentialité des données du Client&nbsp;;</li>
                <li>notifier le Client de toute interruption planifiée avec un délai raisonnable.</li>
              </ul>
              <p>Andoxa est tenue à une obligation de moyens et non de résultat.</p>
            </>
          ),
        },
        {
          id: "disponibilite",
          heading: "Article 9 — Disponibilité et maintenance",
          body: (
            <>
              <p>
                Andoxa ne peut être tenue responsable des interruptions liées à la maintenance, des
                défaillances des services tiers (LinkedIn, WhatsApp, hébergeurs), ni des cas de force
                majeure.
              </p>
              <p>
                Les opérations de maintenance planifiée seront, dans la mesure du possible,
                programmées hors heures ouvrées et notifiées au préalable.
              </p>
            </>
          ),
        },
        {
          id: "propriete",
          heading: "Article 10 — Propriété intellectuelle",
          body: (
            <>
              <p>
                <strong className="text-foreground">10.1 Propriété d&apos;Andoxa.</strong> La
                Plateforme, son code, son interface, ses bases de données, marques et logos sont la
                propriété exclusive d&apos;Andoxa. L&apos;abonnement confère un droit d&apos;usage
                personnel, non exclusif, non cessible et limité à la durée de l&apos;abonnement.
              </p>
              <p>
                <strong className="text-foreground">10.2 Données du Client.</strong> Le Client demeure
                propriétaire des données qu&apos;il importe ou produit. Andoxa ne les utilise que pour
                l&apos;exécution du Service.
              </p>
            </>
          ),
        },
        {
          id: "donnees",
          heading: "Article 11 — Données à caractère personnel",
          body: (
            <>
              <p>
                Le traitement des données personnelles est régi par la{" "}
                <a href="/privacy">Politique de Confidentialité</a> d&apos;Andoxa, ainsi que, le cas
                échéant, par un Accord de Sous-Traitance (DPA) au sens de l&apos;article 28 du RGPD.
              </p>
              <p>
                Le Client agit en qualité de{" "}
                <strong className="text-foreground">Responsable de Traitement</strong> pour les
                données qu&apos;il importe&nbsp;; Andoxa agit en qualité de{" "}
                <strong className="text-foreground">Sous-traitant</strong>.
              </p>
            </>
          ),
        },
        {
          id: "confidentialite",
          heading: "Article 12 — Confidentialité",
          body: (
            <p>
              Chaque partie s&apos;engage à conserver confidentielles les informations non publiques
              de l&apos;autre partie pendant toute la durée du contrat et trois (3) ans après son
              terme.
            </p>
          ),
        },
        {
          id: "responsabilite",
          heading: "Article 13 — Responsabilité",
          body: (
            <>
              <p>
                <strong className="text-foreground">13.1 Limitation.</strong> Andoxa n&apos;est pas
                responsable des dommages indirects (pertes de chiffre d&apos;affaires, de clientèle,
                atteinte à l&apos;image, perte de données causée par le Client).
              </p>
              <p>
                <strong className="text-foreground">13.2 Plafonnement.</strong> Sauf faute lourde ou
                intentionnelle, la responsabilité d&apos;Andoxa est limitée au montant total versé par
                le Client au cours des douze (12) mois précédant le fait générateur.
              </p>
              <p>
                <strong className="text-foreground">13.3 Plateformes tierces.</strong> Andoxa
                n&apos;est pas responsable des conséquences des actions menées via les plateformes
                tierces (blocage de compte LinkedIn/WhatsApp), de leurs modifications unilatérales ni
                de leur indisponibilité.
              </p>
            </>
          ),
        },
        {
          id: "force-majeure",
          heading: "Article 14 — Force majeure",
          body: (
            <p>
              Aucune partie ne pourra être tenue responsable d&apos;un manquement résultant d&apos;un
              cas de force majeure au sens de l&apos;article 1218 du Code civil&nbsp;: catastrophes
              naturelles, pandémies, grèves, attaques informatiques, défaillances généralisées
              d&apos;Internet, décisions des autorités publiques.
            </p>
          ),
        },
        {
          id: "modification",
          heading: "Article 15 — Modification des CGV",
          body: (
            <p>
              Andoxa se réserve le droit de modifier les présentes CGV. Toute modification sera
              notifiée par email et publiée sur le site avec un préavis de trente (30) jours. La
              poursuite de l&apos;utilisation du Service après ce délai vaut acceptation.
            </p>
          ),
        },
        {
          id: "cession",
          heading: "Article 16 — Cession",
          body: (
            <p>
              Le Client ne peut céder ses droits et obligations sans l&apos;accord écrit préalable
              d&apos;Andoxa. Andoxa pourra librement céder le contrat dans le cadre d&apos;une cession
              de fonds de commerce, fusion, scission ou opération similaire.
            </p>
          ),
        },
        {
          id: "droit",
          heading: "Article 17 — Droit applicable et juridiction",
          body: (
            <>
              <p>
                Les présentes CGV sont régies par le{" "}
                <strong className="text-foreground">droit français</strong>.
              </p>
              <p>
                En cas de litige, et à défaut de résolution amiable,{" "}
                <strong className="text-foreground">
                  les tribunaux de Bobigny seront seuls compétents
                </strong>
                , nonobstant pluralité de défendeurs ou appel en garantie.
              </p>
            </>
          ),
        },
        {
          id: "contact",
          heading: "Article 18 — Contact",
          body: (
            <>
              <p>Pour toute question relative aux présentes CGV&nbsp;:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-foreground">Email&nbsp;:</strong>{" "}
                  <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>
                </li>
                <li>
                  <strong className="text-foreground">Adresse&nbsp;:</strong> 18 rue du Général
                  Leclerc, 93110 Rosny-sous-Bois
                </li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
