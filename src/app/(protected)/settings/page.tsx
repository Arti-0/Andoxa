'use client';

import { useState, useEffect } from 'react';
import { useWorkspace } from '../../../lib/workspace';
import { toast } from 'sonner';
import {
    planAllowsAutoEnrichOnImport,
    readAutoEnrichOptIn,
} from '@/lib/enrichment/queue-helpers';
import { ProfileSettingsSection } from '@/components/settings/profile-settings-section';
import { OrganizationSettingsSection } from '@/components/settings/organization-settings-section';
import { ThemeSettingsSection } from '@/components/settings/theme-settings-section';
import { BillingSettingsSection } from '@/components/settings/billing-settings-section';
import { AccountSettingsSection } from '@/components/settings/account-settings-section';

/**
 * Settings — Two flex columns on lg: left Profil, Apparence, Abonnement; right Organisation, Zone de danger.
 */
export default function SettingsPage() {
    const { workspace, profile, canManageBilling, refresh } = useWorkspace();
    const [autoEnrich, setAutoEnrich] = useState(false);
    const [savingEnrich, setSavingEnrich] = useState(false);

    const showAutoEnrich = planAllowsAutoEnrichOnImport(
        workspace?.plan,
        workspace?.subscription_status
    );

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

    return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pt-8">
            <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
                <div className="flex w-full flex-col gap-6 lg:w-1/2">
                    <div className="min-w-0 w-full">
                        <ProfileSettingsSection
                            fullName={profile?.full_name ?? null}
                            email={profile?.email ?? null}
                            onSuccess={refresh}
                        />
                    </div>
                    <div className="min-w-0 w-full">
                        <ThemeSettingsSection />
                    </div>
                    {canManageBilling ? (
                        <div className="min-w-0 w-full">
                            <BillingSettingsSection
                                plan={workspace?.plan ?? null}
                                subscriptionStatus={
                                    workspace?.subscription_status ?? null
                                }
                            />
                        </div>
                    ) : null}
                </div>
                <div className="flex w-full flex-col gap-6 lg:w-1/2">
                    <div className="min-w-0 w-full">
                        <OrganizationSettingsSection
                            onSwitch={refresh}
                            showLinkedInAutoEnrich={showAutoEnrich}
                            linkedInAutoEnrich={autoEnrich}
                            linkedInAutoEnrichSaving={savingEnrich}
                            onLinkedInAutoEnrichChange={onAutoEnrichChange}
                        />
                    </div>
                    <div className="min-w-0 w-full">
                        <AccountSettingsSection />
                    </div>
                </div>
            </div>
        </div>
    );
}
