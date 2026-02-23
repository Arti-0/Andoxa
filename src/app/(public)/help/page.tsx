"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  HelpCircle,
  Mail,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Settings,
  TrendingUp,
  Database,
  Shield,
  Zap,
  Target,
  BarChart3,
  Users,
  FileText,
} from "lucide-react";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import Balancer from "react-wrap-balancer";
import Link from "next/link";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category:
    | "general"
    | "campaigns"
    | "calendar"
    | "prospects"
    | "billing"
    | "scoring"
    | "enrichment"
    | "analytics"
    | "security";
  tags?: string[];
}

const faqItems: FAQItem[] = [
  {
    id: "1",
    question: "Comment optimiser le taux d'ouverture de mes campagnes email ?",
    answer:
      "Le taux d'ouverture dépend de plusieurs facteurs clés. D'abord, la qualité de votre base de données : utilisez le scoring pour cibler les prospects les plus qualifiés (grade A et B). Ensuite, personnalisez vos emails avec les variables dynamiques (nom, entreprise, secteur) pour créer un sentiment de connexion. Le timing est également crucial : évitez les envois le lundi matin et le vendredi après-midi. Enfin, testez différents sujets d'email en segmentant votre audience. Andoxa vous permet de créer plusieurs variantes et d'analyser les performances en temps réel pour identifier ce qui fonctionne le mieux.",
    category: "campaigns",
    tags: ["optimisation", "taux d'ouverture", "personnalisation"],
  },
  {
    id: "2",
    question: "Quelle est la différence entre le scoring automatique et manuel ?",
    answer:
      "Le scoring automatique analyse chaque prospect lors de l'import ou de l'enrichissement selon 4 critères : l'entreprise (taille, secteur d'activité), le contact (poste, rôle décisionnel), la présence digitale (LinkedIn, email valide, site web) et l'alignement avec les besoins d'une Junior-Entreprise. Le système attribue une note de 0 à 100 et un grade (A, B, C, D). Le scoring manuel vous permet de relancer l'analyse pour des prospects spécifiques, utile après un enrichissement ou une mise à jour des données. Les deux méthodes utilisent le même algorithme IA, mais le manuel vous donne plus de contrôle sur le moment de l'analyse.",
    category: "scoring",
    tags: ["scoring", "IA", "qualification"],
  },
  {
    id: "3",
    question: "Comment gérer efficacement un grand volume de prospects ?",
    answer:
      "Pour gérer efficacement un grand volume, structurez vos données avec des BDD (Bases de données) par source, campagne ou projet. Utilisez les filtres combinés (statut, responsable, recherche) pour segmenter rapidement. Le scoring vous aide à prioriser : concentrez-vous d'abord sur les prospects A et B. L'enrichissement automatique complète les données manquantes (email, téléphone, LinkedIn) pour maximiser vos chances de contact. Enfin, utilisez les campagnes email pour automatiser la communication initiale et qualifier les prospects intéressés avant un contact direct.",
    category: "prospects",
    tags: ["gestion", "volume", "organisation"],
  },
  {
    id: "4",
    question: "Comment interpréter les KPIs du tableau de bord ?",
    answer:
      "Les KPIs d'Andoxa mesurent l'efficacité de votre pipeline commercial. 'Nouveaux prospects' suit votre acquisition. 'Taux de conversion prospects → RDV' indique la qualité de votre qualification initiale. 'Taux de conversion RDV → Proposition' mesure votre capacité à identifier les besoins. 'Taux de conversion Proposition → Signature' reflète votre efficacité commerciale. 'Chiffre d'affaires' agrège la valeur totale des contrats signés. Analysez ces métriques ensemble : un faible taux de conversion prospects → RDV suggère d'améliorer le scoring ou la personnalisation des campagnes. Un taux élevé RDV → Proposition mais faible Proposition → Signature peut indiquer un problème de pricing ou d'alignement avec les besoins.",
    category: "analytics",
    tags: ["KPIs", "analytics", "performance"],
  },
  {
    id: "5",
    question: "Quand dois-je utiliser l'enrichissement de données ?",
    answer:
      "L'enrichissement est particulièrement utile dans trois cas. D'abord, lors de l'import de prospects incomplets : si votre CSV manque d'emails ou de téléphones, l'enrichissement peut compléter jusqu'à 40% des données manquantes. Ensuite, avant une campagne importante : des données complètes améliorent la personnalisation et le taux de réponse. Enfin, pour les prospects hautement qualifiés (grade A) : investir des crédits d'enrichissement sur ces prospects maximise votre ROI. Notez que chaque enrichissement qui trouve de nouvelles données consomme un crédit, mais un enrichissement qui ne trouve rien ne consomme pas. Ciblez donc les prospects avec au moins un identifiant (nom + entreprise, ou LinkedIn) pour maximiser vos chances de succès.",
    category: "enrichment",
    tags: ["enrichissement", "données", "crédits"],
  },
  {
    id: "6",
    question: "Comment sécuriser mes données et respecter le RGPD ?",
    answer:
      "Andoxa est conçu pour la conformité RGPD dès la conception. Vos données sont isolées par tenant (multi-tenant avec RLS), chiffrées en transit (TLS 1.3) et au repos (AES-256). Les politiques de Row Level Security (RLS) garantissent que chaque utilisateur ne voit que les données de son organisation. Pour le RGPD, vous pouvez exporter toutes les données d'un prospect via l'API ou l'interface, et supprimer définitivement les données sur demande. Les logs d'accès sont conservés pour la traçabilité. En cas de demande d'un prospect, utilisez la fonctionnalité d'export pour fournir toutes les données le concernant, ou supprimez-le si demandé. Consultez notre livre blanc sécurité pour plus de détails.",
    category: "security",
    tags: ["RGPD", "sécurité", "conformité"],
  },
  {
    id: "7",
    question: "Comment organiser mon équipe dans Andoxa ?",
    answer:
      "Andoxa utilise un modèle basé sur les tenants : chaque Junior-Entreprise est un tenant isolé. Les utilisateurs sont ajoutés à un tenant via les paramètres utilisateurs. Chaque prospect peut être assigné à un responsable (propriétaire) pour suivre qui gère quoi. Les filtres par responsable permettent de voir rapidement les prospects de chaque membre de l'équipe. Pour les campagnes, tous les membres du tenant peuvent voir et gérer les campagnes, ce qui facilite la collaboration. Les KPIs du tableau de bord sont agrégés au niveau du tenant, donnant une vue d'ensemble de la performance de l'équipe.",
    category: "general",
    tags: ["équipe", "collaboration", "organisation"],
  },
  {
    id: "8",
    question: "Quelle stratégie d'envoi pour maximiser les réponses ?",
    answer:
      "La stratégie d'envoi optimale combine timing, segmentation et personnalisation. Envoyez vos emails le mardi, mercredi ou jeudi entre 9h et 11h ou 14h et 16h pour maximiser les ouvertures. Évitez les lundis matin (inbox saturée) et vendredis après-midi (week-end imminent). Segmentez votre audience par score : créez des campagnes différentes pour les prospects A/B (plus qualifiés, messages plus directs) et C/D (nurturing, éducation). Personnalisez chaque email avec les variables dynamiques : utilisez le nom, l'entreprise, le secteur pour créer un sentiment de connexion. Enfin, espacez vos envois : évitez d'envoyer plusieurs campagnes à la même personne dans la même semaine pour ne pas être marqué comme spam.",
    category: "campaigns",
    tags: ["stratégie", "timing", "segmentation"],
  },
  {
    id: "9",
    question: "Comment gérer les prospects qui ne répondent pas ?",
    answer:
      "Les prospects qui ne répondent pas nécessitent une stratégie de relance structurée. D'abord, vérifiez la qualité des données : utilisez l'enrichissement pour compléter les emails manquants ou invalides. Ensuite, créez une séquence de relance : première campagne initiale, puis relance après 3-5 jours avec un angle différent (ex: cas d'usage, témoignage client). Après 2-3 relances sans réponse, changez de statut : passez de 'Nouveau' à 'RDV pris' si vous avez eu un contact téléphonique, ou archivez temporairement. Utilisez les filtres pour identifier les prospects sans activité depuis X jours et créez des campagnes de réactivation ciblées. Le scoring peut aussi évoluer : un prospect qui ne répond pas peut voir son score baisser, indiquant qu'il faut le retirer de vos campagnes prioritaires.",
    category: "prospects",
    tags: ["relance", "non-réponse", "nurturing"],
  },
  {
    id: "10",
    question: "Comment calculer le ROI de mes campagnes Andoxa ?",
    answer:
      "Le ROI se calcule en comparant les coûts (abonnement + crédits d'enrichissement) aux revenus générés. Utilisez les KPIs du tableau de bord : 'Chiffre d'affaires' vous donne le total des contrats signés. 'Taux de conversion Proposition → Signature' indique combien de vos propositions se transforment en revenus. Pour une analyse plus fine, créez des campagnes avec des codes de suivi ou des variables personnalisées pour identifier quelles campagnes ont généré quels contrats. Le coût par prospect contacté = (coût mensuel / nombre de prospects dans vos BDD). Le coût par signature = (coût mensuel / nombre de signatures). Si votre coût par signature est inférieur à 10-15% de la valeur moyenne d'un contrat, votre ROI est excellent. Andoxa vous donne tous les KPIs nécessaires pour ce calcul dans le tableau de bord.",
    category: "analytics",
    tags: ["ROI", "performance", "métriques"],
  },
  {
    id: "11",
    question: "Qu'est-ce qui différencie un prospect grade A d'un grade D ?",
    answer:
      "Le grade A représente les prospects les plus qualifiés : entreprises de taille moyenne à grande (50-500 employés), contacts avec rôle décisionnel (CEO, Directeur, Responsable), présence digitale complète (LinkedIn, email valide, site web professionnel), et secteur aligné avec les services d'une Junior-Entreprise (tech, conseil, marketing). À l'inverse, un grade D a des données incomplètes, un contact sans rôle décisionnel clair, une présence digitale faible, ou un secteur peu aligné. Le scoring combine ces 4 critères avec des poids différents : l'alignement secteur et le rôle décisionnel ont plus de poids que la simple présence d'un email. Un prospect A a typiquement un score > 75, un B entre 50-75, un C entre 25-50, et un D < 25. Concentrez vos efforts sur les A et B pour maximiser votre taux de conversion.",
    category: "scoring",
    tags: ["qualification", "grades", "scoring"],
  },
  {
    id: "12",
    question: "Comment éviter les bounces et améliorer la délivrabilité ?",
    answer:
      "La délivrabilité dépend de la qualité de votre base et de vos pratiques d'envoi. D'abord, validez vos emails : utilisez l'enrichissement pour obtenir des emails valides, et évitez d'envoyer à des adresses génériques (contact@, info@) qui ont un taux de bounce élevé. Ensuite, respectez les bonnes pratiques : espacez vos envois (pas plus de 1000 emails/jour pour commencer), évitez les mots déclencheurs de spam dans vos sujets, et incluez toujours un lien de désinscription. Andoxa gère automatiquement les bounces et marque les emails invalides. Surveillez votre taux de bounce dans les statistiques de campagne : un taux > 5% indique un problème de qualité de base. Enfin, réchauffez progressivement votre domaine si vous envoyez depuis un nouveau domaine : commencez par de petits volumes et augmentez graduellement.",
    category: "campaigns",
    tags: ["délivrabilité", "bounces", "bonnes pratiques"],
  },
];

