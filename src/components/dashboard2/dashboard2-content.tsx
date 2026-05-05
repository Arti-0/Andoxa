"use client";

/**
 * Dashboard v2 — applies the Andoxa "Tableau de bord" cockpit design.
 *
 * Visual reference: design/Tableau de bord.html + app.jsx (Claude Design).
 *
 * All numbers come from the live backend:
 *   • /api/dashboard/stats           — KPI grid + activity volume
 *   • /api/dashboard/priorities      — cockpit priorities band
 *   • /api/dashboard/funnel          — conversion funnel + cycle days
 *   • /api/dashboard/top-deals       — hottest 5 prospects
 *   • /api/dashboard/at-risk         — silent prospects ≥ 6d
 *   • /api/dashboard/active-campaigns— running workflows
 *   • /api/dashboard/activity        — feed (with scope filter)
 *   • LinkedIn quotas via useLinkedInAccount + fetchLinkedInUsage
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Download,
  Filter,
  Flame,
  Linkedin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Rocket,
  Snowflake,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useWorkspace } from "@/lib/workspace";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";
import { fetchLinkedInUsage } from "@/lib/linkedin/linkedin-usage";
import { getLinkedInInviteWeeklyUsageCap } from "@/lib/linkedin/limits";
import { DAILY_QUOTAS } from "@/lib/linkedin/quotas";

/* ============================================================
   API TYPES
   ============================================================ */

interface DashboardStatsV2 {
  prospects: number;
  campaignsThisMonth: number;
  rdvEffectues: number;
  conversionRate: number;
  charts?: {
    activityVolume?: {
      week: string;
      calls: number;
      messages: number;
      bookings: number;
    }[];
  };
  period: string;
  pipeline: {
    active_total: number;
    by_stage: { rdv: number; proposal: number; qualified: number };
    sparkline: number[];
    trend_pts: number;
  };
  rdv: {
    booked_count: number;
    target: number;
    realisation_pct: number;
    sparkline: number[];
    trend_pts: number;
  };
  linkedin: {
    messages_sent: number;
    invitations_sent: number;
    responses_received: number;
    acceptances_received: number;
    response_rate_pct: number;
    acceptance_rate_pct: number;
    sparkline: number[];
    trend_pts: number;
  };
  closings: {
    won_count: number;
    target: number;
    progress_pct: number;
    sparkline: number[];
    trend_pts: number;
  };
  week_labels: string[];
}

interface PriorityItem {
  key:
    | "rdv_today"
    | "stale_conversations"
    | "unread_responses"
    | "proposals_to_follow"
    | "pending_workflows";
  count: number;
  label: string;
  sub: string;
  href: string;
}

interface PrioritiesPayload {
  generated_at: string;
  items: PriorityItem[];
}

interface FunnelStep {
  key: "invitations" | "accepted" | "conversations" | "rdvs" | "closings";
  label: string;
  count: number;
  conversion_pct_from_prev: number | null;
  trend_pts: number;
}

interface FunnelPayload {
  steps: FunnelStep[];
  global_rate_pct: number;
  avg_cycle_days: number | null;
  pipeline_target_closings: number;
  period: string;
}

interface TopDealRow {
  prospect_id: string;
  name: string;
  company: string | null;
  stage: string;
  stage_label: string;
  last_activity_label: string;
  initials: string;
  href: string;
}

interface AtRiskRow {
  prospect_id: string;
  name: string;
  company: string | null;
  stage: string;
  stage_label: string;
  silence_days: number;
  severity: "high" | "med" | "low";
  initials: string;
  href: string;
}

interface ActiveCampaign {
  workflow_id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "linkedin+whatsapp" | "other";
  state: "running" | "paused" | "completed";
  done: number;
  total: number;
  href: string;
}

interface ActivityApiRow {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  target_url?: string | null;
  actor_name?: string | null;
  actor_avatar?: string | null;
}

/* ============================================================
   API FETCHERS
   ============================================================ */

async function jsonFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed: ${url}`);
  const json = await res.json();
  return (json.data ?? json) as T;
}

const fetchStatsV2 = (period: ApiPeriod) =>
  jsonFetch<DashboardStatsV2>(`/api/dashboard/stats?period=${period}`);
const fetchPriorities = () =>
  jsonFetch<PrioritiesPayload>("/api/dashboard/priorities");
const fetchFunnel = (period: ApiPeriod) =>
  jsonFetch<FunnelPayload>(`/api/dashboard/funnel?period=${period}`);
const fetchTopDeals = () =>
  jsonFetch<TopDealRow[]>("/api/dashboard/top-deals?limit=5");
const fetchAtRisk = () =>
  jsonFetch<AtRiskRow[]>("/api/dashboard/at-risk?limit=5");
const fetchActiveCampaigns = () =>
  jsonFetch<ActiveCampaign[]>("/api/dashboard/active-campaigns");
const fetchActivity = (scope: "all" | "mine" | "team" | "system") =>
  jsonFetch<ActivityApiRow[]>(`/api/dashboard/activity?scope=${scope}`);

/* ============================================================
   PRIMITIVES — Pill / Trend / Avatar / Sparkline
   ============================================================ */

type Tone =
  | "slate"
  | "blue"
  | "violet"
  | "amber"
  | "green"
  | "rose"
  | "cyan";

const PILL_TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
};

function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

function Trend({
  delta,
  suffix = "pts",
  invert = false,
}: {
  delta: number;
  suffix?: string;
  invert?: boolean;
}) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-slate-400 dark:text-zinc-500">
        — {suffix}
      </span>
    );
  }
  const up = delta > 0;
  const positive = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11.5px] font-medium ${
        positive ? "text-emerald-600" : "text-rose-500"
      }`}
    >
      <Icon size={11} />
      {up ? "+" : ""}
      {delta} {suffix}
    </span>
  );
}

