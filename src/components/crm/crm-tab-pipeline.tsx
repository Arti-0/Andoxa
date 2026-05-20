'use client';

/**
 * CRM v2 — Pipeline tab.
 *
 * Visual reference: design/CRM/crm-tab-pipeline.jsx.
 *
 * Replaces the legacy Kanban view. Layout = aggregated funnel cards
 * across 7 stages + collapsible per-stage sections (or a continuous
 * list) of prospect rows. Status changes happen inline via the
 * StatusPill dropdown.
 *
 * Data wiring:
 *   • GET /api/prospects?... — paginated rows.
 *   • PATCH /api/prospects/:id — status update.
 *   • DELETE /api/prospects/:id — to corbeille.
 *
 * Stubs: trend deltas per stage, cycle-days per stage, last-activity
 *        labels (see CRM_BACKEND_TODO.md).
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    Filter,
    ArrowDown,
    ArrowUp,
    ChevronDown,
    Layers,
    List as ListIcon,
    Plus,
    X,
    Check,
    MessageSquare,
    Calendar,
    MoreVertical,
    ArrowRight,
    Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { ProspectCreateDialog } from '@/components/crm/prospect-create-dialog';
import {
    useProspectActions,
    type ProspectMenuItem,
} from './use-prospect-actions';
import {
    NameAvatar,
    StatusPill,
    SourcePill,
    ChannelTooltipDot,
    silenceTier,
    silenceTierClasses,
    PIPELINE_ORDER,
    STATUS_CONFIG,
    prospectPhotoFromEnrichment,
} from './crm-shared';
import { type Prospect, type ProspectStatus } from '@/lib/types/prospects';

interface ProspectsApiResponse {
    items: Prospect[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

interface FunnelApiResponse {
    stages: {
        status: ProspectStatus;
        count: number;
        delta_7d: number;
        avg_cycle_days: number | null;
    }[];
}

function trendDir(delta: number): 'up' | 'down' | 'flat' {
    if (delta > 0) return 'up';
    if (delta < 0) return 'down';
    return 'flat';
}

interface PipelineTabProps {
    workspaceId: string | null;
    /** When set (e.g. via /crm?status=proposal), the funnel KPI for that
     *  stage is pre-selected as the active filter. */
    initialStatusFilter?: string | null;
}

type GroupMode = 'grouped' | 'list';
type SortBy = 'entry' | 'lastActivity' | 'silence' | 'alpha';

function lastActivityLabel(p: Prospect): string {
    return p.last_activity?.label ?? '—';
}

function channelKindsFor(p: Prospect): string[] {
    if (p.convs && p.convs.length > 0) return p.convs;
    return p.linked_chat_id ? ['linkedin'] : [];
}