const categories = [
  { id: "general", name: "Général", icon: HelpCircle },
  { id: "campaigns", name: "Campagnes", icon: Mail },
  { id: "calendar", name: "Calendrier", icon: Calendar },
  { id: "prospects", name: "Prospects", icon: User },
  { id: "scoring", name: "Scoring", icon: TrendingUp },
  { id: "enrichment", name: "Enrichissement", icon: Database },
  { id: "analytics", name: "Analytics", icon: BarChart3 },
  { id: "security", name: "Sécurité", icon: Shield },
  { id: "billing", name: "Facturation", icon: Settings },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredFAQ = faqItems.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? <category.icon className="h-4 w-4" /> : null;
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <AndoxaHeader />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              <Balancer>Centre d&apos;aide</Balancer>
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              <Balancer>
                Trouvez des réponses détaillées à vos questions et apprenez à
                tirer le meilleur parti d&apos;Andoxa pour développer votre
                activité
              </Balancer>
            </p>
          </div>

          {/* Search */}
          <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Rechercher dans l'aide (ex: scoring, campagnes, ROI)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-slate-200 dark:border-slate-700 h-12 text-base"
                />
              </div>
              {searchQuery && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  {filteredFAQ.length} résultat
                  {filteredFAQ.length > 1 ? "s" : ""} trouvé
                  {filteredFAQ.length > 1 ? "s" : ""}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className={
                selectedCategory === "all"
                  ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  : ""
              }
            >
              Toutes les catégories
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategory === category.id ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={
                  selectedCategory === category.id
                    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                    : ""
                }
              >
                <category.icon className="h-4 w-4 mr-2" />
                {category.name}
              </Button>
            ))}
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Questions fréquentes
              </h2>
              {filteredFAQ.length > 0 && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {filteredFAQ.length} question
                  {filteredFAQ.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {filteredFAQ.length === 0 ? (
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6 pb-6">
                  <div className="text-center space-y-2">
                    <HelpCircle className="h-12 w-12 text-slate-400 mx-auto" />
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      Aucune question trouvée
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      Essayez de modifier votre recherche ou de sélectionner une
                      autre catégorie
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredFAQ.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:border-blue-500 transition-all border-slate-200 dark:border-slate-700 hover:shadow-md"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <CardHeader className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5 flex-shrink-0">
                            {getCategoryIcon(item.category)}
                          </div>
                          <CardTitle className="text-lg text-slate-900 dark:text-white leading-snug">
                            <Balancer>{item.question}</Balancer>
                          </CardTitle>
                        </div>
                        <div className="flex-shrink-0">
                          {expandedItems.has(item.id) ? (
                            <ChevronUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          )}
                        </div>
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 ml-8">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    {expandedItems.has(item.id) && (
                      <CardContent className="pt-0 pb-6">
                        <div className="ml-8 border-l-2 border-blue-200 dark:border-blue-800 pl-6">
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            <Balancer>{item.answer}</Balancer>
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Contact Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Besoin d&apos;aide supplémentaire ?
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Notre équipe est là pour répondre à toutes vos questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Link
                    href="/contact"
                    className="flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Envoyer un message
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Réserver une démo personnalisée
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Découvrez comment Andoxa peut s&apos;adapter à vos besoins
                  spécifiques
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                >
                  <Link
                    href="https://calendly.com/andoxa/30min"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Prendre rendez-vous
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Additional Resources */}
          <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                Ressources supplémentaires
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Explorez nos guides et documentation pour aller plus loin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/security"
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 transition-all"
                >
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      Livre blanc sécurité
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Architecture de sécurité et conformité RGPD
                    </div>
                  </div>
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800 transition-all"
                >
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      Tarifs et plans
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Découvrez nos offres et choisissez votre plan
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AndoxaFooter />
    </main>
  );
}
