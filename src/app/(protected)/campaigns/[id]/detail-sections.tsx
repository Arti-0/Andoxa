'use client';

/**
 * Campaign detail page sections — faithful port of the design files
 * (campaign-kpi-funnel / campaign-chart / campaign-message / campaign-prospects
 * / campaign-activity), wired to the live job-detail query.
 *
 * Data caveat: the live API returns aggregate counts + per-prospect status
 * rows, but NOT a per-day time-series or a discrete event log. So:
 *   • The KPI funnel, message preview and prospects table use live data.
 *   • The time-series chart and activity timeline render an explicit
 *     "temps réel à venir" placeholder until the backend timeline/events
 *     endpoint exists (see #45).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowUp,
    AlertTriangle,
    ChevronRight,
    ChevronDown,
    Download,
    Eye,
    Info,
    Search,
    LineChart,
    Clock,
    X,
    MoreVertical,
    ExternalLink,
    MessageSquare,
    Paperclip,
} from 'lucide-react';
import type { CampaignAttachment } from '@/lib/campaigns/types';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { ProgressBar } from '../primitives';
import type { Campaign, CampaignType } from '../data';
import type {
    CampaignJobProspectRow,
    CampaignTimelineSeriesPoint,
    CampaignTimelineEvent,
} from '../queries';

/* ============================================================
   KPI FUNNEL — stops at prospect reply (per design)
   ============================================================ */

type Tier = 'good' | 'neutral' | 'bad';
const TIER_COLORS: Record<Tier, string> = {
    good: '#0E7A3A',
    neutral: 'var(--muted-foreground)',
    bad: '#A8221C',
};

function rateTier(rate: number, goodAt: number, badBelow: number): Tier {
    if (rate >= goodAt) return 'good';
    if (rate < badBelow) return 'bad';
    return 'neutral';
}

interface FunnelStepData {
    key: string;
    big: number;
    total?: number;
    label: string;
    sub: string;
    tier?: Tier;
    tip: string;
    showProgress?: boolean;
    color: string;
}

function getFunnelSteps(c: Campaign): FunnelStepData[] {
    const sent = c.processed;
    const pct = (n: number, d: number) =>
        d > 0 ? Math.round((n / d) * 100) : 0;

    if (c.type === 'invitation') {
        return [
            {
                key: 'sent',
                big: sent,
                total: c.total,
                label: 'Invitations envoyées',
                sub: '',
                tip: 'Invitations LinkedIn envoyées depuis le lancement.',
                showProgress: true,
                color: '#0052D9',
            },
            {
                key: 'accepted',
                big: c.accepted,
                label: 'Acceptées',
                sub: `${pct(c.accepted, sent)}% d'acceptation`,
                tier: rateTier(sent ? c.accepted / sent : 0, 0.3, 0.15),
                tip: 'Invitations acceptées. Moyenne LinkedIn : 25–35%.',
                color: '#0A66C2',
            },
        ];
    }
    if (c.type === 'message' || c.type === 'whatsapp_message') {
        return [
            {
                key: 'sent',
                big: sent,
                total: c.total,
                label: 'Messages envoyés',
                sub: '',
                tip: 'Messages envoyés aux relations 1er degré.',
                showProgress: true,
                color: '#0052D9',
            },
            {
                key: 'replied',
                big: c.replied,
                label: 'Réponses reçues',
                sub: `${pct(c.replied, sent)}% de réponse`,
                tier: rateTier(sent ? c.replied / sent : 0, 0.3, 0.15),
                tip: 'Prospects ayant répondu. Traitez les réponses dans la Messagerie.',
                color: '#7C3AED',
            },
        ];
    }
    // invitation_message
    return [
        {
            key: 'sent',
            big: sent,
            total: c.total,
            label: 'Invitations envoyées',
            sub: `sur ${c.total} (${pct(sent, c.total)}% du carnet)`,
            tip: 'Invitations LinkedIn envoyées en début de séquence.',
            showProgress: true,
            color: '#0052D9',
        },
        {
            key: 'accepted',
            big: c.accepted,
            label: 'Acceptées',
            sub: `${pct(c.accepted, sent)}% d'acceptation`,
            tier: rateTier(sent ? c.accepted / sent : 0, 0.3, 0.15),
            tip: 'Invitations acceptées. Moyenne LinkedIn : 25–35%.',
            color: '#0A66C2',
        },
        {
            key: 'replied',
            big: c.replied,
            label: 'Réponses au message',
            sub: `${pct(c.replied, c.accepted)}% sur acceptées`,
            tier: rateTier(c.accepted ? c.replied / c.accepted : 0, 0.2, 0.1),
            tip: 'Prospects ayant répondu au message de relance automatique.',
            color: '#7C3AED',
        },
    ];
}

