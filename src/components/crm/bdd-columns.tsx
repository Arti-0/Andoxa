'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { List, Trash2, CheckCircle, Circle } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import type { BddRow } from './crm-table';

const SOURCE_LABELS: Record<string, string> = {
    linkedin_extension: 'LinkedIn',
    linkedin: 'LinkedIn',
    csv: 'Import CSV',
    import: 'Import',
    manual: 'Manuel',
    website: 'Site web',
};

export function getBddColumns(
    onSelect: (bddId: string | null) => void,
    onDelete: (bddId: string) => void,
    memberNames: Map<string, string>,
    memberAvatars?: Map<string, string | null>
): ColumnDef<BddRow>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => {
                const allSelected = table.getIsAllPageRowsSelected();
                const someSelected = table.getIsSomePageRowsSelected();
                return (
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() =>
                                table.toggleAllPageRowsSelected(
                                    !(allSelected || someSelected)
                                )
                            }
                            className="flex items-center justify-center"
                            aria-label="Tout sélectionner"
                        >
                            {allSelected ? (
                                <CheckCircle className="h-4 w-4 text-primary" />
                            ) : someSelected ? (
                                <CheckCircle className="h-4 w-4 text-muted-foreground/60" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/40" />
                            )}
                        </button>
                    </div>
                );
            },
            cell: ({ row }) => {
                const isSelected = row.getIsSelected();
                return (
                    <div
                        className="flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => row.toggleSelected(!isSelected)}
                            className="flex items-center justify-center"
                            aria-label="Sélectionner la liste"
                        >
                            {isSelected ? (
                                <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/30" />
                            )}
                        </button>
                    </div>
                );
            },
            enableSorting: false,
            size: 48,
        },
        {
            accessorKey: 'name',
            header: 'Liste',
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex items-center gap-2 font-medium">
                        <List className="h-4 w-4 text-muted-foreground" />
                        {item.name}
                    </div>
                );
            },
        },
        {
            accessorKey: 'source',
            header: 'Source',
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <span className="text-muted-foreground">
                        {SOURCE_LABELS[item.source ?? ''] ?? item.source ?? '—'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'prospects_count',
            header: 'Prospects',
            cell: ({ row }) => {
                const item = row.original;
                const count = item.prospects_count ?? 0;
                return (
                    <span className="text-sm text-muted-foreground tabular-nums">
                        {count}
                    </span>
                );
            },
        },
        {
            accessorKey: 'phones_count',
            header: 'Tél.',
            cell: ({ row }) => {
                const item = row.original;
                const count = item.phones_count ?? 0;
                return (
                    <span className="text-sm text-muted-foreground tabular-nums">
                        {count}
                    </span>
                );
            },
        },
        {
            accessorKey: 'proprietaire',
            header: 'Auteur',
            cell: ({ row }) => {
                const item = row.original;
                if (!item.proprietaire) return '—';
                const name =
                    memberNames.get(item.proprietaire) ?? item.proprietaire;
                const avatarUrl = memberAvatars?.get(item.proprietaire) ?? null;
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={avatarUrl ?? undefined} alt="" />
                            <AvatarFallback className="bg-muted text-xs">
                                {name.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground truncate">
                            {name}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'created_at',
            header: 'Date',
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <span className="text-sm text-muted-foreground">
                        {item.created_at ? formatDate(item.created_at) : '—'}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div
                        className="flex justify-end"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(item.id);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Supprimer la liste"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                );
            },
            size: 48,
        },
    ];
}