export function PipelineTab({
    workspaceId,
    initialStatusFilter,
}: PipelineTabProps) {
    /** Honor `/crm?status=...` once on mount. */
    const initialFunnel: ProspectStatus | null =
        initialStatusFilter &&
        (PIPELINE_ORDER as readonly string[]).includes(initialStatusFilter)
            ? (initialStatusFilter as ProspectStatus)
            : null;
    const router = useRouter();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [groupMode, setGroupMode] = useState<GroupMode>('grouped');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [pipelineSourceFilter, setPipelineSourceFilter] = useState<string[]>(
        []
    );
    const [sortOpen, setSortOpen] = useState(false);
    const [sortBy, setSortBy] = useState<SortBy>('lastActivity');
    /** When the page is deep-linked with `?status=...`, collapse every
     *  section except the targeted one — mirrors the funnel-card click. */
    const [collapsed, setCollapsed] = useState<Set<ProspectStatus>>(() => {
        if (!initialFunnel) return new Set();
        return new Set(
            (PIPELINE_ORDER as ProspectStatus[]).filter(
                (s) => s !== initialFunnel
            )
        );
    });
    const [pillMenu, setPillMenu] = useState<string | null>(null);
    const [rowMenu, setRowMenu] = useState<string | null>(null);
    const [hoverRow, setHoverRow] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [funnelFilter, setFunnelFilter] = useState<ProspectStatus | null>(
        initialFunnel
    );
    const [showCreate, setShowCreate] = useState(false);
    const rowActions = useProspectActions('prospects-pipeline');

    /* ---------- queries ---------- */
    const { data: prospectsData } = useQuery({
        queryKey: [
            'prospects-pipeline',
            workspaceId,
            search,
            pipelineSourceFilter,
        ],
        queryFn: async () => {
            const params = new URLSearchParams({ page: '1', pageSize: '200' });
            if (search.trim()) params.set('search', search.trim());
            if (pipelineSourceFilter.length > 0)
                params.set('source', pipelineSourceFilter.join(','));
            const res = await fetch(`/api/prospects?${params.toString()}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error(String(res.status));
            const json = await res.json();
            return (json.data ?? json) as ProspectsApiResponse;
        },
        enabled: !!workspaceId,
        placeholderData: (prev) => prev,
    });
    const items = prospectsData?.items ?? [];

    /* CRM-7 — funnel KPIs (count, weekly delta, avg cycle days per stage) */
    const { data: funnelData } = useQuery({
        queryKey: ['prospects-funnel', workspaceId],
        queryFn: async () => {
            const res = await fetch('/api/prospects/funnel', {
                credentials: 'include',
            });
            if (!res.ok) throw new Error(String(res.status));
            const json = await res.json();
            return (json.data ?? json) as FunnelApiResponse;
        },
        enabled: !!workspaceId,
        staleTime: 60_000,
    });
    const funnelByStatus = useMemo(() => {
        const m = new Map<
            ProspectStatus,
            { delta: number; cycle: number | null }
        >();
        for (const s of funnelData?.stages ?? []) {
            m.set(s.status, { delta: s.delta_7d, cycle: s.avg_cycle_days });
        }
        return m;
    }, [funnelData]);

    /* ---------- mutations ---------- */
    const moveMutation = useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: ProspectStatus;
        }) => {
            const res = await fetch(`/api/prospects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error(String(res.status));
        },
        onSuccess: (_d, vars) => {
            queryClient.invalidateQueries({ queryKey: ['prospects-pipeline'] });
            const cfg = STATUS_CONFIG[vars.status];
            toast.success(`Déplacé vers ${cfg.label}`);
        },
        onError: () => toast.error('Impossible de mettre à jour le statut'),
    });

    const moveProspect = (id: string, status: ProspectStatus) => {
        moveMutation.mutate({ id, status });
        setPillMenu(null);
    };

    /* ---------- derived ---------- */
    const filtered = useMemo(() => {
        return items.filter((p) => {
            if (funnelFilter && p.status !== funnelFilter) return false;
            return true;
        });
    }, [items, funnelFilter]);

    const counts = useMemo(() => {
        const m: Record<ProspectStatus, number> = {
            new: 0,
            contacted: 0,
            qualified: 0,
            rdv: 0,
            proposal: 0,
            won: 0,
            lost: 0,
        };
        for (const p of items) {
            if (
                p.status &&
                (m as Record<string, number>)[p.status] !== undefined
            )
                m[p.status as ProspectStatus]++;
        }
        return m;
    }, [items]);

    const totalActive = items.filter(
        (p) => p.status !== 'lost' && p.status !== 'won'
    ).length;
    const conversionRate = items.length
        ? Math.round((counts.won / items.length) * 100)
        : 0;

    const avgCycleAcrossStages = useMemo(() => {
        const cycles = (funnelData?.stages ?? [])
            .map((s) => s.avg_cycle_days)
            .filter((v): v is number => v != null);
        if (cycles.length === 0) return null;
        return Math.round(cycles.reduce((s, v) => s + v, 0) / cycles.length);
    }, [funnelData]);

    const sortFn = (a: Prospect, b: Prospect) => {
        if (sortBy === 'alpha') {
            return (a.full_name ?? '').localeCompare(b.full_name ?? '');
        }
        if (sortBy === 'entry') {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
        }
        if (sortBy === 'silence') {
            const sa = parseSilence(lastActivityLabel(a));
            const sb = parseSilence(lastActivityLabel(b));
            return sb - sa;
        }
        // lastActivity
        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return tb - ta;
    };

    const onFunnelClick = (id: ProspectStatus) => {
        if (funnelFilter === id) {
            setFunnelFilter(null);
        } else {
            setFunnelFilter(id);
            // Collapse all but the targeted stage
            setCollapsed(
                new Set(
                    PIPELINE_ORDER.filter((s) => s !== id) as ProspectStatus[]
                )
            );
        }
    };

    const toggleCollapse = (id: ProspectStatus) => {
        setCollapsed((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const toggleSelect = (id: string) =>
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    const clearSelection = () => setSelected(new Set());

    return (
        <div className="relative">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-6">
                <div>
                    <p className="m-0 text-[12.5px] text-muted-foreground">
                        {totalActive} prospects actifs · Cycle moyen{' '}
                        <span className="font-medium text-foreground">
                            {avgCycleAcrossStages != null
                                ? `${avgCycleAcrossStages} jours`
                                : '—'}
                        </span>{' '}
                        par étape · Taux de conversion global :{' '}
                        <span className="font-medium text-foreground">
                            {conversionRate}%
                        </span>
                    </p>
                </div>
            </div>

            {/* Mini-funnel */}
            <div className="mb-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
                {PIPELINE_ORDER.map((id) => {
                    const cfg = STATUS_CONFIG[id];
                    const trend = funnelByStatus.get(id);
                    const delta = trend?.delta ?? 0;
                    const dir = trendDir(delta);
                    const isActive = funnelFilter === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onFunnelClick(id)}
                            className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                                isActive
                                    ? `${cfg.pill} border-current/50`
                                    : 'border-border bg-card hover:border-border/80'
                            }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                                />
                                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {cfg.label}
                                </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-1.5">
                                <span className="text-2xl font-medium leading-none tracking-tight text-foreground">
                                    {counts[id]}
                                </span>
                                <span
                                    className={`inline-flex items-center gap-0.5 text-[10.5px] font-medium ${
                                        dir === 'up'
                                            ? 'text-emerald-700'
                                            : dir === 'down'
                                              ? 'text-red-700'
                                              : 'text-muted-foreground'
                                    }`}
                                >
                                    {dir === 'up' && (
                                        <ArrowUp className="h-2 w-2" />
                                    )}
                                    {dir === 'down' && (
                                        <ArrowDown className="h-2 w-2" />
                                    )}
                                    {dir !== 'flat'
                                        ? `${delta > 0 ? '+' : ''}${delta}`
                                        : '—'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Funnel filter banner */}
            {funnelFilter && (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-1 text-xs">
                    Filtré sur{' '}
                    <strong className="font-semibold">
                        {STATUS_CONFIG[funnelFilter].label}
                    </strong>
                    <button
                        onClick={() => {
                            setFunnelFilter(null);
                            setCollapsed(new Set());
                        }}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-2.5 w-2.5" />
                    </button>
                </div>
            )}

            {/* Action bar */}
            <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
                <div className="flex w-[320px] max-w-full items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un prospect…"
                        className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <div className="relative">
                    <button
                        onClick={() => {
                            setFiltersOpen((o) => !o);
                            setSortOpen(false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium ${
                            filtersOpen ? 'bg-accent' : 'bg-card'
                        }`}
                    >
                        <Filter className="h-3 w-3" />
                        Filtres
                        {pipelineSourceFilter.length > 0 && (
                            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                                {pipelineSourceFilter.length}
                            </span>
                        )}
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                    {filtersOpen && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-lg border border-border bg-popover p-3 shadow-lg"
                        >
                            <div className="mb-2.5 flex items-center justify-between">
                                <span className="text-[13px] font-semibold">
                                    Filtres
                                </span>
                                <button
                                    onClick={() => setPipelineSourceFilter([])}
                                    className="text-[11.5px] font-medium text-blue-700"
                                >
                                    Tout effacer
                                </button>
                            </div>
                            <div>
                                <div className="mb-1 text-[11.5px] font-medium text-muted-foreground">
                                    Source
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {[
                                        {
                                            value: 'linkedin_extension',
                                            label: 'LinkedIn',
                                        },
                                        { value: 'csv', label: 'Import CSV' },
                                        {
                                            value: 'xlsx',
                                            label: 'Import Excel',
                                        },
                                        { value: 'manual', label: 'Manuel' },
                                        { value: 'booking', label: 'Booking' },
                                    ].map((opt) => {
                                        const active =
                                            pipelineSourceFilter.includes(
                                                opt.value
                                            );
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() =>
                                                    setPipelineSourceFilter(
                                                        (prev) =>
                                                            prev.includes(
                                                                opt.value
                                                            )
                                                                ? prev.filter(
                                                                      (v) =>
                                                                          v !==
                                                                          opt.value
                                                                  )
                                                                : [
                                                                      ...prev,
                                                                      opt.value,
                                                                  ]
                                                    )
                                                }
                                                className={`rounded-md px-2 py-1 text-[11.5px] ${
                                                    active
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-muted text-foreground/80 hover:bg-muted/70'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={() => setFiltersOpen(false)}
                                    className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button
                        onClick={() => {
                            setSortOpen((o) => !o);
                            setFiltersOpen(false);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-medium ${
                            sortOpen ? 'bg-accent' : 'bg-card'
                        }`}
                    >
                        <Layers className="h-3 w-3" />
                        Trier
                        <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                    {sortOpen && (
                        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[220px] rounded-lg border border-border bg-popover p-1.5 shadow-lg">
                            {(
                                [
                                    ['entry', 'Date d’entrée pipeline'],
                                    ['lastActivity', 'Dernière activité'],
                                    ['silence', 'Silence'],
                                    ['alpha', 'Alphabétique'],
                                ] as const
                            ).map(([id, label]) => (
                                <div
                                    key={id}
                                    onClick={() => {
                                        setSortBy(id);
                                        setSortOpen(false);
                                    }}
                                    className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-[12.5px] ${
                                        sortBy === id
                                            ? 'bg-accent font-semibold text-blue-700'
                                            : 'text-foreground hover:bg-accent/50'
                                    }`}
                                >
                                    {label}
                                    {sortBy === id && (
                                        <Check className="h-3 w-3" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex-1" />
                <div className="inline-flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
                    {(
                        [
                            ['grouped', 'Groupé', Layers],
                            ['list', 'Liste', ListIcon],
                        ] as const
                    ).map(([id, label, Icon]) => {
                        const active = groupMode === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setGroupMode(id)}
                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium ${
                                    active
                                        ? 'bg-blue-600 text-white'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                <Icon className="h-3 w-3" />
                                {label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 max-md:order-last max-md:w-full max-md:justify-center"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Nouveau prospect
                </button>
            </div>

            {/* Body */}
            {groupMode === 'grouped' ? (
                <div className="flex flex-col gap-2.5">
                    {(PIPELINE_ORDER as ProspectStatus[]).map((stageId) => {
                        if (funnelFilter && funnelFilter !== stageId)
                            return null;
                        const rows = filtered
                            .filter((p) => p.status === stageId)
                            .sort(sortFn);
                        const isCollapsed =
                            rows.length === 0 || collapsed.has(stageId);
                        return (
                            <PipelineSection
                                key={stageId}
                                stageId={stageId}
                                rows={rows}
                                totalInStage={counts[stageId]}
                                cycleDays={
                                    funnelByStatus.get(stageId)?.cycle ?? null
                                }
                                collapsed={isCollapsed}
                                isEmpty={rows.length === 0}
                                onToggle={() => toggleCollapse(stageId)}
                                onOpenProspect={(p) =>
                                    router.push(`/prospect/${p.id}`)
                                }
                                onMove={moveProspect}
                                rowMenuItems={rowActions.menu}
                                pillMenu={pillMenu}
                                setPillMenu={setPillMenu}
                                rowMenu={rowMenu}
                                setRowMenu={setRowMenu}
                                hoverRow={hoverRow}
                                setHoverRow={setHoverRow}
                                selected={selected}
                                toggleSelect={toggleSelect}
                            />
                        );
                    })}
                </div>
            ) : (
                <ContinuousList
                    rows={filtered.slice().sort(sortFn)}
                    onOpenProspect={(p) => router.push(`/prospect/${p.id}`)}
                    onMove={moveProspect}
                    rowMenuItems={rowActions.menu}
                    pillMenu={pillMenu}
                    setPillMenu={setPillMenu}
                    rowMenu={rowMenu}
                    setRowMenu={setRowMenu}
                    hoverRow={hoverRow}
                    setHoverRow={setHoverRow}
                    selected={selected}
                    toggleSelect={toggleSelect}
                />
            )}

            {filtered.length === 0 && (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-12 text-center">
                    <div className="text-sm font-medium text-foreground">
                        Aucun prospect trouvé
                    </div>
                    <div className="mt-1 text-[12.5px] text-muted-foreground">
                        {search
                            ? `Aucun résultat pour « ${search} »`
                            : 'Ajustez les filtres pour voir plus de prospects'}
                    </div>
                </div>
            )}

            {/* Bulk action bar (sticky bottom) */}
            {selected.size > 0 && (
                <BulkBar
                    count={selected.size}
                    onClear={clearSelection}
                    onMove={(st) => {
                        [...selected].forEach((pid) => moveProspect(pid, st));
                        clearSelection();
                    }}
                />
            )}

            {(pillMenu || rowMenu || filtersOpen || sortOpen) && (
                <div
                    onClick={() => {
                        setPillMenu(null);
                        setRowMenu(null);
                        setFiltersOpen(false);
                        setSortOpen(false);
                    }}
                    className="fixed inset-0 z-5"
                />
            )}

            <ProspectCreateDialog
                open={showCreate}
                onOpenChange={setShowCreate}
            />
            {rowActions.dialogs}
        </div>
    );
}

function parseSilence(label: string): number {
    const m = /silence\s+(\d+)/i.exec(label);
    return m ? parseInt(m[1], 10) : 0;
}

/* ============================================================
   Section + Continuous List
   ============================================================ */

interface SectionProps {
    stageId: ProspectStatus;
    rows: Prospect[];
    totalInStage: number;
    cycleDays: number | null;
    collapsed: boolean;
    isEmpty: boolean;
    onToggle: () => void;
    onOpenProspect: (p: Prospect) => void;
    onMove: (id: string, status: ProspectStatus) => void;
    rowMenuItems: (p: Prospect) => ProspectMenuItem[];
    pillMenu: string | null;
    setPillMenu: (id: string | null) => void;
    rowMenu: string | null;
    setRowMenu: (id: string | null) => void;
    hoverRow: string | null;
    setHoverRow: (id: string | null) => void;
    selected: Set<string>;
    toggleSelect: (id: string) => void;
}

function PipelineSection(p: SectionProps) {
    const cfg = STATUS_CONFIG[p.stageId];
    return (
        <div
            className={`overflow-visible rounded-xl border border-border bg-card ${p.isEmpty ? 'opacity-70' : ''}`}
        >
            <button
                onClick={p.onToggle}
                className={`flex w-full items-center gap-2.5 px-4 py-3 text-left ${!p.collapsed ? 'border-b border-border/60' : ''}`}
            >
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                <span
                    className={`text-[13.5px] font-semibold ${p.isEmpty ? 'text-muted-foreground' : ''}`}
                >
                    {cfg.label}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                    ({p.totalInStage} prospect{p.totalInStage > 1 ? 's' : ''})
                </span>
                <span className="ml-1.5 text-[11.5px] text-muted-foreground/80">
                    {p.cycleDays != null
                        ? `Cycle moyen : ${p.cycleDays}j`
                        : 'Cycle moyen : —'}
                </span>
                <span className="flex-1" />
                <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform ${p.collapsed ? '-rotate-90' : ''}`}
                />
            </button>
            {!p.collapsed && p.rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] table-fixed border-collapse">
                        <colgroup>
                            <col className="w-9" />
                            <col />
                            <col className="w-[130px]" />
                            <col className="w-[110px]" />
                            <col className="w-[150px]" />
                            <col className="w-[140px]" />
                            <col className="w-[90px]" />
                            <col className="w-[110px]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b border-border/60 bg-muted/30">
                                <Th />
                                <Th>Prospect</Th>
                                <Th>Étape</Th>
                                <Th>Source</Th>
                                <Th>Activité</Th>
                                <Th>Workflow</Th>
                                <Th>Canaux</Th>
                                <Th />
                            </tr>
                        </thead>
                        <tbody>
                            {p.rows.map((row) => (
                                <PipelineRow
                                    key={row.id}
                                    p={row}
                                    onOpenProspect={p.onOpenProspect}
                                    onMove={p.onMove}
                                    rowMenuItems={p.rowMenuItems}
                                    pillMenu={p.pillMenu}
                                    setPillMenu={p.setPillMenu}
                                    rowMenu={p.rowMenu}
                                    setRowMenu={p.setRowMenu}
                                    hoverRow={p.hoverRow}
                                    setHoverRow={p.setHoverRow}
                                    selected={p.selected}
                                    toggleSelect={p.toggleSelect}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function ContinuousList({
    rows,
    ...rest
}: {
    rows: Prospect[];
    onOpenProspect: (p: Prospect) => void;
    onMove: (id: string, status: ProspectStatus) => void;
    rowMenuItems: (p: Prospect) => ProspectMenuItem[];
    pillMenu: string | null;
    setPillMenu: (id: string | null) => void;
    rowMenu: string | null;
    setRowMenu: (id: string | null) => void;
    hoverRow: string | null;
    setHoverRow: (id: string | null) => void;
    selected: Set<string>;
    toggleSelect: (id: string) => void;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[860px] table-fixed border-collapse">
                <colgroup>
                    <col className="w-9" />
                    <col />
                    <col className="w-[130px]" />
                    <col className="w-[110px]" />
                    <col className="w-[150px]" />
                    <col className="w-[140px]" />
                    <col className="w-[90px]" />
                    <col className="w-[110px]" />
                </colgroup>
                <thead>
                    <tr className="border-b border-border bg-muted/40">
                        <Th />
                        <Th>Prospect</Th>
                        <Th>Étape</Th>
                        <Th>Source</Th>
                        <Th>Activité</Th>
                        <Th>Workflow</Th>
                        <Th>Canaux</Th>
                        <Th />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => (
                        <PipelineRow key={p.id} p={p} {...rest} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Th({ children }: { children?: React.ReactNode }) {
    return (
        <th className="px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </th>
    );
}

/* ============================================================
   Pipeline row — used by both Section and ContinuousList
   ============================================================ */

interface PipelineRowProps {
    p: Prospect;
    onOpenProspect: (p: Prospect) => void;
    onMove: (id: string, status: ProspectStatus) => void;
    rowMenuItems: (p: Prospect) => ProspectMenuItem[];
    pillMenu: string | null;
    setPillMenu: (id: string | null) => void;
    rowMenu: string | null;
    setRowMenu: (id: string | null) => void;
    hoverRow: string | null;
    setHoverRow: (id: string | null) => void;
    selected: Set<string>;
    toggleSelect: (id: string) => void;
}

function PipelineRow({
    p,
    onOpenProspect,
    onMove,
    rowMenuItems,
    pillMenu,
    setPillMenu,
    rowMenu,
    setRowMenu,
    hoverRow,
    setHoverRow,
    selected,
    toggleSelect,
}: PipelineRowProps) {
    const activityLabel = lastActivityLabel(p);
    const tier = silenceTier(activityLabel);
    const tCls = silenceTierClasses(tier);
    const isPillOpen = pillMenu === p.id;
    const isMenuOpen = rowMenu === p.id;
    const isHovered = hoverRow === p.id;
    const channels = channelKindsFor(p);

    return (
        <tr
            onMouseEnter={() => setHoverRow(p.id)}
            onMouseLeave={() => setHoverRow(null)}
            onClick={(e) => {
                if (
                    (e.target as HTMLElement).closest(
                        'input,button,a,[data-stop]'
                    )
                )
                    return;
                onOpenProspect(p);
            }}
            className={`cursor-pointer border-b border-border/60 ${isHovered ? 'bg-muted/30' : ''}`}
        >
            <td className="px-3 py-2.5 align-middle">
                <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    data-stop
                    className="accent-blue-600"
                />
            </td>
            <td className="px-3 py-2.5 align-middle">
                <div className="flex min-w-0 items-center gap-2.5">
                    <NameAvatar
                        name={p.full_name ?? '?'}
                        size={32}
                        photo={prospectPhotoFromEnrichment(p)}
                    />
                    <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium leading-tight">
                            {p.full_name ?? 'Sans nom'}
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                            {p.company ? (
                                <strong className="font-medium">
                                    {p.company}
                                </strong>
                            ) : (
                                <span className="text-muted-foreground/60">
                                    Sans société
                                </span>
                            )}
                            {p.job_title ? ` · ${p.job_title}` : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2.5 align-middle">
                <div data-stop className="relative inline-block">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setPillMenu(isPillOpen ? null : p.id);
                            setRowMenu(null);
                        }}
                        className="inline-flex items-center gap-1 border-none bg-transparent p-0"
                    >
                        <StatusPill status={p.status} />
                        <ChevronDown className="h-2 w-2 text-muted-foreground" />
                    </button>
                    {isPillOpen && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-[calc(100%+4px)] z-25 w-[180px] rounded-xl border border-border bg-popover p-1 shadow-lg"
                        >
                            <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Déplacer vers
                            </div>
                            {(PIPELINE_ORDER as ProspectStatus[]).map(
                                (stId) => {
                                    const cfg = STATUS_CONFIG[stId];
                                    const active = p.status === stId;
                                    return (
                                        <div
                                            key={stId}
                                            onClick={() => onMove(p.id, stId)}
                                            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] ${
                                                active
                                                    ? 'bg-accent font-semibold'
                                                    : 'hover:bg-accent/50'
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                                            />
                                            <span>{cfg.label}</span>
                                            {active && (
                                                <Check className="ml-auto h-3 w-3 text-blue-700" />
                                            )}
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-3 py-2.5 align-middle">
                <SourcePill source={p.source} />
            </td>
            <td className="px-3 py-2.5 align-middle">
                {tier ? (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${tCls.bg} ${tCls.text}`}
                    >
                        <span className={`h-1 w-1 rounded-full ${tCls.dot}`} />
                        {activityLabel}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        {activityLabel}
                    </span>
                )}
            </td>
            <td className="px-3 py-2.5 align-middle">
                {p.workflow ? (
                    <div className="flex items-center gap-1.5">
                        <Play className="h-2.5 w-2.5 text-violet-700 dark:text-violet-300" />
                        <span
                            className="min-w-0 truncate text-[11.5px] text-foreground/80"
                            title={p.workflow.name}
                        >
                            {p.workflow.name}
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                            {p.workflow.step}/{p.workflow.total}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                )}
            </td>
            <td className="px-3 py-2.5 align-middle">
                <div data-stop className="flex gap-0.5">
                    {channels.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground/50">
                            —
                        </span>
                    ) : (
                        channels.map((c) => (
                            <ChannelTooltipDot key={c} kind={c} size={22} />
                        ))
                    )}
                </div>
            </td>
            <td className="relative px-3 py-2.5 text-right align-middle">
                <div data-stop className="inline-flex items-center justify-end">
                    {(isHovered || isMenuOpen) && (
                        <>
                            <GhostBtn
                                title="Conversation"
                                onClick={() => onOpenProspect(p)}
                            >
                                <MessageSquare className="h-3 w-3" />
                            </GhostBtn>
                            <GhostBtn
                                title="RDV"
                                onClick={() => onOpenProspect(p)}
                            >
                                <Calendar className="h-3 w-3" />
                            </GhostBtn>
                        </>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setRowMenu(isMenuOpen ? null : p.id);
                            setPillMenu(null);
                        }}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded ${
                            isMenuOpen ? 'bg-accent' : ''
                        } text-muted-foreground hover:bg-accent`}
                    >
                        <MoreVertical className="h-3 w-3" />
                    </button>
                </div>
                {isMenuOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-3 top-9 z-25 w-[220px] rounded-xl border border-border bg-popover p-1 text-left shadow-lg"
                    >
                        {rowMenuItems(p).map((it, i, arr) => (
                            <div key={it.label}>
                                {it.destructive &&
                                    i > 0 &&
                                    !arr[i - 1].destructive && (
                                        <div className="my-1 h-px bg-border" />
                                    )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!it.disabled) {
                                            it.onClick();
                                            setRowMenu(null);
                                        }
                                    }}
                                    disabled={it.disabled}
                                    className={`block w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-accent ${
                                        it.destructive ? 'text-destructive' : ''
                                    } ${it.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                                >
                                    {it.label}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </td>
        </tr>
    );
}

function GhostBtn({
    title,
    onClick,
    children,
}: {
    title: string;
    onClick?: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            title={title}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent"
        >
            {children}
        </button>
    );
}

/* ============================================================
   Bulk action bar
   ============================================================ */

function BulkBar({
    count,
    onClear,
    onMove,
}: {
    count: number;
    onClear: () => void;
    onMove: (status: ProspectStatus) => void;
}) {
    const [moveOpen, setMoveOpen] = useState(false);
    return (
        <div className="sticky bottom-4 z-40 mt-4 flex items-center gap-3.5 rounded-xl bg-foreground px-3.5 py-2.5 text-background shadow-2xl">
            <span className="text-[13px] font-medium">
                {count} prospect{count > 1 ? 's' : ''} sélectionné
                {count > 1 ? 's' : ''}
            </span>
            <button
                onClick={onClear}
                className="text-xs text-foreground/60 hover:text-foreground/80"
            >
                Tout désélectionner
            </button>
            <span className="flex-1" />
            <div className="relative">
                <button
                    onClick={() => setMoveOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-foreground/30 px-2.5 py-1 text-xs font-medium"
                >
                    <ArrowRight className="h-2.5 w-2.5" />
                    Changer le statut
                </button>
                {moveOpen && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-[200px] rounded-xl border border-border bg-popover p-1 text-foreground shadow-lg"
                    >
                        {(PIPELINE_ORDER as ProspectStatus[]).map((stId) => {
                            const cfg = STATUS_CONFIG[stId];
                            return (
                                <div
                                    key={stId}
                                    onClick={() => {
                                        onMove(stId);
                                        setMoveOpen(false);
                                    }}
                                    className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] hover:bg-accent"
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                                    />
                                    {cfg.label}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <BulkBtn className="text-red-300" onClick={() => onMove('lost')}>
                Marquer perdus
            </BulkBtn>
        </div>
    );
}

function BulkBtn({
    children,
    className = '',
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`rounded-md border border-foreground/30 px-2.5 py-1 text-xs font-medium hover:bg-foreground/10 ${className}`}
        >
            {children}
        </button>
    );
}