// Each funnel step is rendered as a stat card (mirrors the KpiCard design on
// the campaigns list): label + optional info tooltip, a large value, then the
// conversion sub-line. The lead step keeps a progress bar ("% du carnet").
function FunnelStep({ step }: { step: FunnelStepData }) {
    const tierColor = step.tier ? TIER_COLORS[step.tier] : null;
    const valuePct = step.total ? (step.big / step.total) * 100 : null;
    return (
        <div className="relative flex min-w-0 flex-1 flex-col rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/20">
            <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] font-medium text-muted-foreground">
                    {step.label}
                </span>
                {/* Info tooltip only when the step has extra context to surface. */}
                {step.tip && (
                    <span
                        title={step.tip}
                        className="shrink-0 cursor-help text-muted-foreground/60"
                    >
                        <Info className="size-3" />
                    </span>
                )}
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
                    {step.big.toLocaleString('fr-FR')}
                </span>
                {step.total != null && (
                    <span className="text-lg font-medium text-muted-foreground tabular-nums">
                        / {step.total}
                    </span>
                )}
            </div>
            {step.sub && (
                <div
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: tierColor ?? 'var(--muted-foreground)' }}
                >
                    {step.tier === 'good' && <ArrowUp className="size-3" />}
                    {step.tier === 'bad' && (
                        <AlertTriangle className="size-3" />
                    )}
                    {step.sub}
                </div>
            )}
            {step.showProgress && (
                <div className="mt-auto flex flex-col gap-1 pt-3">
                    <ProgressBar
                        value={step.big}
                        max={step.total ?? 1}
                        color={step.color}
                        height={5}
                    />
                    <span className="text-[10.5px] text-muted-foreground tabular-nums">
                        {valuePct?.toFixed(0)}% du carnet traité
                    </span>
                </div>
            )}
        </div>
    );
}

