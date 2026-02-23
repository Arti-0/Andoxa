"use client";

import { useState } from "react";
import { useWorkspace } from "../../../lib/workspace";
import { Sun, User, Lock, CreditCard, Building2, LogOut } from "lucide-react";
import { ThemeModal } from "@/components/settings/ThemeModal";
import { ProfileModal } from "@/components/settings/ProfileModal";
import { PasswordModal } from "@/components/settings/PasswordModal";
import { BillingModal } from "@/components/settings/BillingModal";
import { OrganizationModal } from "@/components/settings/OrganizationModal";
import { AccountModal } from "@/components/settings/AccountModal";

/**
 * Settings Page
 *
 * Paramètres du compte et de l'organisation
 * - Apparence (thème)
 * - Profil
 * - Sécurité (mot de passe)
 * - Abonnement (Stripe Portal)
 * - Organisation (invitations, sélecteur, suppression)
 * - Compte (déconnexion, suppression)
 */
export default function SettingsPage() {
  const { workspace, profile, canManageBilling, refresh } = useWorkspace();
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const cards = [
    {
      id: "theme",
      title: "Apparence",
      description: "Thème clair, sombre ou système",
      icon: Sun,
      onClick: () => setThemeModalOpen(true),
    },
    {
      id: "profile",
      title: "Profil",
      description: "Nom et informations personnelles",
      icon: User,
      onClick: () => setProfileModalOpen(true),
    },
    {
      id: "password",
      title: "Sécurité",
      description: "Changer le mot de passe",
      icon: Lock,
      onClick: () => setPasswordModalOpen(true),
    },
    ...(canManageBilling
      ? [
          {
            id: "billing",
            title: "Abonnement",
            description: "Plan et facturation Stripe",
            icon: CreditCard,
            onClick: () => setBillingModalOpen(true),
          },
        ]
      : []),
    {
      id: "org",
      title: "Organisation",
      description: "Organisation active et invitations",
      icon: Building2,
      onClick: () => setOrgModalOpen(true),
    },
    {
      id: "account",
      title: "Compte",
      description: "Déconnexion et suppression",
      icon: LogOut,
      onClick: () => setAccountModalOpen(true),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez votre compte et votre organisation
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className="flex flex-col items-start gap-2 rounded-lg border p-6 text-left transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Icon className="h-6 w-6 text-muted-foreground" />
              <h2 className="font-semibold">{card.title}</h2>
              <p className="text-sm text-muted-foreground">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      <ThemeModal open={themeModalOpen} onOpenChange={setThemeModalOpen} />
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        fullName={profile?.full_name ?? null}
        email={profile?.email ?? null}
        onSuccess={refresh}
      />
      <PasswordModal open={passwordModalOpen} onOpenChange={setPasswordModalOpen} />
      <BillingModal
        open={billingModalOpen}
        onOpenChange={setBillingModalOpen}
        plan={workspace?.plan ?? null}
        subscriptionStatus={workspace?.subscription_status ?? null}
      />
      <OrganizationModal
        open={orgModalOpen}
        onOpenChange={setOrgModalOpen}
        onSwitch={refresh}
      />
      <AccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} />
    </div>
  );
}