function colorForName(name: string): string {
  const palette = ["#0052D9", "#FF6700", "#10b981", "#8b5cf6", "#0891b2"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function Avatar({
  initials,
  size = 32,
  color,
}: {
  initials: string;
  size?: number;
  color?: string;
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color ?? colorForName(initials),
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}

function Sparkline({
  data,
  color = "#0052D9",
}: {
  data: number[];
  color?: string;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width: 120, height: 32 }} />;
  }
  const W = 120;
  const H = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2;
    return [x, y] as const;
  });
  const line = "M" + pts.map((p) => p.join(",")).join(" L");
  const area = line + ` L${W},${H} L0,${H} Z`;
  const id = `sparkGrad-${color.slice(1)}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TONE_BG: Record<
  Tone,
  { bg: string; text: string; ring: string }
> = {
  slate: {
    bg: "bg-slate-100 dark:bg-zinc-800",
    text: "text-slate-600 dark:text-zinc-300",
    ring: "ring-slate-200 dark:ring-zinc-700",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-600 dark:text-blue-300",
    ring: "ring-blue-100 dark:ring-blue-900/40",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-300",
    ring: "ring-amber-100 dark:ring-amber-900/40",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-300",
    ring: "ring-violet-100 dark:ring-violet-900/40",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-300",
    ring: "ring-emerald-100 dark:ring-emerald-900/40",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-600 dark:text-cyan-300",
    ring: "ring-cyan-100 dark:ring-cyan-900/40",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-300",
    ring: "ring-rose-100 dark:ring-rose-900/40",
  },
};

const STAGE_TONE: Record<string, Tone> = {
  new: "slate",
  contacted: "amber",
  qualified: "cyan",
  rdv: "blue",
  proposal: "violet",
  won: "green",
  lost: "rose",
};

/* ============================================================
   PERIOD MAPPING
   ============================================================ */

const PERIODS = [
  "Aujourd'hui",
  "Cette semaine",
  "Ce mois",
  "30 jours",
] as const;
type Period = (typeof PERIODS)[number];

type ApiPeriod = "today" | "week" | "month" | "30d";

const PERIOD_TO_API: Record<Period, ApiPeriod> = {
  "Aujourd'hui": "today",
  "Cette semaine": "week",
  "Ce mois": "month",
  "30 jours": "30d",
};

/* ============================================================
   PAGE HEADER
   ============================================================ */

function formatLongDate(date: Date): string {
  return date
    .toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^./, (c) => c.toUpperCase());
}

function getISOWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

function PageHeader({
  firstName,
  period,
  setPeriod,
}: {
  firstName: string;
  period: Period;
  setPeriod: (p: Period) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-5 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100 leading-tight">
          Tableau de bord
        </h1>
        <div className="mt-1.5 text-[12.5px] sm:text-[13.5px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
          <span>
            Bonjour{" "}
            <span className="text-slate-700 dark:text-zinc-300 font-medium">{firstName}</span>
          </span>
          <span className="text-slate-300 dark:text-zinc-600">·</span>
          <span>{formatLongDate(today)}</span>
          <span className="text-slate-300 dark:text-zinc-600">·</span>
          <span>Semaine {getISOWeek(today)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-shrink-0">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Calendar size={13} className="text-slate-400 dark:text-zinc-500" />
            {period}
            <ChevronDown
              size={13}
              className={`text-slate-400 dark:text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md shadow-lg p-1 z-30">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-[12.5px] rounded transition-colors flex items-center justify-between ${
                    period === p
                      ? "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40"
                      : "text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {p}
                  {period === p && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="h-9 px-3 sm:px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          title="Bientôt — export du tableau de bord"
          disabled
        >
          <Download size={14} />
          <span className="hidden sm:inline">Exporter</span>
        </button>

        <Link
          href="/campaigns"
          className="h-9 px-3 sm:px-3.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-white rounded-md transition-colors hover:opacity-90"
          style={{ background: "#0052D9" }}
        >
          <Rocket size={14} />
          <span className="hidden sm:inline">Lancer une campagne</span>
          <span className="sm:hidden">Campagne</span>
        </Link>
      </div>
    </div>
  );
}

