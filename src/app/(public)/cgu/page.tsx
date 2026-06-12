import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation, Andoxa",
  description:
    "Conditions générales d'utilisation du site andoxa.fr et de la plateforme Andoxa.",
};

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout
      title="Conditions générales d'utilisation"
      updatedOn="12 juin 2026"
      intro="Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du site andoxa.fr. Elles définissent les droits et obligations des utilisateurs et de l'éditeur concernant l'utilisation des services proposés par Andoxa."
      sections={[
        {
          id: "objet",
          heading: "1. Objet & définitions",
          body: (
            <>
              <p>
                Les présentes CGU régissent l&apos;accès et l&apos;utilisation du site Andoxa,
                accessible à l&apos;adresse{" "}
                <a href="https://www.andoxa.fr" target="_blank" rel="noopener noreferrer">
                  https://www.andoxa.fr
                </a>
                .
              </p>
              <p>
                <strong>Définitions&nbsp;:</strong>
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Service</strong>&nbsp;: désigne l&apos;ensemble des fonctionnalités et
                  services offerts par Andoxa.
                </li>
                <li>
                  <strong>Utilisateur</strong>&nbsp;: toute personne physique ou morale qui accède
                  au Service.
                </li>
                <li>
                  <strong>Éditeur</strong>&nbsp;: désigne ANDOXA SAS, responsable de la publication
                  du Service.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "acceptation",
          heading: "2. Acceptation & modifications",
          body: (
            <p>
              L&apos;accès et l&apos;utilisation du Service impliquent l&apos;acceptation sans
              réserve des présentes CGU par l&apos;Utilisateur. L&apos;Éditeur se réserve le droit
              de modifier les CGU à tout moment. Les modifications seront notifiées à
              l&apos;Utilisateur par tout moyen approprié, et entreront en vigueur à la date de
              leur publication sur le site.
            </p>
          ),
        },
        {
          id: "acces",
          heading: "3. Accès au service & sécurité",
          body: (
            <>
              <p>
                L&apos;accès au Service est assuré 24 heures sur 24, 7 jours sur 7, sauf en cas de
                force majeure ou d&apos;événements hors du contrôle de l&apos;Éditeur.
                L&apos;Éditeur se réserve le droit d&apos;interrompre l&apos;accès au Service pour
                des raisons de maintenance, sans que cela ne puisse engager sa responsabilité.
              </p>
              <p>
                L&apos;Éditeur met en œuvre des mesures de sécurité appropriées pour protéger les
                données et garantir la disponibilité du Service. Toutefois, l&apos;Utilisateur est
                informé qu&apos;aucun système n&apos;est totalement sécurisé.
              </p>
            </>
          ),
        },
        {
          id: "comptes",
          heading: "4. Comptes & authentification",
          body: (
            <p>
              L&apos;utilisation de certaines fonctionnalités du Service peut nécessiter la
              création d&apos;un compte. L&apos;Utilisateur s&apos;engage à fournir des
              informations exactes et à jour lors de l&apos;inscription. Il est responsable de la
              confidentialité de ses identifiants et de toutes les activités effectuées sous son
              compte.
            </p>
          ),
        },
        {
          id: "regles",
          heading: "5. Règles d'usage & contenus interdits",
          body: (
            <>
              <p>
                L&apos;Utilisateur s&apos;engage à utiliser le Service conformément à la
                législation en vigueur et à ne pas porter atteinte aux droits des tiers. Il est
                interdit de&nbsp;:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Publier des contenus illégaux, diffamatoires, ou contraires à l&apos;ordre
                  public.
                </li>
                <li>
                  Utiliser le Service à des fins commerciales sans autorisation préalable de
                  l&apos;Éditeur.
                </li>
                <li>
                  Perturber le fonctionnement du Service ou tenter d&apos;accéder à des zones non
                  autorisées.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "propriete",
          heading: "6. Propriété intellectuelle",
          body: (
            <p>
              Tous les éléments du Service, y compris les marques, logos, textes, images, et
              logiciels, sont protégés par le droit de la propriété intellectuelle.
              L&apos;Utilisateur bénéficie d&apos;une licence d&apos;utilisation limitée, non
              exclusive et non transférable, pour accéder au Service. Toute reproduction ou
              représentation, totale ou partielle, est interdite sans autorisation préalable de
              l&apos;Éditeur.
            </p>
          ),
        },
        {
          id: "donnees",
          heading: "7. Données personnelles",
          body: (
            <p>
              Les données personnelles collectées dans le cadre de l&apos;utilisation du Service
              sont traitées conformément à la <a href="/privacy">Politique de confidentialité</a>{" "}
              d&apos;Andoxa. L&apos;Utilisateur est invité à la consulter pour comprendre comment
              ses données sont utilisées et protégées.
            </p>
          ),
        },
        {
          id: "cookies",
          heading: "8. Cookies & traceurs",
          body: (
            <p>
              Le site Andoxa peut utiliser des cookies et autres traceurs pour améliorer
              l&apos;expérience utilisateur. L&apos;Utilisateur peut gérer ses préférences en
              matière de cookies via les paramètres de son navigateur.
            </p>
          ),
        },
        {
          id: "responsabilites",
          heading: "9. Responsabilités",
          body: (
            <>
              <p>
                L&apos;Éditeur ne saurait être tenu responsable des dommages directs ou indirects
                résultant de l&apos;utilisation du Service. L&apos;Utilisateur est responsable de
                l&apos;utilisation qu&apos;il fait du Service et des conséquences qui en découlent.
                En cas de non-respect des CGU, l&apos;Éditeur se réserve le droit de suspendre ou de
                résilier l&apos;accès au Service.
              </p>
              <p>
                <strong>Utilisation de LinkedIn et des plateformes tierces.</strong> Andoxa est un
                outil indépendant, qui n&apos;est ni affilié à, ni approuvé, ni soutenu par
                LinkedIn Corporation. L&apos;Utilisateur reconnaît que l&apos;utilisation
                d&apos;outils d&apos;automatisation ou d&apos;assistance à la prospection peut
                contrevenir aux conditions d&apos;utilisation de LinkedIn ou de toute autre
                plateforme tierce connectée au Service.
              </p>
              <p>
                En utilisant le Service, l&apos;Utilisateur déclare agir en toute connaissance de
                cause et assume <strong>seul et entièrement (à 100&nbsp;%) la responsabilité</strong>{" "}
                de l&apos;utilisation qu&apos;il fait de son ou ses comptes LinkedIn via Andoxa. La
                responsabilité de l&apos;Éditeur ne pourra en aucun cas être engagée, et
                l&apos;Utilisateur renonce à tout recours contre l&apos;Éditeur, pour tout
                événement, prévisible ou imprévisible, affectant son compte LinkedIn ou ses données,
                y compris notamment&nbsp;: restriction temporaire ou permanente, limitation de
                visibilité (« shadowban »), suspension, bannissement, suppression de compte, perte
                de relations, de messages ou de données, ou toute autre mesure prise par LinkedIn ou
                un tiers. Il appartient à l&apos;Utilisateur de paramétrer et d&apos;utiliser le
                Service de manière conforme aux conditions des plateformes tierces concernées.
              </p>
            </>
          ),
        },
        {
          id: "liens-tiers",
          heading: "10. Liens hypertextes & services tiers",
          body: (
            <p>
              Le Service peut contenir des liens vers des sites tiers. L&apos;Éditeur ne contrôle
              pas ces sites et ne peut être tenu responsable de leur contenu ou de leur politique
              de confidentialité. L&apos;Utilisateur est invité à consulter les CGU et politiques
              de confidentialité de ces sites.
            </p>
          ),
        },
        {
          id: "financier",
          heading: "11. Modalités financières",
          body: (
            <p>
              Les modalités tarifaires applicables aux abonnements à la plateforme Andoxa sont
              régies par les <a href="/cgv">Conditions Générales de Vente</a>. Toute modification
              sera notifiée à l&apos;Utilisateur dans les conditions prévues à l&apos;article 2.
            </p>
          ),
        },
        {
          id: "resiliation",
          heading: "12. Résiliation & suppression de compte",
          body: (
            <p>
              L&apos;Utilisateur peut résilier son compte à tout moment en contactant
              l&apos;Éditeur à l&apos;adresse suivante&nbsp;:{" "}
              <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>. L&apos;Éditeur se réserve
              le droit de supprimer un compte en cas de non-respect des CGU.
            </p>
          ),
        },
        {
          id: "preuve",
          heading: "13. Preuve & archivage",
          body: (
            <p>
              Les registres informatisés, conservés dans les systèmes de l&apos;Éditeur et dans des
              conditions raisonnables de sécurité, seront considérés comme des preuves des
              communications et des transactions intervenues entre l&apos;Utilisateur et
              l&apos;Éditeur.
            </p>
          ),
        },
        {
          id: "droit",
          heading: "14. Droit applicable & juridiction",
          body: (
            <p>
              Les présentes CGU sont régies par le droit français. En cas de litige, les tribunaux
              compétents seront ceux de Paris, sauf disposition légale contraire.
            </p>
          ),
        },
        {
          id: "contact",
          heading: "15. Contact",
          body: (
            <p>
              Pour toute question relative aux présentes CGU, l&apos;Utilisateur peut contacter
              l&apos;Éditeur à l&apos;adresse&nbsp;:{" "}
              <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>.
            </p>
          ),
        },
        {
          id: "vigueur",
          heading: "16. Date d'entrée en vigueur",
          body: (
            <p>
              Les présentes CGU entrent en vigueur le 10 mai 2026 et peuvent être mises à jour à
              tout moment.
            </p>
          ),
        },
      ]}
    />
  );
}
