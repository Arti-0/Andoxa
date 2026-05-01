'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/workspace';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    WorkflowBddTablePicker,
    mergeBddPickerSelection,
} from './workflow-bdd-table-picker';
import type { BddRow } from '@/components/crm/crm-table';

interface WorkflowListEnrollModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowId: string;
    onSuccess?: () => void;
}

/**
 * Body shared between the desktop Dialog and the mobile Sheet. The wrapping
 * element is provided by the parent so it can apply the chrome (header, body,
 * footer) appropriate for that surface.
 */
interface BodyProps {
    workspaceId: string | null;
    countLists: number;
    onPickerChange: (selectedOnPage: BddRow[], pageRowIds: string[]) => void;
}

function PickerBody({ workspaceId, countLists, onPickerChange }: BodyProps) {
    return (
        <WorkflowBddTablePicker
            workspaceId={workspaceId}
            onSelectionChange={onPickerChange}
            toolbarExtra={
                countLists > 0 ? (
                    <span className="text-sm text-muted-foreground">
                        {countLists} liste
                        {countLists > 1 ? 's' : ''} sélectionnée
                        {countLists > 1 ? 's' : ''}
                    </span>
                ) : null
            }
        />
    );
}

function FooterActions({
    submitting,
    canSubmit,
    onCancel,
    onSubmit,
}: {
    submitting: boolean;
    canSubmit: boolean;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    return (
        <>
            <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
            </Button>
            <Button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={onSubmit}
            >
                {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Lancer
            </Button>
        </>
    );
}

export function WorkflowListEnrollModal({
    open,
    onOpenChange,
    workflowId,
    onSuccess,
}: WorkflowListEnrollModalProps) {
    const { workspaceId } = useWorkspace();
    const isMobile = useIsMobile();
    const [merged, setMerged] = useState<Map<string, BddRow>>(new Map());
    const [submitting, setSubmitting] = useState(false);
    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setMerged(new Map());
        }
        wasOpenRef.current = open;
    }, [open]);

    const handlePickerChange = useCallback(
        (selectedOnPage: BddRow[], pageRowIds: string[]) => {
            setMerged((prev) =>
                mergeBddPickerSelection(prev, selectedOnPage, pageRowIds)
            );
        },
        []
    );

    const handleOpenChange = (o: boolean) => {
        if (!o) setMerged(new Map());
        onOpenChange(o);
    };

    const bddIds = [...merged.keys()];
    const countLists = bddIds.length;

    const submit = async () => {
        if (!bddIds.length || !workflowId) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/workflows/${workflowId}/runs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ bdd_ids: bddIds }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json?.error?.message ?? 'Échec');
            }
            const created = json.data?.created_run_ids?.length ?? 0;
            const skipped = json.data?.skipped?.length ?? 0;
            if (created) {
                toast.success(
                    created === 1
                        ? '1 contact ajouté au parcours.'
                        : `${created} contacts ajoutés au parcours.`
                );
            }
            if (skipped) {
                toast.message(`${skipped} ignoré(s)`, {
                    description: 'Déjà dans ce parcours ou hors sélection.',
                });
            }
            if (!created && !skipped) {
                toast.error('Aucun contact ajouté (listes vides ?)');
            }
            handleOpenChange(false);
            onSuccess?.();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    const body: ReactNode = (
        <PickerBody
            workspaceId={workspaceId}
            countLists={countLists}
            onPickerChange={handlePickerChange}
        />
    );

    const footer = (
        <FooterActions
            submitting={submitting}
            canSubmit={bddIds.length > 0}
            onCancel={() => handleOpenChange(false)}
            onSubmit={submit}
        />
    );

    // ── Mobile: bottom Sheet, near full-screen ─────────────────────────────
    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <SheetContent
                    side="bottom"
                    className="flex h-[92vh] flex-col gap-0 rounded-t-xl p-0"
                >
                    <SheetHeader className="shrink-0 space-y-1 border-b p-4 text-left">
                        <SheetTitle>Démarrer pour des listes</SheetTitle>
                        <SheetDescription>
                            Choisissez une ou plusieurs listes. Chaque contact
                            démarre son propre parcours.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
                        {body}
                    </div>
                    <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t bg-muted/30 p-3">
                        {footer}
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        );
    }

    // ── Desktop: roomy Dialog. Width = 92vw clamped at 1180px so big screens
    //    don't get a tiny modal but ultra-wide displays don't get a giant one.
    //    Height = 92vh clamped at 860px. (Tailwind v4 needs bracket syntax for
    //    arbitrary `min(...)` values — the previous markup was broken and fell
    //    back to `sm:max-w-lg`, which is why the dialog felt tiny.)
    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                showCloseButton
                className="flex h-[min(92vh,860px)] w-[92vw] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px] sm:rounded-xl"
            >
                <DialogHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
                    <DialogTitle>Démarrer pour des listes</DialogTitle>
                    <DialogDescription>
                        Choisissez une ou plusieurs listes. Chaque contact
                        démarre son propre parcours, sans bloquer les autres
                        lancements.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
                    {body}
                </div>
                <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4">
                    {footer}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
