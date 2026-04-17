'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Copy, Loader2, ListPlus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/lib/workspace';
import { getStepLabel } from '@/lib/workflows';
import {
    workflowStatePresentation,
    type WorkflowListRow,
} from '@/components/workflows/workflows-columns';
import { WorkflowListEnrollModal } from '@/components/workflows/workflow-list-enroll-modal';
import { WorkflowListIcon } from '@/components/workflows/workflow-list-icon';
import { ConnectionGate } from '@/components/unipile/connection-gate';
import { cn } from '@/lib/utils';

function stepTypesInOrder(row: WorkflowListRow): string[] {
    const pub = row.published_definition?.steps;
    if (pub && pub.length > 0) return pub.map((s) => s.type);
    const draft = row.draft_definition?.steps;
    return draft?.map((s) => s.type) ?? [];
}

export default function WorkflowsPage() {
    const router = useRouter();
    const { workspaceId } = useWorkspace();
    const reduceMotion = useReducedMotion() ?? false;
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<WorkflowListRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const [duplicateBusyId, setDuplicateBusyId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<WorkflowListRow | null>(
        null
    );
    const [enrollWorkflowId, setEnrollWorkflowId] = useState<string | null>(
        null
    );

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const load = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/workflows?page=${page}&pageSize=${pageSize}`,
                { credentials: 'include' }
            );
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json?.error?.message ?? 'Erreur');
            }
            setItems((json.data.items ?? []) as WorkflowListRow[]);
            setTotal(json.data.total ?? 0);
        } catch (e) {
            toast.error(
                e instanceof Error ? e.message : 'Chargement impossible'
            );
        } finally {
            setLoading(false);
        }
    }, [workspaceId, page, pageSize]);

    useEffect(() => {
        load();
    }, [load]);

    const handleDuplicate = useCallback(
        async (row: WorkflowListRow) => {
            setDuplicateBusyId(row.id);
            try {
                const res = await fetch(`/api/workflows/${row.id}/duplicate`, {
                    method: 'POST',
                    credentials: 'include',
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(
                        json?.error?.message ?? 'Duplication impossible'
                    );
                }
                toast.success('Parcours dupliqué');
                await load();
                const newId = json.data?.workflow?.id as string | undefined;
                if (newId) router.push(`/whatsapp/${newId}`);
            } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Erreur');
            } finally {
                setDuplicateBusyId(null);
            }
        },
        [load, router]
    );

    const confirmDeleteWorkflow = useCallback(async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/workflows/${deleteTarget.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(
                    json?.error?.message ?? 'Suppression impossible'
                );
            }
            toast.success('Parcours supprimé');
            setDeleteTarget(null);
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erreur');
        }
    }, [deleteTarget, load]);

    const handleStartWithLists = useCallback((row: WorkflowListRow) => {
        setEnrollWorkflowId(row.id);
    }, []);

    const footer = (
        <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
                {total > 0 ? (
                    <span>
                        {total} parcours · Page {page} sur{' '}
                        {totalPages}
                    </span>
                ) : (
                    <span>Aucun parcours WhatsApp</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                >
                    Précédent
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                >
                    Suivant
                </Button>
            </div>
        </div>
    );

    const listMotion = useMemo(
        () =>
            reduceMotion
                ? { initial: false, animate: { opacity: 1, y: 0 }, exit: { opacity: 1, y: 0 } }
                : {
                      initial: { opacity: 0, y: 8 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0, y: -8 },
                  },
        [reduceMotion]
    );

    if (!workspaceId) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <ConnectionGate acceptEitherLinkedInOrWhatsApp pageName="Suivi WhatsApp">
            <div className="flex h-full flex-col">
                <div className="flex-1 flex flex-col overflow-hidden p-6">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="max-w-2xl space-y-2">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Créez un parcours (enregistrement), puis ouvrez-le depuis la liste
                                ci-dessous : cliquez sur une carte pour accéder à la fiche, choisissez
                                les listes et lancez le parcours pour vos contacts. Chaque contact
                                avance indépendamment.
                            </p>
                        </div>
                        <Button
                            asChild
                            className="shrink-0 self-start sm:self-auto"
                        >
                            <Link href="/whatsapp/new">
                                <Plus className="h-4 w-4" />
                                <span className="ml-2">Nouveau parcours</span>
                            </Link>
                        </Button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {loading && items.length === 0 ? (
                            <div className="flex min-h-[30vh] items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : items.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                Aucun parcours WhatsApp. Créez-en un pour commencer.
                            </p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <AnimatePresence mode="popLayout">
                                    {items.map((row, index) => {
                                        const state = workflowStatePresentation(row);
                                        const stepTypes = stepTypesInOrder(row);
                                        const shownTypes = stepTypes.slice(0, 3);
                                        const more = stepTypes.length - 3;
                                        const stateColor =
                                            state.variant === 'primary'
                                                ? 'text-primary'
                                                : state.variant === 'warning'
                                                  ? 'text-amber-700 dark:text-amber-400'
                                                  : 'text-foreground';
                                        const progress = row.execution_progress_pct;
                                        return (
                                            <motion.div
                                                key={row.id}
                                                layout
                                                initial={listMotion.initial}
                                                animate={listMotion.animate}
                                                exit={listMotion.exit}
                                                transition={
                                                    reduceMotion
                                                        ? { duration: 0 }
                                                        : { duration: 0.2, delay: index * 0.05 }
                                                }
                                                className="group relative flex flex-col rounded-xl border bg-card p-4 shadow-xs ring-1 ring-border/60 transition-shadow hover:shadow-md"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    router.push(`/whatsapp/${row.id}`)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        router.push(`/whatsapp/${row.id}`);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <WorkflowListIcon
                                                        icon={row.ui.icon}
                                                        color={row.ui.color}
                                                        className="h-10 w-10 shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <h2 className="truncate font-semibold leading-tight">
                                                            {row.name}
                                                        </h2>
                                                        <p
                                                            className={cn(
                                                                'mt-1 text-sm font-medium',
                                                                stateColor
                                                            )}
                                                        >
                                                            {state.label}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {stepTypes.length}{' '}
                                                        {stepTypes.length > 1 ? 'étapes' : 'étape'}
                                                    </span>
                                                    {shownTypes.map((t, pi) => (
                                                        <Badge
                                                            key={`${row.id}-pill-${pi}`}
                                                            variant="secondary"
                                                            className="max-w-[140px] truncate font-normal"
                                                        >
                                                            {getStepLabel(t).label}
                                                        </Badge>
                                                    ))}
                                                    {more > 0 ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            + {more} autre{more > 1 ? 's' : ''}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="mt-4 min-h-[2.5rem]">
                                                    {progress === null ? (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <Progress value={progress} className="h-2" />
                                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                                {progress} % terminés
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div
                                                    className="mt-4 flex flex-wrap gap-1 border-t pt-3"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                >
                                                    {row.is_published ? (
                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            size="sm"
                                                            className="h-8 gap-1"
                                                            title="Choisir une ou plusieurs listes puis lancer le parcours"
                                                            onClick={() =>
                                                                handleStartWithLists(row)
                                                            }
                                                        >
                                                            <ListPlus className="h-3.5 w-3.5 shrink-0" />
                                                            Lancer
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-8"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/whatsapp/${row.id}`}
                                                                title="Finaliser le parcours sur la fiche"
                                                            >
                                                                Configurer
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={duplicateBusyId === row.id}
                                                        title="Dupliquer"
                                                        aria-label="Dupliquer"
                                                        onClick={() => handleDuplicate(row)}
                                                    >
                                                        {duplicateBusyId === row.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Copy className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        title="Supprimer"
                                                        aria-label="Supprimer"
                                                        onClick={() => setDeleteTarget(row)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {footer}
                </div>

                <ConfirmDialog
                    open={deleteTarget != null}
                    onOpenChange={(o) => {
                        if (!o) setDeleteTarget(null);
                    }}
                    title="Supprimer ce parcours ?"
                    description={
                        deleteTarget
                            ? `« ${deleteTarget.name} » et ses exécutions seront supprimés définitivement.`
                            : undefined
                    }
                    confirmLabel="Supprimer"
                    variant="destructive"
                    onConfirm={() => {
                        void confirmDeleteWorkflow();
                    }}
                />

                <WorkflowListEnrollModal
                    open={enrollWorkflowId != null}
                    onOpenChange={(o) => {
                        if (!o) setEnrollWorkflowId(null);
                    }}
                    workflowId={enrollWorkflowId ?? ''}
                    onSuccess={() => load()}
                />
            </div>
        </ConnectionGate>
    );
}