export function CampaignKpiFunnel({
    campaign,
    isLive,
}: {
    campaign: Campaign;
    isLive: boolean;
}) {
    const steps = useMemo(() => getFunnelSteps(campaign), [campaign]);
    return (
        <section>
            <div className="mb-2.5 flex items-center justify-between">
                <h2 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Funnel de conversion
                </h2>
                {isLive && (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                        mise à jour automatique
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                {steps.map((s) => (
                    <FunnelStep key={s.key} step={s} />
                ))}
            </div>
        </section>
    );
}

/* ============================================================
   TIME-SERIES CHART — SVG line chart over the daily series
   ============================================================ */

interface SeriesDef {
    key: keyof Omit<CampaignTimelineSeriesPoint, 'date'>;
    label: string;
    color: string;
}

const MAIN_COLORS = {
    one: 'var(--main-1)',
    two: 'var(--main-2)',
    three: 'var(--main-3)',
    four: 'var(--main-4)',
    five: 'var(--main-5)',
} as const;

function seriesDefsFor(type: CampaignType): SeriesDef[] {
    if (type === 'invitation') {
        return [
            { key: 'sent', label: 'Envoyées', color: MAIN_COLORS.one },
            { key: 'accepted', label: 'Acceptées', color: MAIN_COLORS.three },
        ];
    }
    if (type === 'invitation_message') {
        return [
            { key: 'sent', label: 'Invitations', color: MAIN_COLORS.one },
            { key: 'accepted', label: 'Acceptées', color: MAIN_COLORS.three },
            { key: 'replied', label: 'Réponses', color: MAIN_COLORS.four },
        ];
    }
    return [
        { key: 'sent', label: 'Envoyés', color: MAIN_COLORS.one },
        { key: 'replied', label: 'Réponses', color: MAIN_COLORS.four },
    ];
}

function formatTimelineSeriesValue(
    point: CampaignTimelineSeriesPoint,
    key: keyof Omit<CampaignTimelineSeriesPoint, 'date'>
): string {
    if (key === 'accepted') {
        const sent = point.sent;
        const rate = sent > 0 ? Math.round((point.accepted / sent) * 100) : 0;
        return `${rate}%`;
    }
    return point[key].toLocaleString('fr-FR');
}

function frShortDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    const months = [
        'janv',
        'févr',
        'mars',
        'avr',
        'mai',
        'juin',
        'juil',
        'août',
        'sept',
        'oct',
        'nov',
        'déc',
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

function CampaignChart({
    type,
    series,
    loading,
    selectedDate,
    onSelectDate,
}: {
    type: CampaignType;
    series: CampaignTimelineSeriesPoint[];
    loading: boolean;
    /** YYYY-MM-DD currently filtering the prospects table, or null. */
    selectedDate?: string | null;
    /** Clicking a day on the chart toggles the table filter for that day. */
    onSelectDate?: (date: string) => void;
}) {
    const defs = useMemo(() => seriesDefsFor(type), [type]);
    const [cumulative, setCumulative] = useState(false);
    const [hover, setHover] = useState<number | null>(null);

    // Measure the real rendered width so the SVG draws 1:1. The chart used a
    // fixed 900-wide viewBox stretched with preserveAspectRatio="none", which
    // distorted the line slopes, axis labels and point markers horizontally.
    const wrapRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(900);
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width;
            if (w && w > 0) setWidth(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const plotted = useMemo(() => {
        if (!cumulative) return series;
        const acc: Record<string, number> = {};
        return series.map((pt) => {
            const next = { ...pt };
            for (const d of defs) {
                acc[d.key] = (acc[d.key] ?? 0) + pt[d.key];
                next[d.key] = acc[d.key];
            }
            return next;
        });
    }, [series, cumulative, defs]);

    const W = width;
    const H = 240;
    const padL = 36;
    const padR = 14;
    const padT = 14;
    const padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const maxY = Math.max(
        1,
        ...plotted.flatMap((pt) => defs.map((d) => pt[d.key]))
    );
    const niceMax = Math.ceil(maxY / 5) * 5 || 5;
    const n = plotted.length;
    const xFor = (i: number) =>
        padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yFor = (v: number) => padT + innerH - (v / niceMax) * innerH;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));

    const xTickIdx = useMemo(() => {
        if (n === 0) return [];
        const step = Math.max(1, Math.floor(n / 6));
        return plotted
            .map((_, i) => i)
            .filter((i) => i % step === 0 || i === n - 1);
    }, [plotted, n]);

    const hasData = series.some((pt) => defs.some((d) => pt[d.key] > 0));
    const selIdx =
        selectedDate != null
            ? plotted.findIndex((p) => p.date === selectedDate)
            : -1;
    // Tooltip follows the hovered day, else the pinned/selected one.
    const tipIdx = hover ?? (selIdx >= 0 ? selIdx : null);
    const idxFromClientX = (clientX: number, rect: DOMRect) => {
        const x = ((clientX - rect.left) / rect.width) * W;
        const ratio = Math.max(0, Math.min(1, (x - padL) / innerW));
        return Math.round(ratio * (n - 1));
    };

    return (
        <section>
            <div className="rounded-xl border bg-card p-[18px]">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="m-0 text-[15px] font-semibold tracking-tight">
                            Évolution dans le temps
                        </h3>
                        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                            {series.length} jour{series.length > 1 ? 's' : ''} ·{' '}
                            {cumulative ? 'Cumulé' : 'Quotidien'}
                        </p>
                    </div>
                    <div className="inline-flex rounded-lg bg-muted p-0.5">
                        {[
                            {
                                v: false,
                                label: 'Quotidien',
                                color: MAIN_COLORS.one,
                            },
                            {
                                v: true,
                                label: 'Cumulé',
                                color: MAIN_COLORS.two,
                            },
                        ].map((o) => (
                            <button
                                key={String(o.v)}
                                onClick={() => setCumulative(o.v)}
                                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                                    cumulative === o.v
                                        ? 'bg-background shadow-sm'
                                        : 'text-muted-foreground hover:bg-background/60'
                                }`}
                                style={{
                                    color:
                                        cumulative === o.v ? o.color : o.color,
                                    backgroundColor:
                                        cumulative === o.v
                                            ? 'color-mix(in srgb, currentColor 14%, transparent)'
                                            : 'transparent',
                                    boxShadow:
                                        cumulative === o.v
                                            ? `inset 0 0 0 1px color-mix(in srgb, ${o.color} 22%, transparent)`
                                            : 'none',
                                }}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    {defs.map((d) => (
                        <span
                            key={d.key}
                            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
                        >
                            <span
                                className="size-2 rounded-full"
                                style={{ background: d.color }}
                            />
                            {d.label}
                        </span>
                    ))}
                </div>

                {loading && series.length === 0 ? (
                    <div className="h-[240px] animate-pulse rounded-lg bg-muted/40" />
                ) : !hasData ? (
                    <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-center">
                        <LineChart className="size-6 text-muted-foreground/60" />
                        <div className="text-[13px] font-medium">
                            Pas encore d&apos;activité
                        </div>
                        <div className="max-w-sm text-[12px] text-muted-foreground">
                            Les envois et réponses apparaîtront ici jour après
                            jour.
                        </div>
                    </div>
                ) : (
                    <div
                        className="relative"
                        ref={wrapRef}
                        onMouseLeave={() => setHover(null)}
                    >
                        <svg
                            viewBox={`0 0 ${W} ${H}`}
                            width={W}
                            height={H}
                            className={`block w-full ${onSelectDate ? 'cursor-pointer' : ''}`}
                            style={{ height: H }}
                            onMouseMove={(e) => {
                                const rect =
                                    e.currentTarget.getBoundingClientRect();
                                setHover(idxFromClientX(e.clientX, rect));
                            }}
                            onClick={(e) => {
                                if (!onSelectDate || n === 0) return;
                                const rect =
                                    e.currentTarget.getBoundingClientRect();
                                const i = idxFromClientX(e.clientX, rect);
                                if (plotted[i]) onSelectDate(plotted[i].date);
                            }}
                        >
                            {yTicks.map((tv, i) => (
                                <g key={i}>
                                    <line
                                        x1={padL}
                                        x2={padL + innerW}
                                        y1={yFor(tv)}
                                        y2={yFor(tv)}
                                        stroke="var(--border)"
                                        strokeDasharray={i === 0 ? '0' : '3 3'}
                                    />
                                    <text
                                        x={padL - 6}
                                        y={yFor(tv) + 3}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill="var(--muted-foreground)"
                                    >
                                        {tv}
                                    </text>
                                </g>
                            ))}
                            {xTickIdx.map((i) => (
                                <text
                                    key={i}
                                    x={xFor(i)}
                                    y={H - 8}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="var(--muted-foreground)"
                                >
                                    {frShortDate(plotted[i].date)}
                                </text>
                            ))}
                            {defs.map((d) => {
                                const pts = plotted.map(
                                    (pt, i) =>
                                        [xFor(i), yFor(pt[d.key])] as const
                                );
                                const line =
                                    'M' +
                                    pts.map((p) => p.join(',')).join(' L');
                                return (
                                    <path
                                        key={d.key}
                                        d={line}
                                        fill="none"
                                        stroke={d.color}
                                        strokeWidth={2}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}
                            {/* Selected day — persistent solid marker driving the table filter */}
                            {selIdx >= 0 && plotted[selIdx] && (
                                <line
                                    x1={xFor(selIdx)}
                                    x2={xFor(selIdx)}
                                    y1={padT}
                                    y2={padT + innerH}
                                    stroke={MAIN_COLORS.one}
                                    strokeWidth={1.5}
                                />
                            )}
                            {/* Hover crosshair (dashed) */}
                            {hover != null &&
                                hover !== selIdx &&
                                plotted[hover] && (
                                    <line
                                        x1={xFor(hover)}
                                        x2={xFor(hover)}
                                        y1={padT}
                                        y2={padT + innerH}
                                        stroke="var(--border)"
                                        strokeDasharray="3 3"
                                    />
                                )}
                            {/* Point markers on the active day */}
                            {tipIdx != null &&
                                plotted[tipIdx] &&
                                defs.map((d) => (
                                    <circle
                                        key={d.key}
                                        cx={xFor(tipIdx)}
                                        cy={yFor(plotted[tipIdx][d.key])}
                                        r={3.5}
                                        fill="var(--background)"
                                        stroke={d.color}
                                        strokeWidth={2}
                                    />
                                ))}
                        </svg>
                        {tipIdx != null && plotted[tipIdx] && (
                            <div
                                className="pointer-events-none absolute top-2 rounded-lg border bg-popover px-2.5 py-2 text-[12px] shadow-lg"
                                style={{
                                    left: `min(calc(100% - 170px), max(0px, ${(xFor(tipIdx) / W) * 100}%))`,
                                    minWidth: 150,
                                }}
                            >
                                <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px] font-semibold">
                                    <span>
                                        {frShortDate(plotted[tipIdx].date)}
                                    </span>
                                    {tipIdx === selIdx && (
                                        <span
                                            className="rounded px-1.5 py-px text-[10px] font-semibold"
                                            style={{
                                                backgroundColor:
                                                    'color-mix(in srgb, var(--main-5) 12%, transparent)',
                                                color: 'var(--main-5, #0052D9)',
                                            }}
                                        >
                                            Filtré
                                        </span>
                                    )}
                                </div>
                                {defs.map((d) => (
                                    <div
                                        key={d.key}
                                        className="flex items-center gap-1.5 py-px"
                                    >
                                        <span
                                            className="size-2 rounded-full"
                                            style={{ background: d.color }}
                                        />
                                        <span className="flex-1 text-muted-foreground">
                                            {d.label}
                                        </span>
                                        <strong className="tabular-nums">
                                            {formatTimelineSeriesValue(
                                                plotted[tipIdx],
                                                d.key
                                            )}
                                        </strong>
                                    </div>
                                ))}
                                {onSelectDate && (
                                    <div className="mt-1 border-t pt-1 text-[10.5px] text-muted-foreground">
                                        {tipIdx === selIdx
                                            ? 'Cliquez pour retirer le filtre'
                                            : 'Cliquez pour filtrer les prospects'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

export { CampaignChart };

/* ============================================================
   MESSAGE PREVIEW — collapsible, read-only template
   ============================================================ */

function renderWithPills(text: string) {
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((p, i) =>
        /^\{\{[^}]+\}\}$/.test(p) ? (
            <span
                key={i}
                className="rounded bg-[var(--brand-blue-tint)] px-1.5 py-px font-mono text-[12px] font-medium text-[var(--brand-blue-dark,#003EA3)]"
            >
                {p}
            </span>
        ) : (
            <span key={i}>{p}</span>
        )
    );
}

function formatAttachmentSize(bytes: number): string {
    if (bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function CampaignMessageCard({
    type,
    template,
    attachment,
}: {
    type: CampaignType;
    template: string | null;
    attachment?: CampaignAttachment | null;
}) {
    const [open, setOpen] = useState(false);
    const isInvitation = type === 'invitation';
    const hasBody = !!template?.trim();
    const max = isInvitation ? 300 : 2000;

    return (
        <section>
            <div className="overflow-hidden rounded-xl border bg-card">
                <button
                    onClick={() => setOpen((o) => !o)}
                    className="flex w-full items-center gap-3 px-[18px] py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                    <ChevronRight
                        className="size-4 text-muted-foreground transition-transform"
                        style={{ transform: open ? 'rotate(90deg)' : 'none' }}
                    />
                    <span className="flex-1">
                        <div className="text-[14.5px] font-semibold">
                            Contenu de la campagne
                        </div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">
                            {open
                                ? 'Cliquez pour replier'
                                : 'Voir le message envoyé aux prospects'}
                        </div>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                        <Eye className="size-3" /> Lecture seule
                    </span>
                </button>
                {open && (
                    <div className="border-t px-[18px] pb-[18px] pt-3">
                        {isInvitation && !hasBody ? (
                            <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-[13px] text-muted-foreground">
                                Demande de connexion sans note — aucun message
                                d&apos;accompagnement.
                            </div>
                        ) : (
                            <div>
                                <div className="mb-1.5 flex items-baseline justify-between">
                                    <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {isInvitation
                                            ? "Note d'invitation"
                                            : 'Message'}
                                    </div>
                                    <div
                                        className={`text-[11.5px] tabular-nums ${
                                            (template?.length ?? 0) > max
                                                ? 'text-destructive'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        {template?.length ?? 0} / {max}{' '}
                                        caractères
                                    </div>
                                </div>
                                <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 px-4 py-3.5 text-sm leading-relaxed">
                                    {hasBody ? renderWithPills(template!) : '—'}
                                </div>
                            </div>
                        )}
                        {attachment ? (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                                <span className="truncate text-[13px] font-medium">
                                    {attachment.name}
                                </span>
                                {attachment.size > 0 ? (
                                    <span className="ml-auto shrink-0 text-[11.5px] text-muted-foreground">
                                        {formatAttachmentSize(attachment.size)}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-[#C7DBF7] bg-[var(--brand-blue-tint)] px-3 py-2.5 text-[12.5px] text-[var(--brand-blue-dark,#003EA3)]">
                            <Info className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                                Le message ne peut plus être modifié une fois la
                                campagne lancée. Dupliquez cette campagne pour
                                utiliser un autre message.
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   PROSPECTS TABLE — search + status filter + pagination
   ============================================================ */

const PROSPECT_STATUS_META: Record<
    string,
    { label: string; bg: string; fg: string; dot: string }
> = {
    pending: {
        label: 'En attente',
        bg: '#F8F9FA',
        fg: '#7C8493',
        dot: '#C7CCD3',
    },
    processing: {
        label: 'En cours',
        bg: '#E8F0FD',
        fg: '#003EA3',
        dot: '#0052D9',
    },
    success: { label: 'Traité', bg: '#E8F4EC', fg: '#0E7A3A', dot: '#16A34A' },
    error: { label: 'Échec', bg: '#FDECEC', fg: '#A8221C', dot: '#DC2626' },
    skipped: { label: 'Ignoré', bg: '#F1F2F4', fg: '#5B6072', dot: '#94A0AE' },
};

/** Sort order for the Statut column — Traité (success) first, then Échec. */
const STATUS_RANK: Record<string, number> = {
    success: 0,
    error: 1,
    skipped: 2,
    processing: 3,
    pending: 4,
};

function StatusPill({ status }: { status: string }) {
    const m = PROSPECT_STATUS_META[status] ?? PROSPECT_STATUS_META.pending;
    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
            style={{ background: m.bg, color: m.fg }}
        >
            <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: m.dot }}
            />
            {m.label}
        </span>
    );
}

function fmtProcessedAt(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(iso));
    } catch {
        return '—';
    }
}

/** Local-time YYYY-MM-DD for a timestamp — matches the chart's day buckets so a
 *  clicked chart day filters the rows processed that same calendar day. */
function ymdLocal(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

const PAGE_SIZE = 12;

export function CampaignProspectsTable({
    rows,
    campaignName,
    dateFilter,
    onClearDateFilter,
}: {
    rows: CampaignJobProspectRow[];
    campaignName: string;
    /** YYYY-MM-DD set by clicking a day on the chart, or null. */
    dateFilter?: string | null;
    onClearDateFilter?: () => void;
}) {
    const showExport = isFeatureEnabled('campaignDetailExport');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    // Statut column sort: click the header to cycle none → Traité-first → Échec-first.
    const [statusSort, setStatusSort] = useState<null | 'asc' | 'desc'>(null);

    const filtered = useMemo(() => {
        return rows.filter((p) => {
            if (
                search &&
                !p.prospect_name.toLowerCase().includes(search.toLowerCase())
            )
                return false;
            if (dateFilter && ymdLocal(p.processed_at) !== dateFilter)
                return false;
            return true;
        });
    }, [rows, search, dateFilter]);

    // Only two outcomes ever land on a finished campaign: Traité (success) and
    // Échec (error). Surface both counts instead of a generic total.
    const treatedCount = useMemo(
        () => filtered.filter((p) => p.status === 'success').length,
        [filtered]
    );
    const failedCount = useMemo(
        () => filtered.filter((p) => p.status === 'error').length,
        [filtered]
    );

    const sorted = useMemo(() => {
        if (!statusSort) return filtered;
        const dir = statusSort === 'asc' ? 1 : -1;
        return [...filtered].sort(
            (a, b) =>
                ((STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9)) *
                dir
        );
    }, [filtered, statusSort]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages - 1);
    const pageRows = sorted.slice(
        safePage * PAGE_SIZE,
        (safePage + 1) * PAGE_SIZE
    );

    const exportCsv = () => {
        const headers = [
            'Prospect',
            'Statut',
            'Acceptation',
            'Traité le',
            'Erreur',
        ];
        const esc = (v: string) =>
            /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        const lines = filtered.map((p) =>
            [
                p.prospect_name,
                PROSPECT_STATUS_META[p.status]?.label ?? p.status,
                p.accepted_at ? 'Acceptée' : 'En attente',
                p.processed_at ?? '',
                p.error ?? '',
            ]
                .map((v) => esc(String(v)))
                .join(',')
        );
        const csv = '﻿' + [headers.join(','), ...lines].join('\r\n');
        const url = URL.createObjectURL(
            new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = `${campaignName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-prospects.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <section>
            <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                    <h3 className="m-0 text-[15px] font-semibold tracking-tight">
                        Prospects de la campagne
                        <span className="ml-2 text-[13px] font-medium text-muted-foreground tabular-nums">
                            ({rows.length})
                        </span>
                    </h3>
                    <p className="m-0 mt-0.5 text-[12.5px] text-muted-foreground">
                        Suivi individuel de chaque destinataire.
                    </p>
                </div>
                {/* #FF: campaignDetailExport */}
                {showExport && (
                    <button
                        onClick={exportCsv}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-[12.5px] font-medium hover:bg-accent"
                    >
                        <Download className="size-3.5" /> Exporter CSV
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-2 border-b px-3.5 py-3">
                    <div className="relative min-w-[240px] flex-1">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un prospect"
                            className="h-8 w-full rounded-lg border bg-background pl-8 pr-2 text-[12.5px] outline-none focus:border-[var(--brand-blue,#0052D9)]"
                        />
                    </div>
                    {dateFilter && (
                        <button
                            type="button"
                            onClick={onClearDateFilter}
                            title="Retirer le filtre par date"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#0052D9] bg-[#E8F0FD] px-2.5 text-[12.5px] font-medium text-[#003EA3]"
                        >
                            {frShortDate(dateFilter)}
                            <X className="size-3" />
                        </button>
                    )}
                    <span className="ml-auto flex items-center gap-3 text-[12px] font-medium tabular-nums">
                        <span className="inline-flex items-center gap-1.5 text-[#0E7A3A]">
                            <span
                                className="size-1.5 rounded-full"
                                style={{ background: '#16A34A' }}
                            />
                            {treatedCount} Traité{treatedCount > 1 ? 's' : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[#A8221C]">
                            <span
                                className="size-1.5 rounded-full"
                                style={{ background: '#DC2626' }}
                            />
                            {failedCount} Échec{failedCount > 1 ? 's' : ''}
                        </span>
                    </span>
                </div>

                {/* Table */}
                <table className="w-full table-fixed border-collapse">
                    <colgroup>
                        <col />
                        <col style={{ width: 150 }} />
                        <col style={{ width: 140 }} />
                        <col style={{ width: 170 }} />
                        <col style={{ width: 220 }} />
                    </colgroup>
                    <thead>
                        <tr>
                            {[
                                'Prospect',
                                'Statut',
                                'Acceptation',
                                'Traité le',
                                'Erreur',
                            ].map((h) => {
                                if (h === 'Statut') {
                                    return (
                                        <th
                                            key={h}
                                            className="h-[38px] border-b bg-muted/40 px-3.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setStatusSort((s) =>
                                                        s === null
                                                            ? 'asc'
                                                            : s === 'asc'
                                                              ? 'desc'
                                                              : null
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
                                                title="Trier par statut (Traité / Échec)"
                                            >
                                                {h}
                                                <ChevronDown
                                                    className={`size-3 transition-transform ${
                                                        statusSort === 'asc'
                                                            ? 'rotate-180 opacity-100'
                                                            : statusSort ===
                                                                'desc'
                                                              ? 'opacity-100'
                                                              : 'opacity-40'
                                                    }`}
                                                />
                                            </button>
                                        </th>
                                    );
                                }
                                if (h === 'Acceptation') {
                                    return (
                                        <th
                                            key={h}
                                            className="h-[38px] border-b bg-muted/40 px-3.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                                        >
                                            {h}
                                        </th>
                                    );
                                }
                                return (
                                    <th
                                        key={h}
                                        className="h-[38px] border-b bg-muted/40 px-3.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground"
                                    >
                                        {h}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-6 py-12 text-center text-[13px] text-muted-foreground"
                                >
                                    Aucun prospect ne correspond aux filtres.
                                </td>
                            </tr>
                        ) : (
                            pageRows.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-b border-border/60 last:border-0"
                                >
                                    <td className="p-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <PersonAvatar
                                                name={p.prospect_name}
                                                src={p.avatar_url}
                                                size={30}
                                            />
                                            <span
                                                className="truncate text-[13px] font-medium"
                                                title={p.prospect_name}
                                            >
                                                {p.prospect_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3.5">
                                        <StatusPill status={p.status} />
                                    </td>
                                    <td className="p-3.5">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                                                p.accepted_at
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {p.accepted_at
                                                ? 'Acceptée'
                                                : 'En attente'}
                                        </span>
                                    </td>
                                    <td className="p-3.5 text-[12.5px] text-muted-foreground tabular-nums">
                                        {fmtProcessedAt(p.processed_at)}
                                    </td>
                                    <td className="p-3.5 text-[12.5px] text-destructive">
                                        {p.error ? (
                                            <span
                                                className="line-clamp-2"
                                                title={p.error}
                                            >
                                                {p.error}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {sorted.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5">
                        <span className="text-[12px] text-muted-foreground tabular-nums">
                            {safePage * PAGE_SIZE + 1}–
                            {Math.min(
                                (safePage + 1) * PAGE_SIZE,
                                sorted.length
                            )}{' '}
                            sur {sorted.length}
                        </span>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() =>
                                    setPage((p) => Math.max(0, p - 1))
                                }
                                disabled={safePage === 0}
                                className="rounded-md border px-2 py-1 text-[12px] disabled:opacity-40"
                            >
                                Précédent
                            </button>
                            <button
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(totalPages - 1, p + 1)
                                    )
                                }
                                disabled={safePage === totalPages - 1}
                                className="rounded-md border px-2 py-1 text-[12px] disabled:opacity-40"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

/* ============================================================
   ACTIVITY — chronological feed from the timeline events
   ============================================================ */

const ACTIVITY_TONE: Record<string, { bg: string; fg: string }> = {
    linkedin: { bg: '#E8F0FD', fg: '#0A66C2' },
    whatsapp: { bg: '#E6F8EE', fg: '#0E7A3A' },
    pipeline: { bg: '#FFF6E5', fg: '#9A6700' },
    rdv: { bg: '#F0EAFE', fg: '#5B2EBF' },
    note: { bg: '#F1F2F4', fg: '#5B6072' },
    enrich: { bg: '#E8F0FD', fg: '#0052D9' },
    origin: { bg: '#F1F2F4', fg: '#5B6072' },
    workflow: { bg: '#F0EAFE', fg: '#5B2EBF' },
};

function relTime(iso: string): string {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 30) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    const date = new Date(iso);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    if (d === 1) return `hier ${hh}:${mm}`;
    if (d < 7) return `il y a ${d} j`;
    const months = [
        'janv.',
        'févr.',
        'mars',
        'avr.',
        'mai',
        'juin',
        'juil.',
        'août',
        'sept.',
        'oct.',
        'nov.',
        'déc.',
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
}

const ACTIVITY_VISIBLE = 20;

export function CampaignActivity({
    events,
    loading,
}: {
    events: CampaignTimelineEvent[];
    loading: boolean;
}) {
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? events : events.slice(0, ACTIVITY_VISIBLE);

    return (
        <section>
            <div className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-[18px] py-3.5">
                    <div>
                        <h3 className="m-0 text-[15px] font-semibold tracking-tight">
                            Activité récente
                        </h3>
                        <p className="m-0 mt-0.5 text-[12px] text-muted-foreground">
                            Journal chronologique de la campagne.
                        </p>
                    </div>
                </div>

                {loading && events.length === 0 ? (
                    <div className="space-y-3 p-[18px]">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="size-6 animate-pulse rounded-full bg-muted" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                                    <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                        <Clock className="size-6 text-muted-foreground/60" />
                        <div className="text-[13px] font-medium">
                            Aucune activité pour le moment
                        </div>
                        <div className="max-w-sm text-[12px] text-muted-foreground">
                            Les acceptations, réponses et envois apparaîtront
                            ici au fil de l&apos;eau.
                        </div>
                    </div>
                ) : (
                    <ol className="relative m-0 list-none px-[18px] py-3.5">
                        <div className="absolute bottom-4 left-[30px] top-4 w-px bg-border" />
                        {visible.map((e) => {
                            const tone =
                                ACTIVITY_TONE[e.kind] ?? ACTIVITY_TONE.note;
                            return (
                                <li
                                    key={e.id}
                                    className="relative flex items-start gap-3.5 py-2.5"
                                >
                                    <span
                                        className="z-[1] mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold"
                                        style={{
                                            background: tone.bg,
                                            color: tone.fg,
                                        }}
                                    >
                                        {e.kind === 'linkedin'
                                            ? 'in'
                                            : e.kind === 'whatsapp'
                                              ? 'W'
                                              : e.dir === 'received'
                                                ? '↓'
                                                : '•'}
                                    </span>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <div className="text-[13px] leading-snug">
                                            <span className="font-medium">
                                                {e.title}
                                            </span>
                                            {e.prospect_name ? (
                                                <span className="text-muted-foreground">
                                                    {' '}
                                                    · {e.prospect_name}
                                                </span>
                                            ) : null}
                                        </div>
                                        {e.body ? (
                                            <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                                                {e.body}
                                            </div>
                                        ) : null}
                                        <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                                            {relTime(e.at)}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}

                {events.length > ACTIVITY_VISIBLE && (
                    <div className="border-t p-2.5 text-center">
                        <button
                            onClick={() => setShowAll((s) => !s)}
                            className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-[var(--brand-blue,#0052D9)] hover:bg-[var(--brand-blue-tint)]"
                        >
                            {showAll
                                ? 'Réduire'
                                : `Voir tout (${events.length})`}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
