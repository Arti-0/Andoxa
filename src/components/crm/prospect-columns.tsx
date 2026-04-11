'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import {
    Mail,
    Phone,
    ExternalLink,
    Trash2,
    MessageSquare,
    RotateCcw,
    CheckCircle,
    Circle,
    UserPlus,
    Loader2,
} from 'lucide-react';
import {
    type Prospect,
    PROSPECT_STATUS_LABELS,
    PROSPECT_STATUS_COLORS,
} from '@/lib/types/prospects';

const SOURCE_LABELS: Record<string, string> = {
    manual: 'Manuel',
    csv: 'Import CSV',
    linkedin_extension: 'LinkedIn',
    linkedin: 'LinkedIn',
    import: 'Import',
    website: 'Site web',
};

function InlineEditCell({
    value,
    onSave,
    className = '',
}: {
    value: string;
    onSave: (v: string) => void;
    className?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(value);

    if (!editing) {
        return (
            <span
                className={`cursor-text rounded px-1 -mx-1 hover:bg-accent/50 ${className}`}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    setLocal(value);
                    setEditing(true);
                }}
                title="Double-cliquer pour modifier"
            >
                {value || '—'}
            </span>
        );
    }

    return (
        <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => {
                setEditing(false);
                if (local !== value) onSave(local);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                    setLocal(value);
                    setEditing(false);
                }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border bg-background px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
        />
    );
}

