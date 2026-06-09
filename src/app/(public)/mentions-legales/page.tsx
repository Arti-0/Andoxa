import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Mentions légales, Andoxa",
  description: "Mentions légales du site andoxa.fr et de la plateforme Andoxa.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageLayout
      title="Mentions légales"
      updatedOn="10 mai 2026"
      intro="Conformément aux articles 6-III et 19 de la Loi n°2004-575 du 21 juin 2004 pour la Confiance dans l'économie numérique (LCEN), il est porté à la connaissance des utilisateurs et visiteurs du site andoxa.fr les présentes mentions légales."
      sections={[
        {
          id: "editeur",
          heading: "Éditeur du site",
          body: (
            <>
              <p>Le site andoxa.fr est édité par&nbsp;:</p>
              <p>
                <strong className="text-foreground">Raison sociale&nbsp;:</strong> ANDOXA
              </p>
              <p>
                <strong className="text-foreground">Forme juridique&nbsp;:</strong> SAS (Société par
                actions simplifiée)
              </p>
              <p>
                <strong className="text-foreground">Capital social&nbsp;:</strong> 500,00&nbsp;€
              </p>
              <p>
                <strong className="text-foreground">Siège social&nbsp;:</strong> 18 rue du Général
                Leclerc, 93110 Rosny-sous-Bois
              </p>
              <p>
                <strong className="text-foreground">SIRET&nbsp;:</strong> 99097437000019
              </p>
              <p>
                <strong className="text-foreground">RCS&nbsp;:</strong> 990&nbsp;974&nbsp;370 R.C.S.
                Bobigny
              </p>
              <p>
                <strong className="text-foreground">N° de TVA intracommunautaire&nbsp;:</strong>{" "}
                FR95990974370
              </p>
              <p>
                <strong className="text-foreground">Directeur de la publication&nbsp;:</strong>{" "}
                Sebastian Bodin
              </p>
              <p>
                <strong className="text-foreground">Email&nbsp;:</strong>{" "}
                <a href="mailto:contact@andoxa.fr">contact@andoxa.fr</a>
              </p>
              <p>
                <strong className="text-foreground">Téléphone&nbsp;:</strong>{" "}
                07&nbsp;67&nbsp;06&nbsp;88&nbsp;12
              </p>
            </>
          ),
        },
        {
          id: "hebergeur",
          heading: "Hébergeur",
          body: (
            <>
              <p>Le site est hébergé par&nbsp;:</p>
              <p>
                <strong className="text-foreground">Nom&nbsp;:</strong> Vercel
              </p>
              <p>
                <strong className="text-foreground">Adresse&nbsp;:</strong> 340&nbsp;S Lemon Ave
                #4133, Walnut, CA&nbsp;91789, USA
              </p>
              <p>
                <strong className="text-foreground">Téléphone&nbsp;:</strong>{" "}
                +1&nbsp;559&nbsp;288&nbsp;7060
              </p>
            </>
          ),
        },
        {
          id: "propriete",
          heading: "Propriété intellectuelle",
          body: (
            <>
              <p>
                L&apos;ensemble du contenu du site andoxa.fr (textes, images, vidéos, logos, icônes,
                sons, logiciels, base de données, mise en page, etc.) est protégé par le droit
                d&apos;auteur, le droit des marques et le droit des bases de données.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, transmission,
                dénaturation, totale ou partielle du site ou de son contenu, par quelque procédé que
                ce soit, et sur quelque support que ce soit, est interdite sans l&apos;autorisation
                écrite préalable de l&apos;éditeur.
              </p>
              <p>
                Toute exploitation non autorisée du site ou de son contenu sera considérée comme
                constitutive d&apos;une contrefaçon et poursuivie conformément aux dispositions des
                articles L.335-2 et suivants du Code de Propriété Intellectuelle.
              </p>
            </>
          ),
        },
        {
          id: "responsabilite",
          heading: "Limitation de responsabilité",
          body: (
            <>
              <p>
                L&apos;éditeur du site s&apos;efforce d&apos;assurer au mieux l&apos;exactitude et la
                mise à jour des informations diffusées sur le site. Toutefois, il ne peut garantir
                l&apos;exactitude, la précision ou l&apos;exhaustivité des informations mises à
                disposition.
              </p>
              <p>
                L&apos;éditeur ne pourra être tenu responsable des dommages directs et indirects
                causés au matériel de l&apos;utilisateur, lors de l&apos;accès au site, résultant soit
                de l&apos;utilisation d&apos;un matériel ne répondant pas aux spécifications requises,
                soit de l&apos;apparition d&apos;un bug ou d&apos;une incompatibilité.
              </p>
              <p>
                Le site peut contenir des liens hypertextes vers d&apos;autres sites internet.
                L&apos;éditeur ne dispose d&apos;aucun moyen de contrôle du contenu des sites tiers et
                décline toute responsabilité à leur égard.
              </p>
            </>
          ),
        },
        {
          id: "droit",
          heading: "Droit applicable",
          body: (
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, les
              tribunaux français seront seuls compétents.
            </p>
          ),
        },
      ]}
    />
  );
}