/* ============================================================
   PRIORITIES BAND
   ============================================================ */

const PRIORITY_VISUAL: Record<
  PriorityItem["key"],
  { icon: LucideIcon; tone: Tone }
> = {
  rdv_today: { icon: Calendar, tone: "blue" },
  stale_conversations: { icon: MessageSquare, tone: "amber" },
  unread_responses: { icon: Zap, tone: "violet" },
  proposals_to_follow: { icon: Target, tone: "green" },
  pending_workflows: { icon: Workflow, tone: "cyan" },
};

const pulseDotStyle: CSSProperties = {
  background: "#0052D9",
  animation: "andoxa-pulseDot 1.6s ease-in-out infinite",
};

function relativeTimeFr(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function PrioritiesBand({ workspaceId }: { workspaceId: string | null | undefined }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard2-priorities", workspaceId],
    queryFn: fetchPriorities,
    enabled: !!workspaceId,
    staleTime: 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <section
      className="rounded-xl border border-blue-100 dark:border-blue-900/40 p-4 sm:p-5 mb-5 sm:mb-6 bg-[linear-gradient(180deg,rgba(232,240,253,0.55)_0%,rgba(232,240,253,0.15)_100%)] dark:bg-[linear-gradient(180deg,rgba(30,58,138,0.18)_0%,rgba(30,58,138,0.05)_100%)]"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={pulseDotStyle}
            />
            <span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-blue-700 dark:text-blue-300">
              Cockpit du matin
            </span>
          </div>
          <h2 className="mt-1 text-[16px] sm:text-[17px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Mes priorités du jour
          </h2>
        </div>
        <div className="text-[11.5px] sm:text-[12px] text-slate-500 dark:text-zinc-400">
          {data?.generated_at
            ? `Mis à jour ${relativeTimeFr(data.generated_at)}`
            : isLoading
              ? "Chargement…"
              : ""}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {(isLoading && items.length === 0
          ? Array.from({ length: 5 }).map((_, i) => ({
              key: `s-${i}` as never,
              count: 0,
              label: "",
              sub: "",
              href: "#",
              loading: true,
            }))
          : items.map((it) => ({ ...it, loading: false }))
        ).map((p, i) => {
          if (p.loading) {
            return (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3.5 animate-pulse"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 mb-2.5" />
                <div className="h-6 w-10 bg-slate-100 dark:bg-zinc-800 rounded mb-1.5" />
                <div className="h-3 w-24 bg-slate-100 dark:bg-zinc-800 rounded" />
              </div>
            );
          }
          const visual =
            PRIORITY_VISUAL[p.key as PriorityItem["key"]] ?? {
              icon: Target,
              tone: "slate" as Tone,
            };
          const t = TONE_BG[visual.tone];
          const Icon = visual.icon;
          return (
            <a
              key={p.key as string}
              href={p.href}
              className="text-left bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 sm:p-3.5 hover:border-blue-200 dark:hover:border-blue-900/60 hover:shadow-[0_2px_8px_rgba(0,82,217,0.08)] transition-all group block"
            >
              <div className="flex items-start justify-between mb-2 sm:mb-2.5">
                <div
                  className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center`}
                >
                  <Icon size={16} />
                </div>
                <ArrowRight
                  size={14}
                  className="text-slate-300 dark:text-zinc-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-1"
                />
              </div>
              <div className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100 leading-none mb-1 sm:mb-1.5">
                {p.count}
              </div>
              <div className="text-[12px] sm:text-[12.5px] font-medium text-slate-800 dark:text-zinc-200 leading-tight">
                {p.label}
              </div>
              <div className="mt-1 text-[11px] sm:text-[11.5px] text-slate-500 dark:text-zinc-400 truncate">
                {p.sub}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   KPI GRID
   ============================================================ */

interface KpiCardData {
  label: string;
  value: string;
  sub: string;
  side: string;
  trend: number;
  sparkData: number[];
  sparkColor?: string;
  isProgress?: boolean;
  progress?: number;
}

function KpiCard({ k, loading }: { k: KpiCardData | null; loading: boolean }) {
  if (loading || !k) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 animate-pulse">
        <div className="h-3 w-24 bg-slate-100 dark:bg-zinc-800 rounded" />
        <div className="mt-4 h-8 w-16 bg-slate-100 dark:bg-zinc-800 rounded" />
        <div className="mt-3 h-3 w-32 bg-slate-100 dark:bg-zinc-800 rounded" />
        <div className="mt-4 h-3 w-full bg-slate-100 dark:bg-zinc-800 rounded" />
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500 dark:text-zinc-400 truncate">
          {k.label}
        </div>
        <Trend delta={k.trend} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[26px] sm:text-[32px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100 leading-none">
            {k.value}
          </div>
          <div className="mt-1.5 text-[12px] sm:text-[12.5px] text-slate-600 dark:text-zinc-400">
            {k.sub}
          </div>
        </div>
        <div className="hidden xs:block sm:block">
          <Sparkline data={k.sparkData} color={k.sparkColor || "#0052D9"} />
        </div>
      </div>
      {k.isProgress && (
        <div className="mt-3 sm:mt-4">
          <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, k.progress ?? 0)}%`,
                background: "#0052D9",
              }}
            />
          </div>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-[11px] sm:text-[11.5px] text-slate-500 dark:text-zinc-400">
        {k.side}
      </div>
    </div>
  );
}

function KpiGrid({
  stats,
  isLoading,
}: {
  stats: DashboardStatsV2 | undefined;
  isLoading: boolean;
}) {
  const cards: (KpiCardData | null)[] = useMemo(() => {
    if (!stats) return [null, null, null, null];
    const { pipeline, rdv, linkedin, closings } = stats;
    const stagesText = `${pipeline.by_stage.proposal} en proposition · ${pipeline.by_stage.qualified} qualifiés · ${pipeline.by_stage.rdv} en RDV`;

    return [
      {
        label: "Pipeline actif",
        value: String(pipeline.active_total),
        sub: "prospects en cours",
        side: stagesText,
        trend: pipeline.trend_pts,
        sparkData: pipeline.sparkline,
      },
      {
        label: "RDV bookés",
        value: String(rdv.booked_count),
        sub: `${rdv.realisation_pct}% de l'objectif`,
        side: `vs objectif ${rdv.target}`,
        trend: rdv.trend_pts,
        sparkData: rdv.sparkline,
      },
      {
        label: "Taux de réponse LinkedIn",
        value: `${linkedin.response_rate_pct}%`,
        sub: `sur ${linkedin.messages_sent} message${linkedin.messages_sent > 1 ? "s" : ""} envoyé${linkedin.messages_sent > 1 ? "s" : ""}`,
        side: `Acceptation ${linkedin.acceptance_rate_pct}%`,
        trend: linkedin.trend_pts,
        sparkData: linkedin.sparkline,
      },
      {
        label: "Closings",
        value: String(closings.won_count),
        sub: `vs objectif ${closings.target}`,
        side: `${closings.progress_pct}% de l'objectif atteint`,
        trend: closings.trend_pts,
        progress: closings.progress_pct,
        sparkData: closings.sparkline,
        sparkColor: closings.trend_pts < 0 ? "#ef4444" : "#0052D9",
        isProgress: true,
      },
    ];
  }, [stats]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
      {cards.map((k, i) => (
        <KpiCard key={i} k={k} loading={isLoading} />
      ))}
    </div>
  );
}

/* ============================================================
   FUNNEL CARD
   ============================================================ */

function FunnelCard({
  funnel,
  isLoading,
}: {
  funnel: FunnelPayload | undefined;
  isLoading: boolean;
}) {
  const steps = funnel?.steps ?? [];
  const first = steps[0]?.count ?? 0;
  const MIN_W = 14;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Funnel de conversion
          </h3>
          <div className="text-[11.5px] sm:text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Du premier contact au closing
          </div>
        </div>
        <a
          href="/crm"
          className="text-[12px] text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
        >
          Détails →
        </a>
      </div>
      <div className="mt-4 sm:mt-5 space-y-2.5">
        {(isLoading && steps.length === 0
          ? (Array.from({ length: 5 }) as null[])
          : steps
        ).map((s, i) => {
          if (!s) {
            return (
              <div key={i} className="space-y-1">
                <div className="h-3 w-1/3 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-7 bg-slate-100 dark:bg-zinc-800 rounded-md animate-pulse" />
              </div>
            );
          }
          const raw = first > 0 ? (s.count / first) * 100 : 0;
          const w = first > 0 ? MIN_W + (raw / 100) * (100 - MIN_W) : MIN_W;
          return (
            <div key={s.key} className="group">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 w-3 tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[12.5px] sm:text-[13px] text-slate-700 dark:text-zinc-300 font-medium truncate">
                    {s.label}
                  </span>
                  {s.conversion_pct_from_prev != null && (
                    <Pill tone="blue">
                      {s.conversion_pct_from_prev}% de passage
                    </Pill>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <Trend delta={s.trend_pts} suffix="" />
                  <span className="text-[13px] sm:text-[14px] font-semibold tabular-nums text-slate-900 dark:text-zinc-100 w-10 sm:w-12 text-right">
                    {s.count}
                  </span>
                </div>
              </div>
              <div className="h-7 rounded-md relative overflow-hidden bg-[rgba(232,240,253,0.5)] dark:bg-blue-950/30">
                <div
                  className="h-full rounded-md transition-all group-hover:brightness-110"
                  style={{
                    width: `${w}%`,
                    background:
                      "linear-gradient(90deg, #0052D9 0%, #1A6AFF 100%)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-3 gap-3 sm:gap-4">
        <FunnelStat
          label="Taux global"
          value={funnel ? `${funnel.global_rate_pct} %` : "—"}
          help="invitation → closing"
        />
        <FunnelStat
          label="Cycle moyen"
          value={
            funnel?.avg_cycle_days != null
              ? `${funnel.avg_cycle_days} jours`
              : "—"
          }
          help="premier message → RDV"
        />
        <FunnelStat
          label="Pipeline cible"
          value={
            funnel ? `${funnel.pipeline_target_closings} closings` : "—"
          }
          help="à période iso"
        />
      </div>
    </div>
  );
}

function FunnelStat({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div>
      <div className="text-[10px] sm:text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-[16px] sm:text-[18px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
        {value}
      </div>
      <div className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-zinc-400">{help}</div>
    </div>
  );
}

/* ============================================================
   ACTIVITY VOLUME CARD — stacked bars (real data)
   ============================================================ */

function LegendStat({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <div
        className="w-2.5 h-2.5 rounded-sm shrink-0"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
          {label}
        </div>
        <div className="text-[14px] sm:text-[15px] font-semibold tabular-nums text-slate-900 dark:text-zinc-100 leading-tight">
          {value}
        </div>
      </div>
    </div>
  );
}

function ActivityVolumeCard({
  stats,
}: {
  stats: DashboardStatsV2 | undefined;
}) {
  const data = stats?.charts?.activityVolume ?? [];
  const max = Math.max(
    ...data.map((a) => a.calls + a.messages + a.bookings),
    1,
  );
  const totalMsgs = data.reduce((s, a) => s + a.messages, 0);
  const totalCalls = data.reduce((s, a) => s + a.calls, 0);
  const totalRdvs = data.reduce((s, a) => s + a.bookings, 0);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Volume d&apos;activité
          </h3>
          <div className="text-[11.5px] sm:text-[12px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Messages, appels et RDV — 8 dernières semaines
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 flex items-end gap-2 sm:gap-3 h-40 sm:h-44 px-1">
        {data.length === 0
          ? (
            <div className="w-full text-center text-[12px] text-slate-400 dark:text-zinc-500 self-center">
              Aucune donnée
            </div>
          )
          : data.map((a, i) => {
              const total = a.calls + a.messages + a.bookings;
              const h = (total / max) * 100;
              const calH = total ? (a.calls / total) * h : 0;
              const msgH = total ? (a.messages / total) * h : 0;
              const rdvH = total ? (a.bookings / total) * h : 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center group min-w-0"
                >
                  <div className="text-[10px] sm:text-[10.5px] font-medium text-slate-500 dark:text-zinc-400 mb-1 sm:mb-1.5 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {total}
                  </div>
                  <div
                    className="w-full flex flex-col justify-end"
                    style={{ height: 130 }}
                  >
                    <div
                      className="w-full rounded-t-sm transition-all group-hover:brightness-110"
                      style={{ height: `${rdvH}%`, background: "#86efac" }}
                    />
                    <div
                      className="w-full transition-all group-hover:brightness-110"
                      style={{ height: `${msgH}%`, background: "#0052D9" }}
                    />
                    <div
                      className="w-full rounded-b-sm transition-all group-hover:brightness-110"
                      style={{ height: `${calH}%`, background: "#93c5fd" }}
                    />
                  </div>
                  <div className="mt-2 text-[10.5px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate w-full text-center">
                    {a.week.replace("Sem. ", "")}
                  </div>
                </div>
              );
            })}
      </div>

      <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-3 gap-2 sm:gap-3">
        <LegendStat color="#0052D9" label="Messages" value={totalMsgs} />
        <LegendStat color="#93c5fd" label="Appels" value={totalCalls} />
        <LegendStat color="#86efac" label="RDV" value={totalRdvs} />
      </div>
    </div>
  );
}

/* ============================================================
   TOP DEALS CARD
   ============================================================ */

function TopDealsCard({ workspaceId }: { workspaceId: string | null | undefined }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard2-top-deals", workspaceId],
    queryFn: fetchTopDeals,
    enabled: !!workspaceId,
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
            <Flame size={15} />
          </div>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Top deals en cours
            </h3>
            <div className="text-[11.5px] sm:text-[12px] text-slate-500 dark:text-zinc-400">
              5 prospects les plus chauds
            </div>
          </div>
        </div>
        <a
          href="/crm"
          className="text-[12px] text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
        >
          Tout le pipeline →
        </a>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 animate-pulse"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-1/3 bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))
          : data.length === 0
            ? <div className="py-8 text-center text-[12.5px] text-slate-500 dark:text-zinc-400">
                Aucun deal actif pour le moment.
              </div>
            : data.map((d) => (
                <a
                  key={d.prospect_id}
                  href={d.href}
                  className="flex items-center gap-3 py-2.5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/60 -mx-2 px-2 rounded transition-colors"
                >
                  <Avatar initials={d.initials} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[12.5px] sm:text-[13px] font-medium text-slate-900 dark:text-zinc-100 truncate">
                        {d.name}
                      </span>
                      <Pill tone={STAGE_TONE[d.stage] ?? "slate"}>
                        {d.stage_label}
                      </Pill>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-[11.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      {d.company && (
                        <>
                          <span className="truncate">{d.company}</span>
                          <span className="text-slate-300 dark:text-zinc-600">·</span>
                        </>
                      )}
                      <span className="truncate">{d.last_activity_label}</span>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex text-[11.5px] font-medium text-blue-600 dark:text-blue-400 px-2 py-1 rounded items-center gap-1 flex-shrink-0">
                    Voir
                    <ArrowRight size={12} />
                  </span>
                </a>
              ))}
      </div>
    </div>
  );
}

/* ============================================================
   AT-RISK CARD
   ============================================================ */

function AtRiskCard({ workspaceId }: { workspaceId: string | null | undefined }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard2-at-risk", workspaceId],
    queryFn: fetchAtRisk,
    enabled: !!workspaceId,
  });

  const sevColor: Record<AtRiskRow["severity"], string> = {
    high: "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40",
    med: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40",
    low: "text-slate-500 bg-slate-100 dark:text-zinc-400 dark:bg-zinc-800",
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 flex items-center justify-center">
            <Snowflake size={15} />
          </div>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Deals à risque
            </h3>
            <div className="text-[11.5px] sm:text-[12px] text-slate-500 dark:text-zinc-400">
              À relancer pour ne pas perdre le fil
            </div>
          </div>
        </div>
        <a
          href="/crm"
          className="text-[12px] text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
        >
          Tout voir →
        </a>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 animate-pulse"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-1/3 bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
                <div className="w-12 h-8 bg-slate-100 dark:bg-zinc-800 rounded" />
              </div>
            ))
          : data.length === 0
            ? <div className="py-8 text-center text-[12.5px] text-slate-500 dark:text-zinc-400">
                Aucun deal silencieux détecté. 🎉
              </div>
            : data.map((d) => (
                <a
                  key={d.prospect_id}
                  href={d.href}
                  className="flex items-center gap-3 py-2.5 hover:bg-slate-50/60 dark:hover:bg-zinc-800/60 -mx-2 px-2 rounded transition-colors"
                >
                  <Avatar initials={d.initials} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[12.5px] sm:text-[13px] font-medium text-slate-900 dark:text-zinc-100 truncate">
                        {d.name}
                      </span>
                      <Pill tone={STAGE_TONE[d.stage] ?? "slate"}>
                        {d.stage_label}
                      </Pill>
                    </div>
                    {d.company && (
                      <div className="text-[11px] sm:text-[11.5px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                        {d.company}
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-right flex-shrink-0 px-2 py-1 rounded-md ${sevColor[d.severity]}`}
                  >
                    <div className="text-[11.5px] sm:text-[12px] font-semibold tabular-nums leading-tight">
                      {d.silence_days}j
                    </div>
                    <div className="text-[9px] sm:text-[9.5px] uppercase tracking-wide leading-tight">
                      silence
                    </div>
                  </div>
                </a>
              ))}
      </div>
    </div>
  );
}

/* ============================================================
   LINKEDIN QUOTAS CARD
   ============================================================ */

function LinkedInQuotasCard({
  workspaceId,
}: {
  workspaceId: string | null | undefined;
}) {
  const { data: linkedIn, isLoading: liLoading } = useLinkedInAccount();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["dashboard2-linkedin-usage", workspaceId],
    queryFn: fetchLinkedInUsage,
    enabled: !!workspaceId && !!linkedIn?.connected,
    staleTime: 60 * 1000,
  });

  if (liLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
              <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!linkedIn?.connected) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
            <Linkedin size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Quotas LinkedIn
            </h3>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              Compte non connecté
            </div>
          </div>
        </div>
        <p className="text-[12px] text-slate-500 dark:text-zinc-400 leading-relaxed">
          Connectez votre compte LinkedIn pour suivre vos quotas en temps réel.
        </p>
      </div>
    );
  }

  const weeklyCap = getLinkedInInviteWeeklyUsageCap(linkedIn.linkedin_is_premium);

  const rows = [
    {
      label: "Invitations",
      used: usage?.invitations_sent ?? 0,
      max: DAILY_QUOTAS.invitations,
      color: "#0052D9",
      footnote: usage
        ? `${usage.invitations_week} / ${weeklyCap} cette semaine`
        : null,
    },
    {
      label: "Messages",
      used: usage?.messages_sent ?? 0,
      max: DAILY_QUOTAS.messages,
      color: "#1A6AFF",
      footnote: null,
    },
    {
      label: "Vues profil",
      used: usage?.profile_views ?? 0,
      max: DAILY_QUOTAS.profile_views,
      color: "#93c5fd",
      footnote: null,
    },
  ];

  const overall =
    rows.reduce((s, q) => s + (q.max ? q.used / q.max : 0), 0) / rows.length;
  const status = overall < 0.7 ? "ok" : overall < 0.9 ? "warn" : "high";
  const statusUI: Record<
    "ok" | "warn" | "high",
    { color: string; label: string; tone: string }
  > = {
    ok: {
      color: "bg-emerald-500",
      label: "Quotas sains",
      tone: "text-emerald-600",
    },
    warn: {
      color: "bg-amber-500",
      label: "Approche limite",
      tone: "text-amber-600",
    },
    high: {
      color: "bg-rose-500",
      label: "Quasi-saturés",
      tone: "text-rose-600",
    },
  };
  const ui = statusUI[status];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
            <Linkedin size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Quotas LinkedIn
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${ui.color}`} />
              <span className={`text-[11px] font-medium ${ui.tone}`}>
                {ui.label}
              </span>
            </div>
          </div>
        </div>
        <a
          href="/settings"
          className="text-[11.5px] text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
        >
          Détails →
        </a>
      </div>
      <div className="space-y-3">
        {rows.map((q) => {
          const pct = q.max ? Math.min((q.used / q.max) * 100, 100) : 0;
          return (
            <div key={q.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-slate-700 dark:text-zinc-300">{q.label}</span>
                <span className="text-[11.5px] tabular-nums text-slate-500 dark:text-zinc-400">
                  {q.used} <span className="text-slate-300 dark:text-zinc-600">/</span> {q.max}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: q.color }}
                />
              </div>
              {q.footnote && (
                <div className="mt-1 text-[10.5px] text-slate-400 dark:text-zinc-500">
                  {q.footnote}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-[10.5px] sm:text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
        Réinitialisation à minuit (UTC). Andoxa lisse l&apos;envoi pour rester
        sous les seuils de sécurité.
      </div>
      {usageLoading && (
        <div className="mt-2 text-[10.5px] text-slate-400 dark:text-zinc-500">Actualisation…</div>
      )}
    </div>
  );
}

/* ============================================================
   ACTIVE CAMPAIGNS CARD
   ============================================================ */

const CHANNEL_LABEL: Record<ActiveCampaign["channel"], string> = {
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  "linkedin+whatsapp": "LinkedIn + WhatsApp",
  other: "Multi-canaux",
};

const STATE_TONE: Record<ActiveCampaign["state"], Tone> = {
  running: "green",
  paused: "amber",
  completed: "slate",
};

const STATE_LABEL: Record<ActiveCampaign["state"], string> = {
  running: "En cours",
  paused: "En pause",
  completed: "Terminée",
};

function ActiveCampaignsCard({
  workspaceId,
}: {
  workspaceId: string | null | undefined;
}) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["dashboard2-active-campaigns", workspaceId],
    queryFn: fetchActiveCampaigns,
    enabled: !!workspaceId,
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 flex items-center justify-center">
            <Megaphone size={15} />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Mes campagnes actives
            </h3>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              {data.length}{" "}
              {data.length > 1 ? "séquences" : "séquence"} en orchestration
            </div>
          </div>
        </div>
        <Link
          href="/workflows"
          className="text-[11.5px] text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300"
        >
          Toutes →
        </Link>
      </div>
      <div className="space-y-3 sm:space-y-3.5">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5 animate-pulse">
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-zinc-800 rounded" />
                <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full" />
              </div>
            ))
          : data.length === 0
            ? <div className="py-6 text-center text-[12px] text-slate-500 dark:text-zinc-400">
                Aucune campagne active. Lancez votre premier parcours.
              </div>
            : data.map((c) => {
                const pct = c.total ? (c.done / c.total) * 100 : 0;
                return (
                  <Link
                    key={c.workflow_id}
                    href={c.href}
                    className="group block"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium text-slate-900 dark:text-zinc-100 truncate">
                          {c.name}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {CHANNEL_LABEL[c.channel]}
                        </div>
                      </div>
                      <Pill tone={STATE_TONE[c.state]}>
                        {STATE_LABEL[c.state]}
                      </Pill>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              c.state === "paused" ? "#cbd5e1" : "#0052D9",
                          }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-slate-500 dark:text-zinc-400 flex-shrink-0">
                        {c.done} / {c.total}
                      </span>
                    </div>
                  </Link>
                );
              })}
      </div>
      <Link
        href="/workflows"
        className="mt-4 w-full block text-center text-[12px] text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 py-1.5 rounded-md transition-colors"
      >
        + Nouvelle campagne
      </Link>
    </div>
  );
}

/* ============================================================
   RECENT ACTIVITY CARD
   ============================================================ */

const ACT_FILTER_LABELS = [
  "Tous",
  "Mon activité",
  "Mon équipe",
  "Système",
] as const;
type ActFilterLabel = (typeof ACT_FILTER_LABELS)[number];
const FILTER_TO_SCOPE: Record<ActFilterLabel, "all" | "mine" | "team" | "system"> = {
  Tous: "all",
  "Mon activité": "mine",
  "Mon équipe": "team",
  Système: "system",
};

function activityVisual(type: string): {
  icon: LucideIcon;
  tone: Tone;
} {
  switch (type) {
    case "booking_created":
      return { icon: Calendar, tone: "blue" };
    case "campaign_started":
      return { icon: Megaphone, tone: "violet" };
    case "call_session_completed":
      return { icon: AlertTriangle, tone: "amber" };
    case "enrichment_completed":
      return { icon: Check, tone: "green" };
    case "prospect_imported":
      return { icon: Upload, tone: "slate" };
    case "prospect_added":
      return { icon: Check, tone: "green" };
    case "status_change":
      return { icon: ArrowRight, tone: "blue" };
    case "workflow_enrolled":
    case "workflow_step_completed":
    case "workflow_run_completed":
      return { icon: MessageCircle, tone: "green" };
    case "workflow_step_failed":
      return { icon: AlertTriangle, tone: "rose" };
    default:
      return { icon: Activity, tone: "slate" };
  }
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  return (
    d
      .toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })
      .replace(".", "") +
    " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

function RecentActivityCard({
  workspaceId,
}: {
  workspaceId: string | null | undefined;
}) {
  const [filter, setFilter] = useState<ActFilterLabel>("Tous");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["dashboard2-activity", workspaceId, filter],
    queryFn: () => fetchActivity(FILTER_TO_SCOPE[filter]),
    enabled: !!workspaceId,
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4 flex-col sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center">
            <Activity size={15} />
          </div>
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Activité récente
            </h3>
            <div className="text-[11.5px] sm:text-[12px] text-slate-500 dark:text-zinc-400">
              Événements regroupés et filtrés
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 rounded-md p-0.5">
            {ACT_FILTER_LABELS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                type="button"
                className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-[11.5px] rounded transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-white text-slate-900 dark:bg-zinc-700 dark:text-zinc-100 shadow-sm font-medium"
                    : "text-slate-600 dark:text-zinc-400"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled
            className="w-8 h-8 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 flex items-center justify-center shrink-0"
            title="Filtres avancés (bientôt)"
          >
            <Filter size={13} />
          </button>
        </div>
      </div>

      <div>
        {isLoading
          ? [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-zinc-800 last:border-0"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-1/3 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
              </div>
            ))
          : rows.length === 0
            ? (
              <div className="py-8 text-center text-[12.5px] text-slate-500 dark:text-zinc-400">
                Aucune activité récente.
              </div>
            )
            : rows.slice(0, 8).map((e) => {
                const { icon: EvIcon, tone } = activityVisual(e.type);
                const t = TONE_BG[tone];
                const Wrapper: "a" | "div" = e.target_url ? "a" : "div";
                return (
                  <Wrapper
                    key={e.id}
                    {...(e.target_url ? { href: e.target_url } : {})}
                    className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-zinc-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-zinc-800/60 -mx-2 px-2 rounded transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${t.bg} ${t.text} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <EvIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] sm:text-[13px] font-medium text-slate-900 dark:text-zinc-100">
                          {e.title}
                        </span>
                      </div>
                      <div className="text-[11px] sm:text-[11.5px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        {e.description}
                      </div>
                    </div>
                    <div className="text-[10.5px] sm:text-[11px] text-slate-400 dark:text-zinc-500 flex-shrink-0 mt-1 tabular-nums whitespace-nowrap">
                      {formatActivityTime(e.timestamp)}
                    </div>
                  </Wrapper>
                );
              })}
      </div>
    </div>
  );
}

/* ============================================================
   ROOT
   ============================================================ */

export function Dashboard2Content() {
  const { workspace, user, profile } = useWorkspace();
  const [period, setPeriod] = useState<Period>("Ce mois");
  const apiPeriod = PERIOD_TO_API[period];

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard2-stats", workspace?.id, apiPeriod],
    queryFn: () => fetchStatsV2(apiPeriod),
    enabled: !!workspace?.id,
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: ["dashboard2-funnel", workspace?.id, apiPeriod],
    queryFn: () => fetchFunnel(apiPeriod),
    enabled: !!workspace?.id,
  });

  const firstName = useMemo(() => {
    const full = profile?.full_name?.trim();
    if (full) return full.split(" ")[0];
    const email = user?.email ?? "";
    if (email) return email.split("@")[0];
    return "";
  }, [profile?.full_name, user?.email]);

  return (
    <div className="min-h-full bg-[#FAFAFA] dark:bg-zinc-950">
      <style>{`
        @keyframes andoxa-pulseDot {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
      `}</style>
      <div className="max-w-[1480px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        <PageHeader
          firstName={firstName || "Bonjour"}
          period={period}
          setPeriod={setPeriod}
        />
        <PrioritiesBand workspaceId={workspace?.id} />
        <KpiGrid stats={stats} isLoading={statsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <FunnelCard funnel={funnel} isLoading={funnelLoading} />
          <ActivityVolumeCard stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
          <TopDealsCard workspaceId={workspace?.id} />
          <AtRiskCard workspaceId={workspace?.id} />
        </div>

        <div className="grid gap-3 sm:gap-4 mb-5 sm:mb-6 grid-cols-1 lg:[grid-template-columns:minmax(0,1fr)_minmax(0,360px)]">
          <RecentActivityCard workspaceId={workspace?.id} />
          <div className="flex flex-col gap-3 sm:gap-4">
            <LinkedInQuotasCard workspaceId={workspace?.id} />
            <ActiveCampaignsCard workspaceId={workspace?.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