export function getProspectColumns(
    onDelete: (prospect: Prospect) => void,
    onUpdate?: (id: string, field: string, value: string) => void,
    options?: {
        trashMode?: boolean;
        onRestore?: (prospect: Prospect) => void;
        metadataKeys?: string[];
        onLinkedInInvite?: (prospect: Prospect) => void;
        inviteQuota?: { used: number; cap: number };
        invitePendingProspectId?: string | null;
    }
): ColumnDef<Prospect>[] {
    const metaCols: ColumnDef<Prospect>[] = (options?.metadataKeys ?? []).map((key) => ({
        id: `meta_${key}`,
        accessorFn: (row) => {
            const meta = row.metadata as Record<string, unknown> | null;
            return meta?.[key] ?? null;
        },
        header: key,
        cell: ({ getValue }) => {
            const v = getValue() as string | null;
            return <span className="text-sm text-muted-foreground">{v ?? '—'}</span>;
        },
    }));

    const enrichmentCols: ColumnDef<Prospect>[] = [
        {
            id: 'enriched_at',
            accessorKey: 'enriched_at',
            header: 'Enrichi le',
            cell: ({ row }) => {
                const d = row.original.enriched_at;
                if (!d) return <span className="text-sm text-muted-foreground">—</span>;
                return <span className="text-sm text-muted-foreground">{new Date(d).toLocaleDateString('fr-FR')}</span>;
            },
        },
        {
            id: 'enrichment_source',
            accessorKey: 'enrichment_source',
            header: 'Source enrichissement',
            cell: ({ row }) => {
                const s = row.original.enrichment_source;
                return <span className="text-sm text-muted-foreground">{s ?? '—'}</span>;
            },
        },
    ];

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
                            aria-label="Sélectionner"
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
            accessorKey: 'full_name',
            header: 'Nom',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        {onUpdate ? (
                            <InlineEditCell
                                value={p.full_name ?? ''}
                                onSave={(v) => onUpdate(p.id, 'full_name', v)}
                                className="font-medium"
                            />
                        ) : (
                            <p className="font-medium">{p.full_name ?? '—'}</p>
                        )}
                        {p.job_title && (
                            <p className="text-sm text-muted-foreground">
                                {p.job_title}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'company',
            header: 'Entreprise',
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        {onUpdate ? (
                            <InlineEditCell
                                value={p.company ?? ''}
                                onSave={(v) => onUpdate(p.id, 'company', v)}
                            />
                        ) : (
                            <span className="text-sm">{p.company ?? '—'}</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: 'Statut',
            cell: ({ row }) => {
                const status = row.original.status ?? 'new';
                return (
                    <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            PROSPECT_STATUS_COLORS[
                                status as keyof typeof PROSPECT_STATUS_COLORS
                            ] ?? ''
                        }`}
                    >
                        {PROSPECT_STATUS_LABELS[
                            status as keyof typeof PROSPECT_STATUS_LABELS
                        ] ?? status}
                    </span>
                );
            },
        },
        {
            id: 'contact',
            header: 'Contact',
            cell: ({ row }) => {
                const p = row.original;
                const linkedChatId = p.linked_chat_id ?? null;
                const hasDirectChat = !!linkedChatId;
                const canOpenProspectForChat = !!p.linkedin;
                const q = options?.inviteQuota;
                const atCap = q != null && q.used >= q.cap;
                const canRowInvite =
                    !options?.trashMode &&
                    !!options?.onLinkedInInvite &&
                    !!p.linkedin;
                const inviting =
                    options?.invitePendingProspectId === p.id;

                return (
                    <div className="flex flex-wrap items-center gap-2">
                        {canRowInvite && (
                            <div className="flex flex-col items-start gap-0.5">
                                <button
                                    type="button"
                                    title={
                                        atCap
                                            ? 'Quota hebdomadaire atteint'
                                            : 'Inviter sur LinkedIn'
                                    }
                                    disabled={atCap || inviting}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        options.onLinkedInInvite!(p);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-40"
                                >
                                    {inviting ? (
                                        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                                    ) : (
                                        <UserPlus className="h-3 w-3 shrink-0" />
                                    )}
                                    Inviter
                                </button>
                                {q != null && (
                                    <span className="text-[10px] tabular-nums text-muted-foreground">
                                        {q.used}/{q.cap} auj.
                                    </span>
                                )}
                            </div>
                        )}
                        {p.email && (
                            <a
                                href={`mailto:${p.email}`}
                                className="rounded p-1 hover:bg-accent"
                                title={p.email}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Mail className="h-4 w-4 text-muted-foreground" />
                            </a>
                        )}
                        {p.phone && (
                            <a
                                href={`tel:${p.phone}`}
                                className="rounded p-1 hover:bg-accent"
                                title={p.phone}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Phone className="h-4 w-4 text-muted-foreground" />
                            </a>
                        )}
                        {p.linkedin && (
                            <a
                                href={p.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1 hover:bg-accent"
                                title="LinkedIn"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                        )}
                        {hasDirectChat ? (
                            <Link
                                href={`/messagerie?chat=${encodeURIComponent(linkedChatId)}`}
                                className="rounded p-1 hover:bg-accent"
                                title="Ouvrir le chat"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        ) : canOpenProspectForChat ? (
                            <Link
                                href={`/prospect/${p.id}`}
                                className="rounded p-1 hover:bg-accent"
                                title="Fiche prospect — messagerie depuis la fiche"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        ) : (
                            <span
                                className="rounded p-1 cursor-not-allowed opacity-50"
                                title="Invitez d'abord ce prospect pour ouvrir un chat"
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            </span>
                        )}
                    </div>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: 'source',
            header: 'Source',
            cell: ({ row }) => {
                const p = row.original;
                const source = p.source ?? '';
                const isLinkedIn =
                    source === 'linkedin_extension' || source === 'linkedin';
                if (isLinkedIn && p.linkedin) {
                    return (
                        <a
                            href={p.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                        >
                            LinkedIn
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    );
                }
                if (isLinkedIn) {
                    return (
                        <span className="text-sm text-muted-foreground">
                            LinkedIn
                        </span>
                    );
                }
                return (
                    <span className="text-sm capitalize text-muted-foreground">
                        {(SOURCE_LABELS[source] ?? source) || '—'}
                    </span>
                );
            },
        },
        {
            accessorKey: options?.trashMode ? 'deleted_at' : 'created_at',
            header: options?.trashMode ? 'Supprimé le' : 'Date',
            cell: ({ row }) => {
                const p = row.original;
                const date = options?.trashMode
                    ? (p as Prospect & { deleted_at?: string | null })
                          .deleted_at
                    : p.created_at;
                if (!date) return '—';
                return (
                    <span className="text-sm text-muted-foreground">
                        {new Date(date).toLocaleDateString('fr-FR')}
                    </span>
                );
            },
        },
        ...enrichmentCols,
        ...metaCols,
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => {
                const p = row.original;
                if (options?.trashMode && options?.onRestore) {
                    return (
                        <div
                            className="flex justify-end"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    options.onRestore!(p);
                                }}
                                className="rounded p-1 text-muted-foreground hover:bg-green-500/10 hover:text-green-600"
                                aria-label="Restaurer le prospect"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>
                    );
                }
                return (
                    <div
                        className="flex justify-end"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(p);
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Supprimer le prospect"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                );
            },
            enableSorting: false,
            size: 48,
        },
    ];
}

/** Default columns without delete handler (for ProspectTable etc.) */
export const prospectColumns = getProspectColumns(() => {});
