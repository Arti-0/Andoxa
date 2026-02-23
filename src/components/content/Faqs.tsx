"use client"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion"
import Balancer from "react-wrap-balancer";

const faqs = [
  {
    question: "En quoi Andoxa est-elle différente d’un CRM classique ?",
    answer:
      "Contrairement aux CRM généralistes, Andoxa a été conçue avec une priorité claire : répondre aux besoins spécifiques des Junior-Entreprises. Elle s&apos;inspire des processus réels observés dans les JE et propose une structure déjà alignée sur leur fonctionnement. Le tout avec une interface simple, modulaire, et facilement personnalisable selon les pratiques de chaque structure",
  },
  {
    question: "Combien de temps faut-il pour maîtriser la plateforme ?",
    answer:
      "En moins d’une heure, vous êtes opérationnel ! Grâce à une interface intuitive et à un onboarding intelligent, vous pouvez commencer à générer de la valeur immédiatement. Pas besoin de formation longue ou de tutoriel compliqué.",
  },
  {
    question:
      "Est-ce que l’équipe peut nous accompagner en cas de question ou problème ?",
    answer:
      "Absolument. Notre équipe support est disponible par email, chat et visio. Réponse garantie en moins de 24h ouvrées.",
  },
  {
    question: "Qui peut accéder à nos données ?",
    answer:
      "Seuls les membres autorisés de votre JE peuvent accéder à vos données via un système de rôles et permissions. Aucun tiers n’y a accès sans votre consentement.",
  },

  {
    question: "Est-ce qu’il y aura des évolutions techniques régulières ?",
    answer:
      "Oui. Andoxa est en constante amélioration, avec des mises à jour fréquentes basées sur les retours des Junior-Entreprises partenaires. Vous bénéficiez en continu de nouvelles fonctionnalités, sans frais supplémentaires.",
  },
  {
    question: "Y a-t-il un historique des actions ?",
    answer:
      "Oui. Toutes les interactions importantes (relances, changements de statut, ajouts de notes…) sont enregistrées. Vous savez qui a fait quoi, et quand.",
  },
];

export function Faqs() {
  return (
    <section className="mt-20 sm:mt-36" aria-labelledby="faq-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-14">
        <div className="col-span-full sm:col-span-5">
          <h2
            id="faq-title"
            className="inline-block scroll-my-24 bg-gradient-to-br from-gray-900 to-gray-800 bg-clip-text py-2 pr-2 text-2xl font-bold tracking-tighter text-transparent lg:text-3xl dark:from-gray-50 dark:to-gray-300"
          >
            <Balancer>Les questions fréquentes</Balancer>
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-400">
            <Balancer>
              Vous n&apos;êtes jamais seul : chez Andoxa, l&apos;accompagnement
              personnalisé est au cœur de notre mission.
            </Balancer>
          </p>
        </div>
        <div className="col-span-full mt-6 lg:col-span-7 lg:mt-0">
          <Accordion type="multiple" className="mx-auto">
            {faqs.map((item) => (
              <AccordionItem
                value={item.question}
                key={item.question}
                className="py-3 first:pb-3 first:pt-0"
              >
                <AccordionTrigger>
                  <Balancer>{item.question}</Balancer>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-400">
                  <Balancer>{item.answer}</Balancer>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
