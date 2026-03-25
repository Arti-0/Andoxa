'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '../../../lib/workspace';
import {
    Sun,
    User,
    CreditCard,
    Building2,
    LogOut,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { readAutoEnrichOptIn } from '@/lib/enrichment/queue-helpers';
import { ThemeModal } from '@/components/settings/ThemeModal';
import { ProfileModal } from '@/components/settings/ProfileModal';
import { BillingModal } from '@/components/settings/BillingModal';
import { OrganizationModal } from '@/components/settings/OrganizationModal';
import { AccountModal } from '@/components/settings/AccountModal';

/**
 * Settings Page
 *
 * Paramètres du compte et de l'organisation.
 * List of rows (design-3 pattern): icon + title + description + chevron; same modals.
 */
export default function SettingsPage() {
    const { workspace, profile, canManageBilling, refresh } = useWorkspace();
    const [themeModalOpen, setThemeModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [orgModalOpen, setOrgModalOpen] = useState(false);
    const [accountModalOpen, setAccountModalOpen] = useState(false);
    const [autoEnrich, setAutoEnrich] = useState(false);
    const [savingEnrich, setSavingEnrich] = useState(false);

    const showAutoEnrich =
        workspace?.plan === 'pro' || workspace?.plan === 'business';

    useEffect(() => {
        if (workspace?.metadata) {
            setAutoEnrich(readAutoEnrichOptIn(workspace.metadata));
        } else {
            setAutoEnrich(false);
        }
    }, [workspace?.metadata]);

    const onAutoEnrichChange = async (checked: boolean) => {
        setSavingEnrich(true);
        try {
            const res = await fetch('/api/workspace', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    settings: { auto_enrich_on_import: checked },
                }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error?.message ?? 'Erreur');
            }
            setAutoEnrich(checked);
            toast.success(
                checked
                    ? 'Enrichissement auto activé'
                    : 'Enrichissement auto désactivé'
            );
            await refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erreur');
        } finally {
            setSavingEnrich(false);
        }
    };

    const rows: {
        id: string;
        title: string;
        description: string;
        icon: React.ComponentType<{ className?: string }>;
        onClick: () => void;
    }[] = [
        {
            id: 'org',
            title: 'Organisation',
            description: 'Organisation active et invitations',
            icon: Building2,
            onClick: () => setOrgModalOpen(true),
        },
        {
            id: 'profile',
            title: 'Profil',
            description: 'Nom et informations personnelles',
            icon: User,
            onClick: () => setProfileModalOpen(true),
        },
        {
            id: 'theme',
            title: 'Apparence',
            description: 'Thème clair, sombre ou système',
            icon: Sun,
            onClick: () => setThemeModalOpen(true),
        },
        ...(canManageBilling
            ? [
                  {
                      id: 'billing',
                      title: 'Abonnement',
                      description: 'Plan et facturation',
                      icon: CreditCard,
                      onClick: () => setBillingModalOpen(true),
                  },
              ]
            : []),
        {
            id: 'account',
            title: 'Compte',
            description: 'Déconnexion et suppression',
            icon: LogOut,
            onClick: () => setAccountModalOpen(true),
        },
    ];

    return (
        <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Paramètres</h1>
                <p className="text-muted-foreground">
                    Gérez votre compte et votre organisation
                </p>
            </div>

            <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                <div className="divide-y">
                    {rows.map((row) => {
                        const Icon = row.icon;
                        return (
                            <button
                                key={row.id}
                                type="button"
                                onClick={row.onClick}
                                className="flex w-full items-center gap-4 rounded-none px-4 py-3 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">
                                        {row.title}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {row.description}
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            </button>
                        );
                    })}
                </div>
            </div>

            {showAutoEnrich && (
                <div className="rounded-xl border bg-card shadow-xs p-4 flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium">
                            Enrichissement LinkedIn à l&apos;import
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Après chaque import CSV, enrichir automatiquement
                            les fiches.
                        </p>
                        <div className="rounded-lg border border-secondary/60 bg-secondary/10 px-3 py-2 text-xs text-secondary-foreground">
                            Pro+ uniquement : enrichissement via file
                            d&apos;attente (throttlée) et consommation de
                            crédits.
                        </div>
                    </div>
                    <Switch
                        checked={autoEnrich}
                        disabled={savingEnrich}
                        onCheckedChange={onAutoEnrichChange}
                        aria-label="Enrichissement automatique à l'import"
                    />
                </div>
            )}

            <ThemeModal
                open={themeModalOpen}
                onOpenChange={setThemeModalOpen}
            />
            <ProfileModal
                open={profileModalOpen}
                onOpenChange={setProfileModalOpen}
                fullName={profile?.full_name ?? null}
                email={profile?.email ?? null}
                linkedinUrl={profile?.linkedin_url ?? null}
                onSuccess={refresh}
            />
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
            <AccountModal
                open={accountModalOpen}
                onOpenChange={setAccountModalOpen}
            />
        </div>
    );
}
