'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Loader2,
    UserPlus,
    MessageSquare,
    MessageCircle,
    ArrowRight,
    ArrowLeft,
    Clock,
    Users,
    AlertCircle,
} from 'lucide-react';
import type { Prospect } from '@/lib/types/prospects';
import type { CampaignConfig, LinkedInAction } from '@/lib/campaigns/types';
import {
    campaignLabel,
    jobTypeFromConfig,
    requiresPremium,
    isInviteAction,
} from '@/lib/campaigns/types';
import { toast } from 'sonner';
import { applyMessageVariables } from '@/lib/unipile/campaign';
import {
    CAMPAIGN_VARIABLE_META,
    extractUsedCampaignVariables,
    missingVariablesForProspect,
} from '@/lib/campaigns/variable-gaps';
import { MessageComposeForm } from '@/components/campaigns/message-compose-form';
import { LinkedInPremiumBadge } from '@/components/ui/linkedin-premium-badge';
import {
    getMaxCharsForMode,
    getInviteLimitLabel,
    getContactLimitLabel,
} from '@/lib/linkedin/limits';
import { cn } from '@/lib/utils';
import {
    estimateCampaignDurationMs,
    formatDurationLabel,
} from '@/lib/campaigns/throttle';

const INVITE_NOTE_PLACEHOLDER = `Bonjour {{firstName}},

Je souhaite échanger avec vous sur {{company}}.
Cordialement`;

const CONTACT_PLACEHOLDER = `Bonjour {{firstName}},

J'ai vu votre profil chez {{company}} et souhaiterais vous contacter au sujet de votre poste {{jobTitle}}.
Pouvez-vous me recontacter ?

Cordialement`;

const WHATSAPP_PLACEHOLDER = `Bonjour {{firstName}},

…`;

type LinkedInActionOption = {
    value: LinkedInAction;
    label: string;
    description: string;
    premiumOnly: boolean;
};

const LINKEDIN_OPTIONS: LinkedInActionOption[] = [
    {
        value: 'contact',
        label: 'Message',
        description: 'Message direct à une connexion existante',
        premiumOnly: false,
    },
    {
        value: 'invite',
        label: 'Invitation',
        description: 'Demande de connexion sans note',
        premiumOnly: false,
    },
    {
        value: 'invite_with_note',
        label: 'Invitation + note',
        description: 'Demande avec message personnalisé (300 car.)',
        premiumOnly: true,
    },
];

function applyPreviewVariables(
    template: string,
    prospect: Prospect,
    bookingLinkPreview?: string
): string {
    return applyMessageVariables(template, prospect, {
        bookingLink: bookingLinkPreview ?? undefined,
    });
}

export interface CampaignModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: CampaignConfig | null;
    prospects: Prospect[];
    listName?: string | null;
    onSuccess?: (jobId: string) => void;
    isPremium?: boolean;
}

async function trySaveAsTemplate(
    name: string,
    content: string,
    maxLen = 2000,
    channel: 'linkedin' | 'whatsapp' = 'linkedin'
): Promise<boolean> {
    const res = await fetch('/api/message-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            name: name.trim(),
            channel,
            content: content.trim().slice(0, maxLen),
        }),
    });
    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(
            j?.error?.message ?? 'Le modèle n’a pas pu être enregistré'
        );
        return false;
    }
    return true;
}

