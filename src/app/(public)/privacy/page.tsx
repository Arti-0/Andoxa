import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Politique de confidentialité, Andoxa",
  description:
    "Politique de confidentialité d'Andoxa, conforme RGPD et loi Informatique et Libertés.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      updatedOn="10 mai 2026"
      intro="La présente politique décrit comment ANDOXA collecte, utilise et protège les données personnelles des utilisateurs du site andoxa.fr, conformément au Règlement Général sur la Protection des Données (RGPD, Règlement UE 2016/679) et à la loi Informatique et Libertés modifiée."
      sections={[
        {
          id: "responsable",
          heading: "1. Responsable du traitement",
          body: (
            <>
              <p>
                <strong className="text-foreground">ANDOXA (SAS)</strong>
              </p>
              <p>Siège social&nbsp;: 18 rue du Général Leclerc, 93110 Rosny-sous-Bois</p>
              <p>
                Email&nbsp;: <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>
              </p>
              <p>Téléphone&nbsp;: 07&nbsp;67&nbsp;06&nbsp;88&nbsp;12</p>
            </>
          ),
        },
        {
          id: "donnees",
          heading: "2. Données collectées et finalités",
          body: (
            <>
              <p>
                Nous collectons des données personnelles dans le cadre des activités
                suivantes&nbsp;:
              </p>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-card">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                      <th className="px-4 py-3 font-semibold text-foreground">Activité</th>
                      <th className="px-4 py-3 font-semibold text-foreground">Données collectées</th>
                      <th className="px-4 py-3 font-semibold text-foreground">Base légale</th>
                      <th className="px-4 py-3 font-semibold text-foreground">Conservation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    <tr>
                      <td className="px-4 py-3">Formulaire de contact</td>
                      <td className="px-4 py-3">Nom, email, message</td>
                      <td className="px-4 py-3">Intérêt légitime</td>
                      <td className="px-4 py-3">3 ans</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">E-commerce</td>
                      <td className="px-4 py-3">
                        Nom, adresse, email, téléphone, données de paiement
                      </td>
                      <td className="px-4 py-3">Exécution du contrat</td>
                      <td className="px-4 py-3">5 ans (obligation comptable)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Comptes utilisateurs</td>
                      <td className="px-4 py-3">Nom, email, mot de passe (haché)</td>
                      <td className="px-4 py-3">Exécution du contrat</td>
                      <td className="px-4 py-3">3 ans après le dernier accès</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
        {
          id: "destinataires",
          heading: "3. Destinataires des données",
          body: (
            <>
              <p>Les données collectées peuvent être transmises aux destinataires suivants&nbsp;:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-foreground">Paiement&nbsp;:</strong> Stripe
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "droits",
          heading: "4. Vos droits",
          body: (
            <>
              <p>
                Conformément aux articles 15 à 22 du RGPD et aux articles 48 et suivants de la loi
                Informatique et Libertés, vous disposez des droits suivants&nbsp;:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-foreground">Droit d&apos;accès (art. 15 RGPD)</strong> :
                  obtenir confirmation que vos données sont traitées et en obtenir une copie
                </li>
                <li>
                  <strong className="text-foreground">Droit de rectification (art. 16 RGPD)</strong>{" "}
                  : corriger vos données inexactes ou incomplètes
                </li>
                <li>
                  <strong className="text-foreground">
                    Droit à l&apos;effacement (art. 17 RGPD)
                  </strong>{" "}
                  : demander la suppression de vos données
                </li>
                <li>
                  <strong className="text-foreground">Droit à la limitation (art. 18 RGPD)</strong> :
                  limiter le traitement de vos données
                </li>
                <li>
                  <strong className="text-foreground">Droit à la portabilité (art. 20 RGPD)</strong>{" "}
                  : recevoir vos données dans un format structuré et lisible
                </li>
                <li>
                  <strong className="text-foreground">Droit d&apos;opposition (art. 21 RGPD)</strong>{" "}
                  : vous opposer au traitement de vos données
                </li>
                <li>
                  <strong className="text-foreground">
                    Directives post-mortem (art. 85 loi Informatique et Libertés)
                  </strong>{" "}
                  : définir le sort de vos données après votre décès
                </li>
              </ul>
              <p>
                Pour exercer vos droits, contactez-nous à&nbsp;:{" "}
                <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>.
              </p>
              <p>
                Vous disposez également du droit d&apos;introduire une réclamation auprès de la
                CNIL&nbsp;: 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07,{" "}
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
                  www.cnil.fr
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: "securite",
          heading: "5. Sécurité des données",
          body: (
            <p>
              Nous mettons en œuvre les mesures techniques et organisationnelles appropriées pour
              assurer la sécurité et la confidentialité de vos données personnelles, conformément à
              l&apos;article 32 du RGPD.
            </p>
          ),
        },
        {
          id: "modification",
          heading: "6. Modification de la politique",
          body: (
            <p>
              Nous nous réservons le droit de modifier la présente politique de confidentialité à
              tout moment. Toute modification sera publiée sur cette page avec une date de mise à
              jour.
            </p>
          ),
        },
      ]}
    />
  );
}
