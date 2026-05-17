"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Info } from "lucide-react";
import { CREATORS, type KpiSet, type Period } from "./data";
import { Sparkline } from "./primitives";
import { useCampaignKpis } from "./queries";

const PERIOD_LABELS: Record<Period, { vsLabel: string; horizon: string }> = {
  "7": { vsLabel: "vs 7j préc.", horizon: "sur les 7 derniers jours" },
  "30": { vsLabel: "vs 30j préc.", horizon: "sur les 30 derniers jours" },
  "90": { vsLabel: "vs 90j préc.", horizon: "sur les 90 derniers jours" },
  all: { vsLabel: "vs période préc.", horizon: "sur toute la période" },
};

const EMPTY_KPIS: KpiSet = {
  invitations: { value: null, delta: null, spark: [] },
  acceptanceRate: { value: null, unit: "%", delta: null, spark: [] },
  messages: { value: null, delta: null, spark: [] },
  meetings: { value: null, delta: null, spark: [] },
  calls: { value: null, delta: null, spark: [] },
};

function useAnimatedNumber(target: number | null) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    if (target === null || target === undefined) {
      setVal(target);
      return;
    }
    const from = fromRef.current ?? target;
    if (from === target) return;
    const start = performance.now();
    const duration = 420;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      setVal(Math.round(v));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val;
}

function KpiCard({
  label,
  value,
  unit,
  delta,
  spark,
  tooltip,
  color = "#0052D9",
  vsLabel,
}: {
  label: string;
  value: number | null;
  unit?: string;
  delta: number | null;
  spark: number[];
  tooltip: string;
  color?: string;
  vsLabel: string;
}) {
  const animated = useAnimatedNumber(value);
  const isUp = (delta ?? 0) > 0;
  const isFlat = delta === 0 || delta === null || delta === undefined;
  const deltaColor = isFlat ? "var(--muted-foreground)" : isUp ? "#0E7A3A" : "#A8221C";
  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/20">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/60" title={tooltip}>
          <Info className="size-3" />
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {animated === null || animated === undefined ? "—" : animated.toLocaleString("fr-FR")}
        </span>
        {unit ? <span className="text-lg font-medium text-muted-foreground">{unit}</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums" style={{ color: deltaColor }}>
          {!isFlat && (isUp ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
          {delta === null || delta === undefined ? "—" : isFlat ? "— stable" : `${Math.abs(delta).toFixed(1)}%`}
          <span className="ml-1 font-normal text-muted-foreground">{vsLabel}</span>
        </span>
        <Sparkline data={spark} color={color} width={78} height={26} />
      </div>
    </div>
  );
}

export function KpiBar({ period, creators }: { period: Period; creators: string[] }) {
  const { data } = useCampaignKpis(period, creators);
  const kpis = data ?? EMPTY_KPIS;
  const labels = PERIOD_LABELS[period] ?? PERIOD_LABELS["7"];
  const allIds = CREATORS.map((c) => c.id);
  const isAllCreators = creators.length === 0 || creators.length === allIds.length;
  const creatorScope = isAllCreators
    ? "toute l'équipe"
    : creators.length === 1
      ? CREATORS.find((c) => c.id === creators[0])?.name
      : `${creators.length} créateurs`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11.5px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3" />
          Indicateurs <strong className="font-semibold text-foreground">{labels.horizon}</strong>
        </span>
        <span className="opacity-50">·</span>
        <span>{creatorScope}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Invitations LinkedIn" value={kpis.invitations.value} delta={kpis.invitations.delta} spark={kpis.invitations.spark} color="#0A66C2" vsLabel={labels.vsLabel} tooltip={`Invitations LinkedIn envoyées ${labels.horizon}`} />
        <KpiCard label="Taux d'acceptation" value={kpis.acceptanceRate.value} unit="%" delta={kpis.acceptanceRate.delta} spark={kpis.acceptanceRate.spark} color="#0E7A3A" vsLabel={labels.vsLabel} tooltip={`% d'invitations acceptées ${labels.horizon}`} />
        <KpiCard label="Messages envoyés" value={kpis.messages.value} delta={kpis.messages.delta} spark={kpis.messages.spark} color="#0052D9" vsLabel={labels.vsLabel} tooltip={`LinkedIn + WhatsApp combinés, ${labels.horizon}`} />
        <KpiCard label="RDV bookés" value={kpis.meetings.value} delta={kpis.meetings.delta} spark={kpis.meetings.spark} color="#FF6700" vsLabel={labels.vsLabel} tooltip={`Rendez-vous générés depuis les campagnes, ${labels.horizon}`} />
        <KpiCard label="Appels passés" value={kpis.calls.value} delta={kpis.calls.delta} spark={kpis.calls.spark} color="#5B2EBF" vsLabel={labels.vsLabel} tooltip={`Total des appels passés en sessions, ${labels.horizon}`} />
      </div>
    </div>
  );
}
