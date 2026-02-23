import { Badge } from "@/components/ui/badge";
import { UnifiedHeader } from "@/components/v3/homepage/UnifiedHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { RiSparklingLine, RiBugLine, RiAddLine } from "@remixicon/react";
import { cn } from "../../../../src/lib/utils";
import Balancer from "react-wrap-balancer";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  image?: string;
  features: {
    type: "new" | "improved" | "fix";
    title: string;
    description: string;
  }[];
}

const changelogEntries: ChangelogEntry[] = [
  {
    version: "v2.0.0",
    date: "Bientôt disponible",
    title: "Andoxa 2.0 : Acquisition client et gestion de leads optimisée",
    description:
      "Une refonte majeure axée sur la création de valeur pour votre business. Acquisition client via LinkedIn, campagnes multi-canaux optimisées, enrichissement automatique, et interface de lead simplifiée pour ne jamais perdre une opportunité.",
    features: [
      {
        type: "new",
        title: "Acquisition client via LinkedIn",
        description:
          "Intégration complète avec LinkedIn pour identifier et contacter vos prospects directement depuis Andoxa. Automatisation de la prospection avec templates de messages personnalisables et suivi des interactions.",
      },
      {
        type: "new",
        title: "Campagnes optimisées multi-canaux",
        description:
          "Lancez des campagnes coordonnées par email et LinkedIn depuis une seule interface. Optimisation automatique des envois, A/B testing intégré, et analytics unifiés pour maximiser votre taux de conversion.",
      },
      {
        type: "new",
        title: "Enrichissement automatique de prospects",
        description:
          "Enrichissement intelligent de vos leads avec données vérifiées : emails, téléphones, informations entreprise. Gain de temps considérable et données toujours à jour pour vos campagnes.",
      },
      {
        type: "new",
        title: "Interface de lead simplifiée et intuitive",
        description:
          "Une interface repensée pour que l'information ne soit jamais perdue. Templates de messages contextuels, statistiques en temps réel, scoring intelligent, et questions pertinentes suggérées pour chaque prospect. Tout ce dont vous avez besoin au bon moment.",
      },
      {
        type: "new",
        title: "Rappels et relances via WhatsApp",
        description:
          "Réduisez les no-shows avec des rappels automatiques via WhatsApp. Relances intelligentes pour vos rendez-vous et campagnes, avec templates personnalisables et suivi des ouvertures et réponses.",
      },
    ],
  },
  {
    version: "v1.8.3",
    date: "31 décembre 2025",
    title: "Refonte design : Glassmorphism, Neumorphism et expérience utilisateur améliorée",
    description:
      "Refonte complète du design system avec l'introduction du glassmorphism et du neumorphism pour une interface moderne et élégante. Améliorations majeures de l'expérience utilisateur sur toutes les pages.",
    features: [
      {
        type: "improved",
        title: "Nouveau design system Glassmorphism et Neumorphism",
        description:
          "Introduction d'un design system cohérent avec effets de verre (glassmorphism) et neumorphism sur tous les composants. Cartes, boutons, inputs et sidebar bénéficient d'un style moderne et élégant avec backdrop-blur et transparence.",
      },
      {
        type: "improved",
        title: "Refonte complète des pages onboarding et select-organization",
        description:
          "Application du nouveau design system aux pages d'onboarding et de sélection d'organisation. Animations fluides, cartes glassmorphism, et expérience utilisateur optimisée pour guider les nouveaux utilisateurs.",
      },
      {
        type: "improved",
        title: "Header et Sidebar redesignés",
        description:
          "Header et sidebar de l'application repensés avec glassmorphism. Header moins sombre en dark mode avec ombre adoucie. Sidebar avec effets de transparence et blur pour une meilleure intégration visuelle.",
      },
      {
        type: "improved",
        title: "Inputs et formulaires modernisés",
        description:
          "Tous les inputs stylisés utilisent maintenant un border-radius réduit (12px) pour un look plus moderne. Labels correctement alignés et placeholders plus visibles. Application cohérente sur tous les formulaires (onboarding, contact, auth).",
      },
      {
        type: "improved",
        title: "Page Changelog redesignée",
        description:
          "Page changelog avec le même background animé que la homepage (18 formes floutées). Cartes avec backdrop-blur pour une meilleure lisibilité. Positionnement optimisé pour éviter les chevauchements avec le header.",
      },
      {
        type: "new",
        title: "Formulaire de contact fonctionnel",
        description:
          "Le formulaire de contact envoie maintenant directement les messages via SendGrid sans ouvrir le client email. Sanitization complète des données avec DOMPurify pour la sécurité. Séparation prénom/nom pour une meilleure organisation.",
      },
      {
        type: "improved",
        title: "Navigation header optimisée",
        description:
          "Réorganisation des liens de navigation dans le header. Lien Contact corrigé pour pointer vers la section contact de la homepage. Ordre optimisé : Fonctionnalités → Tarifs → Contact → Changelog.",
      },
      {
        type: "improved",
        title: "Page Profil consolidée",
        description:
          "Création d'une page /profil unique avec onglets pour gérer profil, abonnement, équipe, notifications et sécurité. Remplacement de l'ancienne page /parametres pour une meilleure organisation des paramètres utilisateur.",
      },
    ],
  },
  {
    version: "v1.7.0",
    date: "17 décembre 2025",
    title: "Refactoring campagnes, multi-organisations et améliorations UX",
    description:
      "Refonte complète du flow de création de campagnes avec validation Zod et persistance Zustand, système multi-organisations avec TeamSwitcher, gestion des limites par plan, et améliorations majeures de l'interface utilisateur.",
    features: [
      {
        type: "new",
        title: "Flow de campagnes refactorisé",
        description:
          "Les campagnes ne sont créées dans Supabase qu'au lancement ou à la sauvegarde manuelle. Chaque étape est validée avec Zod et persistée avec Zustand pour une expérience fluide et sécurisée.",
      },
      {
        type: "new",
        title: "Système multi-organisations",
        description:
          "Les utilisateurs peuvent créer et gérer plusieurs organisations selon leur plan (1 pour Essential, 3 pour Pro, 5 pour Business). Le TeamSwitcher permet de basculer facilement entre organisations depuis la sidebar.",
      },
      {
        type: "new",
        title: "Page Vue d'ensemble",
        description:
          "Nouvelle page par défaut après connexion affichant les statistiques agrégées de toutes les organisations d'un propriétaire. Accessible même pour le plan Essential (stats d'une seule organisation).",
      },
      {
        type: "improved",
        title: "Gestion des limites par plan",
        description:
          "Limites centralisées et facilement modifiables pour les campagnes (3/10/50), prospects (1000/5000/illimité), organisations (1/3/5), et imports CSV/XLSX avec vérifications avant import.",
      },
      {
        type: "improved",
        title: "Design des pages select-organization",
        description:
          "Refonte complète avec animations fluides, squelettes de chargement, et réutilisation des cartes de plan depuis la page tarifs. Design épuré et professionnel avec possibilité de conserver le même plan lors de la création d'une nouvelle organisation.",
      },
      {
        type: "improved",
        title: "Onglet Équipe refait",
        description:
          "Nouveau design en tableau avec colonnes Nom, Email, Rôle et Actions. Invitation inline, modification de rôle, et gestion des invitations en attente directement depuis le tableau.",
      },
      {
        type: "improved",
        title: "Flux d'invitation optimisé",
        description:
          "Les utilisateurs sans compte sont redirigés vers la création de compte avec email pré-rempli. Les utilisateurs connectés sont redirigés vers select-organization avec un toast informatif.",
      },
      {
        type: "new",
        title: "Workflow Stripe amélioré",
        description:
          "Amélioration du processus de checkout Stripe pour la création d'organisations avec support des logos, URLs d'annulation personnalisées, et possibilité de conserver le même plan lors de la création d'une nouvelle organisation. Le webhook Stripe gère maintenant correctement la création d'organisations et la mise à jour des abonnements.",
      },
    ],
  },
  {
    version: "v1.6.1",
    date: "03 décembre 2025",
    title: "Sécurité renforcée, interface améliorée et centre d'aide refait",
    description:
      "Mise à jour de sécurité critique (CVE-2025-55182), refonte complète du centre d'aide avec Q/R approfondies, amélioration des filtres prospects avec synchronisation des compteurs, et corrections diverses d'interface.",
    features: [
      {
        type: "fix",
        title: "Mise à jour de sécurité critique",
        description:
          "Mise à jour de React vers 19.2.1 et Next.js vers 16.0.7 pour corriger la vulnérabilité CVE-2025-55182 (Remote Code Execution dans React Server Components).",
      },
      {
        type: "new",
        title: "Rate Limiting et protection DDoS",
        description:
          "Implémentation d'un système de rate limiting robuste avec Redis (Upstash) pour protéger les API contre les abus et attaques par force brute. Limites configurées par catégorie : public (20 req/min), authentifié (100 req/min), intensif (10 req/min), admin (30 req/min).",
      },
      {
        type: "improved",
        title: "Centre d'aide refait",
        description:
          "Refonte complète du centre d'aide avec un design professionnel aligné avec Andoxa. Ajout de 12 Q/R approfondies avec conseils pratiques et stratégies d'optimisation. Recherche améliorée avec tags et catégories enrichies (Analytics, Sécurité).",
      },
      {
        type: "improved",
        title: "Filtres prospects synchronisés",
        description:
          "Les compteurs de statut prennent en compte tous les filtres actifs. Les filtres peuvent être combinés pour des recherches précises.",
      },
      {
        type: "improved",
        title: "Interface filtres réorganisée",
        description:
          "Réorganisation de l'interface des filtres avec retrait de la bordure de section pour un design plus épuré.",
      },
      {
        type: "fix",
        title: "Formatage LinkedIn corrigé",
        description:
          "Correction du formatage des URLs LinkedIn pour éviter la duplication '/in/in'.",
      },
      {
        type: "improved",
        title: "Dashboard KPIs optimisé",
        description:
          "Réduction du nombre de KPIs par défaut (12 → 8) et amélioration du placement automatique.",
      },
      {
        type: "improved",
        title: "Pages légales uniformisées",
        description:
          "Uniformisation du design des pages légales et retrait des en-têtes redondants.",
      },
    ],
  },
  {
    version: "v1.6.0",
    date: "01 décembre 2025",
    title: "Améliorations feedback pilote : tâches, prospects et imports",
    description:
      "Mise en place des retours : rappels de tâches, corbeille des prospects, import Excel, protection onboarding et améliorations UX diverses. Merci beaucoup à nos pilotes pour leur retours et suggestions !",
    features: [
      {
        type: "new",
        title: "Rappels de tâches 48h avant échéance",
        description:
          "Les utilisateurs reçoivent automatiquement une notification 48 heures avant l'échéance de leurs tâches, avec les heures et minutes précises. Chaque rappel génère une notification séparée pour un suivi optimal.",
      },
      {
        type: "new",
        title: "Corbeille des prospects",
        description:
          "Les prospects supprimés sont désormais conservés dans une corbeille pendant 30 jours, permettant leur restauration. Un nouvel onglet 'Corbeille' est disponible dans la page Prospects.",
      },
      {
        type: "new",
        title: "Import de fichiers Excel",
        description:
          "L'import de fichiers supporte désormais les formats Excel (XLSX, XLSB, XLSM) en plus du CSV. Le bouton a été renommé 'Importer un fichier' pour refléter cette évolution.",
      },
      {
        type: "improved",
        title: "Format des notifications optimisé",
        description:
          "Les notifications utilisent désormais un format deux lignes plus concis : une ligne pour la catégorie/description, une autre pour les informations importantes (date, utilisateur assigné, etc.).",
      },
      {
        type: "improved",
        title: "Page 'Mes tâches' améliorée",
        description:
          "Affichage correct des assignés différencié du créateur, support des heures et minutes pour les échéances, et masquage des assignés lorsqu'aucun n'est sélectionné.",
      },
      {
        type: "improved",
        title: "Page prospect enrichie",
        description:
          "Le nom du prospect s'affiche désormais sous sa photo de profil, et la zone de notes a été agrandie et rendue redimensionnable pour une meilleure prise de notes.",
      },
      {
        type: "improved",
        title: "Pipeline commercial",
        description:
          "Vous pouvez maintenant click droit sur une carte dans le pipeline pour afficher les actions possibles",
      },
      {
        type: "improved",
        title: "Bouton retour repositionné",
        description:
          "Le bouton 'Retour' a été déplacé en haut à gauche, à côté du bouton de la sidebar, pour une meilleure cohérence visuelle et une accessibilité améliorée.",
      },
      {
        type: "improved",
        title: "Pages d'erreur redesignées",
        description:
          "Les pages 403, 404 et d'erreur globale ont été repensées avec un design plus minimaliste et moins bloquant, permettant une meilleure expérience utilisateur en cas d'erreur.",
      },
      {
        type: "fix",
        title: "Gestion d'erreurs BDD améliorée",
        description:
          "La page de détail d'une BDD adopte désormais une logique plus robuste, affiche désormais des messages d'erreur plus précis, distinguant les erreurs 'non trouvé' des erreurs d'accès refusé, avec vérification renforcée des politiques RLS.",
      },
    ],
  },
  {
    version: "v1.5.3",
    date: "15 novembre 2025",
    title: "Phase pilote, sécurité renforcée et boucle de feedback",
    description:
      "Mise en place de la phase pilote, amélioration de la sécurité applicative avec un logging centralisé et ajout d’un bouton Feedback pour faciliter les retours utilisateurs.",
    features: [
      {
        type: "new",
        title: "Bouton Feedback dans la sidebar",
        description:
          "Un nouveau lien “Feedback” est disponible dans la barre latérale pour vous permettre de partager facilement vos retours et idées d’amélioration pendant la phase pilote.",
      },
      {
        type: "improved",
        title: "Logging centralisé et sécurité renforcée",
        description:
          "Tous les console.log ont été remplacés par un logger centralisé qui structure les logs et masque automatiquement les informations sensibles, pour une meilleure observabilité en environnement proche production.",
      },
      {
        type: "improved",
        title: "Gestion des abonnements Stripe",
        description:
          "Le webhook Stripe met désormais correctement à jour le plan du tenant après paiement. Les pages Paramètres et Facturation affichent les informations d'abonnement associées au compte utilisateur.",
      },
      {
        type: "improved",
        title: "Phase pilote contrôlée",
        description:
          "Les boutons d’inscription Stripe sur la page Tarifs sont temporairement désactivés pour limiter l’accès aux comptes pilotes, avec validation stricte des emails professionnels et gestion dédiée des comptes démo.",
      },
      {
        type: "fix",
        title: "Affichage des tarifs corrigé",
        description:
          "Sur la page Tarifs, le prix annuel s’affiche maintenant sur une ligne séparée sous le prix mensuel pour une meilleure lisibilité.",
      },
      {
        type: "fix",
        title: "Redirections des comptes démo expirés",
        description:
          "Les comptes démo expirés sont redirigés proprement vers la page Tarifs avec un message explicatif plutôt que vers une page d’erreur générique.",
      },
    ],
  },
  {
    version: "v1.5.2",
    date: "10 novembre 2025",
    title: "Alignement des tableaux et maintenance calendrier",
    description:
      "Mise à jour de l’interface des listings, amélioration de l’éditeur de campagne et mise en maintenance de la synchronisation calendrier.",
    features: [
      {
        type: "improved",
        title: "Contrôles de tableau unifiés",
        description:
          "Les pages Prospects, BDD et Campagnes partagent désormais la même pagination, des en-têtes cohérents et une expérience de scroll homogène.",
      },
      {
        type: "improved",
        title: "Sélection d’audience plus lisible",
        description:
          "La liste des bases disponibles dans l’étape Audience reste visible grâce à un conteneur à hauteur fixe avec défilement.",
      },
      {
        type: "fix",
        title: "Variables de campagne fiabilisées",
        description:
          "Les colonnes non textuelles sont correctement interprétées lors du chargement des variables dynamiques pour éviter les erreurs.",
      },
      {
        type: "fix",
        title: "Synchronisation calendrier désactivée",
        description:
          "La synchronisation Google/Outlook est temporairement coupée dans le compte et le calendrier en attendant la prochaine itération.",
      },
    ],
  },
  {
    version: "v1.5.1",
    date: "16 octobre 2025",
    title: "Améliorations de l'interface et corrections",
    description:
      "Amélioration de l'affichage des tableaux de bord, simplification des workflows et corrections de bugs pour une expérience plus fluide.",
    features: [
      {
        type: "improved",
        title: "Tableaux de bord optimisés",
        description:
          "Les KPIs sont maintenant plus lisibles avec des graphiques variés et une meilleure organisation. Les valeurs sont clairement affichées pour une compréhension immédiate.",
      },
      {
        type: "improved",
        title: "Filtrage amélioré",
        description:
          "Filtrez facilement vos prospects et bases de données par responsable directement depuis les tableaux.",
      },
      {
        type: "improved",
        title: "Variables de campagne simplifiées",
        description:
          "L'insertion de variables dans vos campagnes email est maintenant plus intuitive : cliquez simplement sur une variable pour l'ajouter.",
      },
      {
        type: "improved",
        title: "Pipeline commercial optimisé",
        description:
          "Visualisez mieux votre pipeline avec une distribution plus réaliste des prospects à travers les différentes étapes.",
      },
      {
        type: "fix",
        title: "Corrections d'affichage",
        description:
          "Résolution de plusieurs problèmes d'affichage dans les tableaux et les pages de détails pour une meilleure cohérence visuelle.",
      },
    ],
  },
  {
    version: "v1.5.0",
    date: "15 octobre 2025",
    title: "Intégrations complètes et préparation aux démos",
    description:
      "Intégration complète de Stripe pour les abonnements, synchronisation Google Calendar, comptes démo pour les présentations et améliorations majeures de l'interface.",
    features: [
      {
        type: "new",
        title: "Abonnements et paiements",
        description:
          "Vous pouvez maintenant vous abonner directement depuis la plateforme. Choisissez votre plan Essential, Pro ou Business avec facturation mensuelle ou annuelle.",
      },
      {
        type: "new",
        title: "Synchronisation Google Calendar",
        description:
          "Vos rendez-vous créés dans Andoxa apparaissent automatiquement dans votre calendrier Google. Plus besoin de les ajouter manuellement !",
      },
      {
        type: "improved",
        title: "Campagnes email personnalisées",
        description:
          "Envoyez vos campagnes depuis votre propre adresse email et suivez les performances en temps réel : ouvertures, clics et réponses.",
      },
      {
        type: "improved",
        title: "Interface plus intuitive",
        description:
          "Les tableaux de données sont maintenant plus lisibles et agréables à utiliser, avec une meilleure organisation des informations.",
      },
      {
        type: "improved",
        title: "Page de paramètres",
        description:
          "Consultez facilement vos informations de compte, votre abonnement et vos crédits disponibles depuis une page dédiée.",
      },
    ],
  },
  {
    version: "v1.4.0",
    date: "30 septembre 2025",
    title: "Scoring intelligent et enrichissement de prospects",
    description:
      "Découvrez le scoring IA pour prioriser vos prospects les plus prometteurs et l'enrichissement automatique pour obtenir des informations vérifiées.",
    features: [
      {
        type: "new",
        title: "Scoring intelligent IA",
        description:
          "L'IA analyse vos prospects et leur attribue un score basé sur leur probabilité de conversion. Concentrez vos efforts là où ils comptent le plus.",
      },
      {
        type: "new",
        title: "Enrichissement de prospects",
        description:
          "Enrichissez vos prospects à la demande : emails vérifiés, numéro de téléphone et autres infos clés.",
      },
      {
        type: "new",
        title: "Centre d'aide complet",
        description:
          "Documentation détaillée, guides de démarrage et FAQ pour maîtriser toutes les fonctionnalités d'Andoxa.",
      },
      {
        type: "improved",
        title: "Gestion des crédits",
        description:
          "Visualisez votre solde de crédits d'enrichissement et gérez vos consommations depuis les paramètres.",
      },
      {
        type: "fix",
        title: "Menu mobile",
        description:
          "Résolution des problèmes d'affichage du menu burger sur mobile et amélioration de la navigation.",
      },
    ],
  },
  {
    version: "v1.3.0",
    date: "15 août 2025",
    title: "Synchronisation calendrier avancée",
    description:
      "Synchronisation avec Google Calendar et améliorations de l'interface calendrier.",
    features: [
      {
        type: "new",
        title: "Synchronisation Google Calendar",
        description:
          "Vos rendez-vous créés dans Andoxa apparaissent automatiquement dans votre calendrier Google.",
      },
      {
        type: "new",
        title: "Webhooks en temps réel",
        description:
          "Recevez instantanément les mises à jour de vos événements grâce aux webhooks Google Calendar.",
      },
      {
        type: "improved",
        title: "Interface calendrier",
        description:
          "Nouveau design du calendrier avec vue mensuelle améliorée et création d'événements au double-clique.",
      },
      {
        type: "fix",
        title: "Gestion des fuseaux horaires",
        description:
          "Meilleure gestion des fuseaux horaires pour les équipes distribuées.",
      },
    ],
  },
  {
    version: "v1.2.0",
    date: "10 juillet 2025",
    title: "Campagnes email avancées et KPIs",
    description:
      "Nouvelles fonctionnalités pour créer des campagnes email sophistiquées et suivre vos performances en temps réel.",
    features: [
      {
        type: "new",
        title: "Éditeur de campagne en 4 étapes",
        description:
          "Workflow intuitif : définissez votre audience, créez votre contenu, configurez les paramètres et prévisualisez avant l'envoi.",
      },
      {
        type: "new",
        title: "Segmentation d'audience",
        description:
          "Créez des segments personnalisés basés sur les catégories, statuts et comportements de vos prospects.",
      },
      {
        type: "new",
        title: "KPI de campagne",
        description:
          "Tableaux de bord détaillés avec taux d'ouverture, de clic, de réponse et de conversion en temps réel.",
      },
      {
        type: "fix",
        title: "Délivrabilité",
        description:
          "Amélioration des taux de délivrabilité avec validation DKIM et SPF.",
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "20 juin 2025",
    title: "Gestion des prospects et pipeline",
    description:
      "Système complet de gestion des prospects avec pipeline visuel et import CSV.",
    features: [
      {
        type: "new",
        title: "Pipeline de prospection",
        description:
          "Visualisez et gérez vos prospects à travers différentes étapes du cycle de vente.",
      },
      {
        type: "new",
        title: "Import CSV massif",
        description:
          "Importez vos prospects en masse depuis un fichier CSV avec mapping automatique des colonnes.",
      },
      {
        type: "new",
        title: "Base de données unifiée",
        description:
          "Centralisez toutes vos données prospects avec dédoublonnage automatique.",
      },
      {
        type: "improved",
        title: "Recherche et filtres",
        description:
          "Recherche puissante avec filtres avancés par statut, catégorie, date et plus.",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "15 mai 2025",
    title: "Lancement d'Andoxa",
    description:
      "La première version d'Andoxa est enfin disponible ! Une plateforme CRM moderne conçue spécialement pour les Junior-Entreprises.",
    features: [
      {
        type: "new",
        title: "Architecture App Router",
        description:
          "Application moderne construite avec Next.js 15, React 19 et TypeScript pour des performances optimales.",
      },
      {
        type: "new",
        title: "Authentification Supabase",
        description:
          "Système d'authentification sécurisé avec gestion des utilisateurs et des permissions.",
      },
      {
        type: "new",
        title: "Interface adaptative",
        description:
          "Design moderne et responsive qui s'adapte à tous les écrans avec thème clair/sombre.",
      },
      {
        type: "new",
        title: "Multi-tenancy",
        description:
          "Support des espaces de travail multiples pour gérer plusieurs projets ou clients.",
      },
      {
        type: "new",
        title: "Dashboard intuitif",
        description:
          "Tableau de bord centralisé avec accès rapide à toutes les fonctionnalités principales.",
      },
    ],
  },
];

const getFeatureIcon = (type: "new" | "improved" | "fix") => {
  switch (type) {
    case "new":
      return <RiAddLine className="h-4 w-4 text-green-500" />;
    case "improved":
      return <RiSparklingLine className="h-4 w-4 text-blue-500" />;
    case "fix":
      return <RiBugLine className="h-4 w-4 text-orange-500" />;
  }
};

const getFeatureColor = (type: "new" | "improved" | "fix") => {
  switch (type) {
    case "new":
      return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
    case "improved":
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
    case "fix":
      return "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400";
  }
};

const getFeatureLabel = (type: "new" | "improved" | "fix") => {
  switch (type) {
    case "new":
      return "Nouveau";
    case "improved":
      return "Amélioré";
    case "fix":
      return "Correction";
  }
};

export default function Changelog() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <UnifiedHeader showMobileMenu={true} enableScrollEffect={false} />

      {/* Conteneur principal avec formes floutées en arrière-plan */}
      <div className="relative w-full overflow-hidden">
        {/* 18 formes floutées animées - définies dans globals.css */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="color" />
          ))}
        </div>

        {/* Contenu - au-dessus des formes floutées */}
        <div className="relative z-10">
          <div className="mx-auto max-w-5xl px-4 pt-40 pb-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
            <Balancer>Les dernières nouveautés</Balancer>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            <Balancer>
              Découvrez les dernières fonctionnalités, améliorations et
              corrections apportées à Andoxa pour améliorer votre expérience.
            </Balancer>
          </p>
        </section>

        {/* Changelog Entries */}
        <section className="mt-20">
          <div className="relative space-y-16">
            {changelogEntries.map((entry, index) => {
              const isVersion2 = entry.version === "v2.0.0";
              const isBeforeVersion2 =
                changelogEntries[index + 1]?.version === "v2.0.0";
              // Make line dotted strictly above v1.7.0 (all entries before v1.7.0 in the array, which are newer versions)
              const v1_7_0Index = changelogEntries.findIndex(
                (e) => e.version === "v1.7.0"
              );
              const shouldBeDotted = v1_7_0Index !== -1 && index < v1_7_0Index;

              return (
                <article
                  key={entry.version}
                  className="relative pl-12 md:pl-24"
                >
                  {/* Special spacing before v2.0.0 */}
                  {isBeforeVersion2 && (
                    <div className="absolute left-0 right-0 top-0 h-16 md:h-20" />
                  )}

                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 md:left-8 top-2 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                      isVersion2
                        ? "bg-linear-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 shadow-lg shadow-indigo-500/50 dark:shadow-indigo-500/30"
                        : "bg-blue-600 dark:bg-blue-400"
                    }`}
                  />

                  {/* Connector line */}
                  {index < changelogEntries.length - 1 && (
                    <div
                      className={`absolute left-2 md:left-10 top-6 ${
                        shouldBeDotted
                          ? "w-[2px] border-l-2 border-dashed border-slate-300 dark:border-slate-600 bg-transparent"
                          : "w-px bg-slate-200 dark:bg-slate-700"
                      } ${
                        isBeforeVersion2
                          ? "h-[calc(100%+5rem)]"
                          : "h-[calc(100%+4rem)]"
                      }`}
                    />
                  )}

                  {/* Version Badge */}
                  <div className="flex items-center gap-4 mb-6">
                    <Badge
                      variant="secondary"
                      className={`text-sm font-medium ${
                        isVersion2
                          ? "bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/50 dark:via-slate-800 dark:to-purple-950/50 shadow-xl shadow-indigo-500/20 dark:shadow-indigo-500/5"
                          : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      }`}
                    >
                      {entry.version}
                    </Badge>

                    <time
                      className={`text-sm ${
                        isVersion2
                          ? "text-indigo-700 dark:text-indigo-400 font-medium"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {entry.date}
                    </time>
                  </div>

                  {/* Entry Content */}
                  <div
                    className={`rounded-2xl p-8 md:p-10 border-2 relative backdrop-blur-xl ${
                      isVersion2
                        ? "bg-gradient-to-br from-indigo-50/80 via-white/80 to-purple-50/80 dark:from-indigo-950/50 dark:via-slate-800/80 dark:to-purple-950/50 shadow-xl shadow-indigo-500/20 dark:shadow-indigo-500/5 border-indigo-200/50 dark:border-indigo-800/30"
                        : "backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl"
                    }`}
                  >
                    {isVersion2 && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mask-[linear-gradient(#fff_0_0),linear-gradient(#fff_0_0)] [mask-composite:xor] [-webkit-mask-composite:xor] [mask-clip:padding-box,border-box]" />
                    )}
                    {!isVersion2 && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-slate-200 dark:border-slate-700 pointer-events-none" />
                    )}
                    <h2
                      className={`text-2xl md:text-3xl font-bold mb-5 relative z-10 ${
                        isVersion2
                          ? "text-indigo-900 dark:text-white"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {entry.title}
                    </h2>
                    <p
                      className={`text-base md:text-lg leading-7 mb-8 md:mb-10 ${
                        isVersion2
                          ? "text-slate-800 dark:text-slate-200 font-medium"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {entry.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-8">
                      {entry.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex gap-5">
                          <div className="shrink-0 pt-0.5">
                            {getFeatureIcon(feature.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                                  getFeatureColor(feature.type)
                                )}
                              >
                                {getFeatureLabel(feature.type)}
                              </span>
                              <h3
                                className={`text-base md:text-lg font-semibold ${
                                  isVersion2
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {feature.title}
                              </h3>
                            </div>
                            <p
                              className={`text-sm md:text-[15px] leading-6 ${
                                isVersion2
                                  ? "text-slate-700 dark:text-slate-300"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* CTA Section - Newsletter (commentée pour plus tard) */}
        {/* <section className="mt-24 text-center">
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Restez informé des nouveautés
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Abonnez-vous à notre newsletter pour recevoir les dernières mises
              à jour
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base font-semibold"
              >
                <Link href="/auth/sign-up" className="flex items-center gap-2">
                  S&apos;abonner
                  <RiArrowRightLine className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base font-semibold border-white text-blue-600 hover:bg-white dark:text-white dark:hover:bg-white dark:hover:text-blue-600"
              >
                <Link href="#contact" className="flex items-center gap-2">
                  Nous contacter
                </Link>
              </Button>
            </div>
          </div>
        </section> */}
          </div>
        </div>
      </div>

      <div className="pb-12"></div>
      <AndoxaFooter />
    </main>
  );
}
