'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    type PaginationState,
} from '@tanstack/react-table';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTableLayout } from '@/components/ui/data-table';
import { useWorkspace } from '@/lib/workspace';
import {
    getWorkflowListColumns,
    type WorkflowListRow,
} from '@/components/workflows/workflows-columns';
import { WorkflowListEnrollModal } from '@/components/workflows/workflow-list-enroll-modal';

export default function WorkflowsPage() {
    const router = useRouter();
    const { workspaceId } = useWorkspace();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<WorkflowListRow[]>([]);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    });
    const [duplicateBusyId, setDuplicateBusyId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<WorkflowListRow | null>(
        null
    );
    const [enrollWorkflowId, setEnrollWorkflowId] = useState<string | null>(
        null
    );

    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;
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
                toast.success('Workflow dupliqué');
                await load();
                const newId = json.data?.workflow?.id as string | undefined;
                if (newId) router.push(`/workflows/${newId}`);
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
            toast.success('Workflow supprimé');
            setDeleteTarget(null);
            await load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erreur');
        }
    }, [deleteTarget, load]);

    const handleStartWithLists = useCallback((row: WorkflowListRow) => {
        setEnrollWorkflowId(row.id);
    }, []);

    const columns = useMemo(
        () =>
            getWorkflowListColumns({
                duplicateBusyId,
                onDuplicate: handleDuplicate,
                onDelete: setDeleteTarget,
                onStartWithLists: handleStartWithLists,
            }),
        [duplicateBusyId, handleDuplicate, handleStartWithLists]
    );

    const table = useReactTable({
        data: items,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        pageCount: totalPages,
        state: { pagination },
        onPaginationChange: setPagination,
    });

    const footer = (
        <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
                {total > 0 ? (
                    <span>
                        {total} workflow{total > 1 ? 's' : ''} · Page {page} sur{' '}
                        {totalPages}
                    </span>
                ) : (
                    <span>Aucun workflow</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={page <= 1 || loading}
                >
                    Précédent
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={page >= totalPages || loading}
                >
                    Suivant
                </Button>
            </div>
        </div>
    );

    if (!workspaceId) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex-1 flex flex-col overflow-hidden p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl space-y-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Créez un parcours (enregistrement), puis ouvrez-le depuis le
                            tableau ci-dessous : cliquez sur une ligne pour accéder à la
                            fiche, choisissez les listes et lancez le parcours pour vos
                            contacts. Chaque contact avance indépendamment.
                        </p>
                    </div>
                    <Button
                        asChild
                        className="shrink-0 self-start sm:self-auto"
                    >
                        <Link href="/workflows/new">
                            <Plus className="h-4 w-4" />
                            <span className="ml-2">Créer</span>
                        </Link>
                    </Button>
                </div>
                <div className="flex-1 min-h-0">
                    <DataTableLayout
                        variant="design2"
                        table={table}
                        isLoading={loading}
                        emptyMessage="Aucun workflow. Créez-en un pour commencer."
                        footer={footer}
                        maxTableHeightClassName="max-h-[calc(100vh-360px)]"
                        onRowClick={(row) =>
                            router.push(`/workflows/${row.original.id}`)
                        }
                    />
                </div>
            </div>

            <ConfirmDialog
                open={deleteTarget != null}
                onOpenChange={(o) => {
                    if (!o) setDeleteTarget(null);
                }}
                title="Supprimer ce workflow ?"
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
    );
}