export function CampaignModal({
    open,
    onOpenChange,
    config,
    prospects,
    listName: _listName,
    onSuccess,
    isPremium = false,
}: CampaignModalProps) {
    const queryClient = useQueryClient();
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [step, setStep] = useState<'compose' | 'gaps' | 'preview'>('compose');
    const [linkedInAction, setLinkedInAction] =
        useState<LinkedInAction>('contact');
    const [saveAsTemplate, setSaveAsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [gapDefaults, setGapDefaults] = useState<Record<string, string>>({});
    const [gapDrafts, setGapDrafts] = useState<Record<string, string>>({});
    const [gapTargets, setGapTargets] = useState<Prospect[]>([]);
    const [alreadyInvitedIds, setAlreadyInvitedIds] = useState<Set<string>>(
        new Set()
    );

    const { data: bookingSlugRes } = useQuery({
        queryKey: ['booking-slug', open],
        queryFn: async () => {
            const res = await fetch('/api/booking/slug', {
                credentials: 'include',
            });
            if (!res.ok) return { booking_slug: null as string | null };
            const json = await res.json();
            const d = json?.data ?? json;
            return { booking_slug: (d?.booking_slug ?? null) as string | null };
        },
        enabled: open,
        staleTime: 60_000,
    });

    const bookingSlug = bookingSlugRes?.booking_slug ?? null;
    const bookingUrl =
        typeof window !== 'undefined' && bookingSlug
            ? `${window.location.origin}/booking/${bookingSlug}`
            : '';

    const prospectIdsParam = useMemo(
        () => prospects.map((p) => p.id).join(','),
        [prospects]
    );

    useEffect(() => {
        if (!open) return;
        setSaveAsTemplate(false);
        setTemplateName('');
    }, [open]);

    useEffect(() => {
        if (!open || !config) return;
        if (config.channel === 'linkedin') {
            let next: LinkedInAction = config.linkedInAction ?? 'contact';
            if (!isPremium && next === 'invite_with_note') next = 'invite';
            setLinkedInAction(next);
        }
    }, [open, config, isPremium]);

    useEffect(() => {
        if (!open || config?.channel !== 'linkedin' || isPremium) {
            setAlreadyInvitedIds(new Set());
            return;
        }
        const ids = prospectIdsParam;
        if (!ids) return;
        fetch(
            `/api/campaigns/invited-prospect-ids?prospect_ids=${encodeURIComponent(ids)}`,
            {
                credentials: 'include',
            }
        )
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                const raw = (json?.data?.ids ?? json?.ids ?? []) as string[];
                setAlreadyInvitedIds(new Set(raw));
            })
            .catch(() => {});
    }, [open, config?.channel, isPremium, prospectIdsParam]);

    const channel = config?.channel ?? 'linkedin';
    const isLinkedIn = channel === 'linkedin';
    const isWhatsApp = channel === 'whatsapp';
    const isInvitePlain = linkedInAction === 'invite';
    const isInviteWithNote = linkedInAction === 'invite_with_note';
    const isContact = linkedInAction === 'contact';

    const effectiveConfig: CampaignConfig = useMemo(() => {
        if (!config) return { channel: 'linkedin', linkedInAction: 'contact' };
        if (config.channel === 'whatsapp') return { channel: 'whatsapp' };
        return { channel: 'linkedin', linkedInAction };
    }, [config, linkedInAction]);

    const label = config ? campaignLabel(effectiveConfig) : 'Campagne';

    const maxChars = isWhatsApp
        ? 2000
        : isInvitePlain
          ? 0
          : getMaxCharsForMode(
                isInviteWithNote ? 'invite' : 'contact',
                isPremium
            );

    const count = prospects.length;
    const placeholder = isWhatsApp
        ? WHATSAPP_PLACEHOLDER
        : isInviteWithNote
          ? INVITE_NOTE_PLACEHOLDER
          : CONTACT_PLACEHOLDER;

    /** WhatsApp : uniquement le texte saisi (obligatoire), jamais le placeholder comme contenu réel. */
    const text = isWhatsApp
        ? message.trim()
        : isLinkedIn && isInvitePlain
          ? ''
          : message.trim() || placeholder;

    const BATCH_SIZE = 10;
    const DELAY_MS = 120000;
    const durationMs = estimateCampaignDurationMs(
        count,
        BATCH_SIZE,
        DELAY_MS,
        isWhatsApp ? 'whatsapp' : 'linkedin'
    );
    const durationLabel = formatDurationLabel(durationMs);

    const availableOptions = useMemo(
        () => LINKEDIN_OPTIONS.filter((o) => !o.premiumOnly || isPremium),
        [isPremium]
    );

    const notInvitedCount = prospects.filter(
        (p) => !alreadyInvitedIds.has(p.id)
    ).length;

    const usedVarKeys = useMemo(
        () => extractUsedCampaignVariables(text),
        [text]
    );
    const hasBookingLink = Boolean(bookingSlug);
    const incompleteProspects = useMemo(() => {
        return prospects.filter(
            (p) =>
                missingVariablesForProspect(p, usedVarKeys, hasBookingLink)
                    .length > 0
        );
    }, [prospects, usedVarKeys, hasBookingLink]);

    const gapProspectCount = Object.keys(gapDefaults).length;
    const adjustedMessageCount = useMemo(() => {
        return Object.keys(gapDefaults).filter((id) => {
            const def = (gapDefaults[id] ?? '').trim();
            const dr = gapDrafts[id];
            if (dr === undefined) return false;
            return dr.trim() !== def;
        }).length;
    }, [gapDefaults, gapDrafts]);

    const handleComposeNext = () => {
        if (saveAsTemplate && !templateName.trim()) {
            toast.error(
                'Indiquez un nom pour le modèle ou désactivez l’enregistrement.'
            );
            return;
        }
        if (isWhatsApp && !message.trim()) {
            toast.error('Le message WhatsApp est obligatoire.');
            return;
        }
        if (incompleteProspects.length > 0) {
            const defs: Record<string, string> = {};
            for (const p of incompleteProspects) {
                defs[p.id] = applyMessageVariables(text, p, {
                    bookingLink: bookingUrl || undefined,
                });
            }
            setGapTargets(incompleteProspects);
            setGapDefaults(defs);
            setGapDrafts({});
            setStep('gaps');
        } else {
            setGapTargets([]);
            setGapDefaults({});
            setGapDrafts({});
            setStep('preview');
        }
    };

    const handleGapsNext = () => setStep('preview');

    const handleBack = () => {
        if (step === 'preview') {
            if (Object.keys(gapDefaults).length > 0) setStep('gaps');
            else setStep('compose');
        } else if (step === 'gaps') {
            setStep('compose');
        }
    };

    const buildMessageByProspect = (): Record<string, string> => {
        const out: Record<string, string> = {};
        for (const id of Object.keys(gapDefaults)) {
            const final = (gapDrafts[id] ?? gapDefaults[id] ?? '').trim();
            if (final) out[id] = final;
        }
        return out;
    };

    const handleSave = async () => {
        if (count === 0 || !config) return;
        if (isWhatsApp && !message.trim()) {
            toast.error('Le message WhatsApp est obligatoire.');
            return;
        }
        setSending(true);
        const messageByProspect = buildMessageByProspect();
        const jobType = jobTypeFromConfig(effectiveConfig);
        const templateChannel: 'linkedin' | 'whatsapp' = isWhatsApp
            ? 'whatsapp'
            : 'linkedin';
        const templateText = isLinkedIn && isInvitePlain ? '' : text;

        try {
            const res = await fetch('/api/campaigns/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    type: jobType,
                    prospect_ids: prospects.map((p) => p.id),
                    message_template: templateText,
                    batch_size: BATCH_SIZE,
                    delay_ms: DELAY_MS,
                    message_overrides:
                        Object.keys(messageByProspect).length > 0
                            ? messageByProspect
                            : undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                toast.error(
                    json?.error?.message ?? 'Erreur lors de la sauvegarde'
                );
                return;
            }
            const jobId = (json?.data?.id ?? json?.id) as string | undefined;
            if (saveAsTemplate && templateName.trim() && templateText.trim()) {
                const ok = await trySaveAsTemplate(
                    templateName,
                    templateText,
                    maxChars || 2000,
                    templateChannel
                );
                if (ok) {
                    void queryClient.invalidateQueries({
                        queryKey: ['message-templates'],
                    });
                    toast.success('Modèle enregistré');
                }
            }
            toast.success(
                'Campagne sauvegardée — lancez-la depuis la liste des campagnes.'
            );
            if (jobId) onSuccess?.(jobId);
            onOpenChange(false);
            resetState();
        } catch {
            toast.error('Une erreur est survenue');
        } finally {
            setSending(false);
        }
    };

    const resetState = () => {
        setMessage('');
        setStep('compose');
        setSaveAsTemplate(false);
        setTemplateName('');
        setGapDefaults({});
        setGapDrafts({});
        setGapTargets([]);
    };

    const handleClose = (o: boolean) => {
        if (!o) resetState();
        onOpenChange(o);
    };

    if (!config) return null;

    const titleSuffix =
        step === 'preview'
            ? ' — Confirmation'
            : step === 'gaps'
              ? ' — Champs manquants'
              : '';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
                <DialogHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        {isWhatsApp ? (
                            <MessageCircle className="h-5 w-5 text-[#25D366]" />
                        ) : isInviteAction(effectiveConfig) ? (
                            <UserPlus className="h-5 w-5" />
                        ) : (
                            <MessageSquare className="h-5 w-5" />
                        )}
                        <DialogTitle>
                            {label}
                            {titleSuffix}
                        </DialogTitle>
                        {isLinkedIn && requiresPremium(effectiveConfig) ? (
                            <LinkedInPremiumBadge size="sm" />
                        ) : null}
                    </div>
                    {step === 'compose' && isWhatsApp ? (
                        <DialogDescription>
                            Le message est obligatoire. Vous pouvez réutiliser
                            n&apos;importe quel template (LinkedIn ou WhatsApp).
                            Enregistrez en brouillon, puis lancez la campagne
                            depuis la liste.
                        </DialogDescription>
                    ) : step === 'compose' && isLinkedIn && isInvitePlain ? (
                        <DialogDescription>
                            Invitations LinkedIn sans note personnalisée.
                            Enregistrez en brouillon, puis lancez la campagne
                            depuis la liste.
                        </DialogDescription>
                    ) : step === 'compose' && isLinkedIn && isInviteWithNote ? (
                        <DialogDescription>
                            {isPremium
                                ? `Note d'invitation — jusqu'à ${maxChars} caractères (compte Premium).`
                                : `Note d'invitation — jusqu'à ${maxChars} caractères.`}
                        </DialogDescription>
                    ) : step === 'compose' && isLinkedIn ? (
                        <DialogDescription>
                            Message pour connexions existantes. Sauvegarde en
                            brouillon, lancement depuis la liste des campagnes.
                        </DialogDescription>
                    ) : (
                        <DialogDescription className="sr-only">
                            {step === 'gaps' &&
                                'Complétez le texte pour les prospects sans donnée CRM pour certaines variables.'}
                            {step === 'preview' &&
                                'Vérifiez le résumé avant sauvegarde.'}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {step === 'compose' && (
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
                        {isLinkedIn && (
                            <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-1 sm:flex-row sm:gap-1">
                                {availableOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() =>
                                            setLinkedInAction(opt.value)
                                        }
                                        className={cn(
                                            'flex-1 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                                            linkedInAction === opt.value
                                                ? 'bg-background text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            {opt.label}
                                            {opt.premiumOnly ? (
                                                <LinkedInPremiumBadge size="sm" />
                                            ) : null}
                                        </span>
                                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                            {opt.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {isLinkedIn &&
                            !isPremium &&
                            isContact &&
                            notInvitedCount > 0 && (
                                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        <strong>
                                            {notInvitedCount} prospect
                                            {notInvitedCount > 1 ? 's' : ''}
                                        </strong>{' '}
                                        n&apos;ont pas encore été invités.
                                        LinkedIn gratuit ne permet
                                        d&apos;envoyer un message direct
                                        qu&apos;aux connexions existantes.
                                        Lancez d&apos;abord une campagne{' '}
                                        <strong>Invitation</strong> pour ces
                                        prospects.
                                    </span>
                                </div>
                            )}

                        <div className="flex items-center justify-between gap-4">
                            <Label className="text-sm font-medium">
                                Message
                                {isWhatsApp ? (
                                    <span className="ml-1.5 font-normal text-destructive">
                                        *
                                    </span>
                                ) : null}
                                {isWhatsApp ? (
                                    <span className="ml-1 font-normal text-muted-foreground">
                                        (obligatoire)
                                    </span>
                                ) : null}
                            </Label>
                            <div className="flex shrink-0 items-center gap-2">
                                <Label
                                    htmlFor="save-template"
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    Enregistrer comme template
                                </Label>
                                <Switch
                                    id="save-template"
                                    checked={saveAsTemplate}
                                    onCheckedChange={setSaveAsTemplate}
                                    disabled={isLinkedIn && isInvitePlain}
                                />
                            </div>
                        </div>

                        {isLinkedIn && isInvitePlain ? (
                            <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                                Aucun texte n&apos;est envoyé avec cette
                                invitation (connexion seule). Passez à
                                l&apos;aperçu pour enregistrer le brouillon.
                            </div>
                        ) : (
                            <MessageComposeForm
                                message={message}
                                onMessageChange={setMessage}
                                channel={isWhatsApp ? 'whatsapp' : 'linkedin'}
                                linkedinMode={
                                    isInviteWithNote ? 'invite' : 'contact'
                                }
                                isPremium={isPremium}
                                maxLength={maxChars}
                            />
                        )}

                        {saveAsTemplate && !(isLinkedIn && isInvitePlain) && (
                            <div>
                                <Label
                                    htmlFor="template-name"
                                    className="sr-only"
                                >
                                    Nom du modèle
                                </Label>
                                <Input
                                    id="template-name"
                                    value={templateName}
                                    onChange={(e) =>
                                        setTemplateName(e.target.value)
                                    }
                                    placeholder="Nom du modèle"
                                    maxLength={100}
                                />
                            </div>
                        )}
                    </div>
                )}

                {step === 'gaps' && (
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
                        <p className="text-sm text-muted-foreground">
                            {gapTargets.length} prospect
                            {gapTargets.length > 1 ? 's' : ''} — variables sans
                            donnée en CRM. Ajustez chaque message si besoin.
                        </p>
                        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
                            {gapTargets.map((p) => {
                                const missing = missingVariablesForProspect(
                                    p,
                                    usedVarKeys,
                                    hasBookingLink
                                );
                                return (
                                    <div
                                        key={p.id}
                                        className="rounded-md border p-3"
                                    >
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-medium">
                                                {p.full_name ??
                                                    p.id.slice(0, 8)}
                                            </span>
                                            {missing.map((k) => (
                                                <span
                                                    key={k}
                                                    className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                                    title={
                                                        CAMPAIGN_VARIABLE_META[
                                                            k
                                                        ].crmColumn
                                                    }
                                                >
                                                    {`{{${k}}}`}
                                                </span>
                                            ))}
                                        </div>
                                        <Textarea
                                            value={
                                                gapDrafts[p.id] ??
                                                gapDefaults[p.id] ??
                                                ''
                                            }
                                            onChange={(e) =>
                                                setGapDrafts((prev) => ({
                                                    ...prev,
                                                    [p.id]: e.target.value,
                                                }))
                                            }
                                            rows={4}
                                            className="font-mono text-sm"
                                            maxLength={maxChars || 2000}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="space-y-4 overflow-y-auto py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-md border p-3 text-center">
                                <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                                <p className="mt-1 text-lg font-semibold">
                                    {count}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {count > 1
                                        ? 'Destinataires'
                                        : 'Destinataire'}
                                </p>
                            </div>

                            <div className="rounded-md border p-3 text-center">
                                <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
                                <p className="mt-1 text-lg font-semibold">
                                    {durationLabel}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Durée estimée
                                </p>
                            </div>
                        </div>

                        <div className="rounded-md border bg-muted/20 p-3 text-sm">
                            <p className="mb-2 font-medium">Résumé</p>
                            <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
                                <li>
                                    <span className="text-foreground">
                                        Enregistrement :
                                    </span>{' '}
                                    brouillon — utilisez « Lancer » dans la
                                    liste pour démarrer l&apos;envoi.
                                </li>
                                {gapProspectCount > 0 && (
                                    <>
                                        <li>
                                            <span className="text-foreground">
                                                Messages ajustés (données CRM
                                                manquantes) :
                                            </span>{' '}
                                            {gapProspectCount} prospect
                                            {gapProspectCount > 1 ? 's' : ''}
                                        </li>
                                        <li>
                                            <span className="text-foreground">
                                                Modifiés manuellement à l’étape
                                                précédente :
                                            </span>{' '}
                                            {adjustedMessageCount}
                                        </li>
                                    </>
                                )}
                                <li>
                                    <span className="text-foreground">
                                        Limites (indicatif) :
                                    </span>{' '}
                                    {isWhatsApp
                                        ? "Évitez d'initier trop de nouveaux chats sans réponse — WhatsApp surveille ce ratio."
                                        : isInvitePlain || isInviteWithNote
                                          ? getInviteLimitLabel(isPremium)
                                          : getContactLimitLabel(isPremium)}
                                </li>
                            </ul>
                        </div>

                        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                {isWhatsApp
                                    ? 'Les limites réelles dépendent de WhatsApp et de votre activité récente.'
                                    : 'Les quotas réels dépendent de votre compte LinkedIn et de votre activité récente.'}
                            </span>
                        </div>

                        <div>
                            <p className="mb-1.5 text-sm font-medium">
                                Exemple (1er prospect)
                            </p>
                            <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-sm">
                                {isLinkedIn && isInvitePlain ? (
                                    <span className="text-muted-foreground">
                                        (Invitation sans note)
                                    </span>
                                ) : prospects[0] ? (
                                    applyPreviewVariables(
                                        text,
                                        prospects[0],
                                        bookingUrl || undefined
                                    )
                                ) : (
                                    text
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="shrink-0 border-t pt-4">
                    {step === 'compose' ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => handleClose(false)}
                                disabled={sending}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleComposeNext}
                                disabled={count === 0}
                            >
                                {incompleteProspects.length > 0
                                    ? 'Suite'
                                    : 'Aperçu'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    ) : step === 'gaps' ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={sending}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Retour
                            </Button>
                            <Button
                                onClick={handleGapsNext}
                                disabled={count === 0}
                            >
                                Aperçu
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={sending}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Retour
                            </Button>
                            <Button
                                onClick={() => void handleSave()}
                                disabled={sending}
                            >
                                {sending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Sauvegarder la campagne'
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
