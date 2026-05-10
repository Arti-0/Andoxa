"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INITIAL_CAMPAIGNS, computePerf, formatRelativeDate } from "../data";
import {
  Avatar,
  ChannelPill,
  ProgressBar,
  StatusBadge,
  TypeBadge,
} from "../primitives";
import { CREATORS } from "../data";

export default function Campaign2DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const campaign = INITIAL_CAMPAIGNS.find((c) => c.id === id);

  if (!campaign) {
    return (
      <div className="flex flex-col gap-3 p-8">
        <Link href="/campaigns2" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Retour
        </Link>
        <p className="text-muted-foreground">Campagne introuvable.</p>
      </div>
    );
  }

  const perf = computePerf(campaign);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 bg-[#FAFAFB] p-6 dark:bg-background lg:p-8">
      <div>
        <Link
          href="/campaigns2"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux campagnes
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <ChannelPill channel={campaign.channel} />
            <TypeBadge type={campaign.type} />
            <span className="text-[12.5px] text-muted-foreground">
              · Lancée {formatRelativeDate(campaign.launchedAt)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Mettre en pause</Button>
          <Button variant="outline">Dupliquer</Button>
          <Button variant="destructive">Supprimer</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Prospects ciblés" value={campaign.total} sub="dans la liste" />
        <Card
          label="Traités"
          value={`${campaign.processed}/${campaign.total}`}
          sub={`${Math.round((campaign.processed / Math.max(1, campaign.total)) * 100)}% complété`}
        />
        <Card
          label="Performance"
          value={perf ? `${perf.rate.toFixed(0)}%` : "—"}
          sub={perf ? perf.label : "en attente"}
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Progression
        </h2>
        <ProgressBar value={campaign.processed} max={campaign.total} height={8} />
        <div className="mt-2 flex justify-between text-[12.5px] text-muted-foreground tabular-nums">
          <span>{campaign.processed} traités</span>
          <span>{campaign.total - campaign.processed} restants</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Créateur
        </h2>
        <div className="flex items-center gap-3">
          <Avatar creator={CREATORS.find((c) => c.id === campaign.creator)} size={32} />
          <div>
            <div className="text-[14px] font-semibold">{campaign.creatorName}</div>
            <div className="text-[12px] text-muted-foreground">Auteur de la campagne</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-card p-6 text-center text-[13px] text-muted-foreground">
        Le détail des prospects, des messages envoyés et des réponses sera affiché ici une fois le backend câblé. Voir BACKEND.md.
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">{sub}</div>
    </div>
  );
}
