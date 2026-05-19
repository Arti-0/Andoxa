"use client";

/**
 * Prospect Profile v2 — applies the Andoxa profile page redesign.
 *
 * Visual reference: design/CRM/profile-main.jsx + profile-data.jsx.
 *
 * Sections:
 *   • HeaderBanner — avatar, identity, action bar, more menu
 *   • PipelineWorkflowSection — stepper + workflow progress card
 *   • TimelineSection — multi-filter activity feed
 *   • ConversationsSection — active LinkedIn / WhatsApp threads
 *   • NotesSection — prospect-level notes editor
 *   • ContexteSection — industry / size / location / website
 *   • MetadonneesSection — collapsible meta block
 * Right column (sticky):
 *   • NextActionCard, SyntheseCard, DocumentsCard
 *
 * Most data is wired to existing endpoints. Items that need new
 * backend feeds (full timeline event table, multi-channel inbox,
 * workflow runs) are stubbed with TODO markers.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { WorkflowEnrollModal } from "@/components/workflows/workflow-enroll-modal";
import { ProspectRdvModal } from "@/components/prospect/prospect-rdv-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  File as FileIcon,
  Globe,
  List as ListIcon,
  MessageSquare,
  MoreVertical,
  Play,
  Sparkles,
  Map as MapIcon,
  Briefcase,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  NameAvatar,
  StatusPill,
  SourcePill,
  ChannelDot,
  Surface,
  SectionTitle,
  STATUS_CONFIG,
  PIPELINE_ORDER,
  isProspectStatus,
} from "@/components/crm/crm-shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Prospect, ProspectStatus } from "@/lib/types/prospects";

interface ProspectContentProps {
  prospect: Prospect;
  linkedChatId?: string | null;
}

const FR_DATE = (ts: string | null | undefined) =>
  ts
    ? new Date(ts).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

function daysSince(ts: string | null | undefined): number {
  if (!ts) return 0;
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function ProspectContent({
  prospect,
  linkedChatId,
}: ProspectContentProps) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-4">
        <HeaderBanner
          prospect={prospect}
          linkedChatId={linkedChatId ?? null}
          enrollOpen={enrollOpen}
          setEnrollOpen={setEnrollOpen}
        />
        <PipelineWorkflowSection
          prospect={prospect}
          onEnrol={() => setEnrollOpen(true)}
        />
        <TimelineSection prospect={prospect} />
        <ConversationsSection
          prospect={prospect}
          linkedChatId={linkedChatId ?? null}
        />
        <NotesSection prospect={prospect} />
        <ContexteSection prospect={prospect} />
        <MetadonneesSection prospect={prospect} />
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-[76px] lg:self-start">
        <NextActionCard
          prospect={prospect}
          linkedChatId={linkedChatId ?? null}
          onEnrol={() => setEnrollOpen(true)}
        />
        <SyntheseCard prospect={prospect} />
        <DocumentsCard />
      </div>
    </div>
  );
}

/* ============================================================
   Breadcrumb (used by the route page wrapper)
   ============================================================ */

export function ProspectBreadcrumb({ prospect }: { prospect: Prospect }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-[12.5px] text-muted-foreground">
      <Link
        href={prospect.bdd_id ? `/crm?bdd_id=${prospect.bdd_id}` : "/crm"}
        className="inline-flex items-center gap-1 text-blue-700 hover:underline"
      >
        <ArrowLeft className="h-3 w-3" />
        Retour
      </Link>
      <span className="text-border">·</span>
      <span>CRM</span>
      <span className="text-border">›</span>
      <span>Prospects</span>
      <span className="text-border">›</span>
      <span className="font-medium text-foreground">
        {prospect.full_name ?? "Sans nom"}
      </span>
    </div>
  );
}

/* ============================================================
   HeaderBanner
   ============================================================ */

function HeaderBanner({
  prospect,
  linkedChatId,
  enrollOpen,
  setEnrollOpen,
}: {
  prospect: Prospect;
  linkedChatId: string | null;
  enrollOpen: boolean;
  setEnrollOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // "Programmer un RDV" now opens an inline modal (mounted right here) instead
  // of routing to /calendar — the design's internal booking modal. Lives in
  // this header banner because it's the action bar's natural sibling; can be
  // hoisted later if other pages need it.
  const [rdvOpen, setRdvOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (next: ProspectStatus) => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: (_d, next) => {
      queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      queryClient.invalidateQueries({
        queryKey: ["prospect-events", prospect.id],
      });
      toast.success(`Déplacé vers ${STATUS_CONFIG[next].label}`);
    },
    onError: () => toast.error("Impossible de mettre à jour le statut"),
  });
  const enrichDays = prospect.enriched_at
    ? daysSince(prospect.enriched_at)
    : null;

  const chatHref = linkedChatId
    ? `/messagerie?chat=${encodeURIComponent(linkedChatId)}`
    : "/messagerie";

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/enrich`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      toast.success("Enrichissement lancé");
    },
    onError: () => toast.error("Enrichissement impossible"),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/unipile/prospects/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prospect_id: prospect.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: { message?: string } })?.error?.message ??
            `Erreur ${res.status}`,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      toast.success("Invitation LinkedIn envoyée");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      toast.success("Prospect déplacé dans la corbeille");
      router.push("/crm");
    },
    onError: () => toast.error("Suppression impossible"),
  });

  return (
    <Surface padding="p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <NameAvatar
          name={prospect.full_name ?? "?"}
          size={84}
          photo={
            (
              prospect.enrichment_metadata as
                | { profile_picture_url?: string }
                | null
            )?.profile_picture_url ?? null
          }
        />
        <div className="min-w-[280px] flex-[1_1_360px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="m-0 text-[22px] font-semibold tracking-tight">
              {prospect.full_name ?? "Sans nom"}
            </h2>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full hover:opacity-80"
                  aria-label="Changer le statut"
                >
                  <StatusPill status={prospect.status} size="lg" />
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[200px] p-1">
                <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Déplacer vers
                </div>
                {(PIPELINE_ORDER as ProspectStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const active = prospect.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate(s)}
                      className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-accent ${active ? "font-semibold" : ""}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                      />
                      {cfg.label}
                      {active && (
                        <Check className="ml-auto h-3 w-3 text-blue-700" />
                      )}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
            {prospect.linkedin && (
              <a
                href={prospect.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {prospect.linkedin.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {prospect.job_title ?? "—"}
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-muted-foreground/70" />
              {prospect.company ?? "—"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {enrichDays !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11.5px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                Enrichi il y a {enrichDays}j
              </span>
            )}
            {prospect.bdd_id && (
              <Link
                href={`/crm?bdd_id=${prospect.bdd_id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-medium text-foreground/80 hover:bg-muted/70"
              >
                <ListIcon className="h-2.5 w-2.5" />
                {prospect.bdd_name ?? "Liste"}
              </Link>
            )}
            <SourcePill source={prospect.source} />
          </div>
        </div>
        <div className="relative flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          <Link
            href={chatHref}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Démarrer conversation
          </Link>
          <button
            type="button"
            onClick={() => setRdvOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-card px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-50"
          >
            <Calendar className="h-3.5 w-3.5" />
            Programmer un RDV
          </button>
          <button
            onClick={() => setEnrollOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-card px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-50"
          >
            <Play className="h-3.5 w-3.5" />
            Ajouter à un parcours
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground/70 hover:bg-accent ${
              menuOpen ? "bg-accent" : ""
            }`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-30 w-[240px] rounded-xl border border-border bg-popover p-1 shadow-lg">
              <MenuRow
                onClick={() => {
                  setMenuOpen(false);
                  enrichMutation.mutate();
                }}
              >
                Enrichir
              </MenuRow>
              <MenuRow
                disabled={!prospect.linkedin}
                onClick={() => {
                  setMenuOpen(false);
                  inviteMutation.mutate();
                }}
              >
                Inviter sur LinkedIn
              </MenuRow>
              <MenuRow
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/call-sessions?prospect_id=${prospect.id}`);
                }}
              >
                Session d’appels
              </MenuRow>
              {prospect.linkedin && (
                <MenuRow
                  onClick={() => {
                    setMenuOpen(false);
                    window.open(prospect.linkedin!, "_blank");
                  }}
                >
                  Ouvrir le profil LinkedIn
                </MenuRow>
              )}
              <div className="my-1 h-px bg-border" />
              <MenuRow
                className="text-destructive"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                Supprimer
              </MenuRow>
            </div>
          )}
        </div>
      </div>

      <WorkflowEnrollModal
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        prospects={[{ id: prospect.id, full_name: prospect.full_name }]}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
          queryClient.invalidateQueries({
            queryKey: ["prospect-events", prospect.id],
          });
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
        title="Supprimer ce prospect ?"
        description="Il sera déplacé dans la corbeille et conservé 30 jours."
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMutation.mutate();
        }}
      />

      <ProspectRdvModal
        open={rdvOpen}
        onOpenChange={setRdvOpen}
        prospect={{
          id: prospect.id,
          full_name: prospect.full_name,
          email: prospect.email,
        }}
        onCreated={() => {
          queryClient.invalidateQueries({
            queryKey: ["prospect-events", prospect.id],
          });
        }}
      />
    </Surface>
  );
}

function MenuRow({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={() => {
        if (!disabled) onClick?.();
      }}
      className={`cursor-pointer rounded-md px-2.5 py-1.5 text-[13px] ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-accent"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ============================================================
   PipelineWorkflowSection
   ============================================================ */

function PipelineWorkflowSection({
  prospect,
  onEnrol,
}: {
  prospect: Prospect;
  onEnrol: () => void;
}) {
  const inDays = daysSince(prospect.created_at);
  const wf = prospect.workflow ?? null;
  const pct = wf && wf.total > 0 ? Math.round((wf.step / wf.total) * 100) : 0;
  return (
    <Surface padding="p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold">Pipeline & Workflow</h3>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Dans le pipeline depuis {inDays}j
        </span>
      </div>
      <Stepper status={prospect.status} />

      <div className="mt-3 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/40 p-3.5 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-violet-900/20">
        {wf ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500 text-white">
                <Play className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">
                  {wf.name}
                </div>
                <div className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">
                  Étape {wf.step} / {wf.total}
                </div>
              </div>
              <span className="rounded-md border border-violet-200 bg-card px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300">
                {pct}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-200/60 dark:bg-violet-900/40">
              <div
                className="h-full bg-violet-500 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500 text-white">
              <Play className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">
                Aucun parcours actif
              </div>
              <div className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">
                Inscrivez ce prospect dans un parcours pour automatiser le
                suivi.
              </div>
            </div>
            <button
              onClick={onEnrol}
              className="rounded-md border border-violet-200 bg-card px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300"
            >
              Inscrire
            </button>
          </div>
        )}
      </div>
    </Surface>
  );
}

function Stepper({ status }: { status: string | null }) {
  const stages = (PIPELINE_ORDER as ProspectStatus[]).filter(
    (s) => s !== "lost",
  );
  const currentIdx = isProspectStatus(status)
    ? stages.indexOf(status as (typeof stages)[number])
    : -1;
  return (
    <div className="flex items-start gap-0">
      {stages.map((s, i) => {
        const cfg = STATUS_CONFIG[s];
        const isCurrent = i === currentIdx;
        const isPast = i < currentIdx && currentIdx >= 0;
        const dotBg = isCurrent
          ? "bg-blue-600"
          : isPast
            ? "bg-blue-300"
            : "bg-border";
        const txt = isCurrent
          ? "text-blue-700 font-semibold"
          : isPast
            ? "text-foreground/80 font-medium"
            : "text-muted-foreground";
        return (
          <div
            key={s}
            className="flex shrink-0 flex-col items-center"
            style={{ flex: i < stages.length - 1 ? "1 1 0" : "0 0 auto" }}
          >
            <div className="flex w-full items-center">
              {/* invisible line filler before */}
              <div
                className={`h-0.5 flex-1 ${i === 0 ? "invisible" : i <= currentIdx ? "bg-blue-300" : "bg-border"}`}
              />
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${dotBg} ${isCurrent ? "ring-4 ring-blue-500/20" : ""}`}
              >
                {isPast && <Check className="h-3 w-3" />}
              </div>
              <div
                className={`h-0.5 flex-1 ${i === stages.length - 1 ? "invisible" : i < currentIdx ? "bg-blue-300" : "bg-border"}`}
              />
            </div>
            <div
              className={`mt-1.5 whitespace-nowrap text-[11.5px] ${txt}`}
            >
              {cfg.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   TimelineSection — multi-filter activity log. Reads
   `/api/prospects/:id/events`, which routes every row through
   `describeActivity()` so kind / title / body match the dashboard
   activity feed and the engagement counters (verb registry).
   ============================================================ */

type TimelineKind =
  | "linkedin"
  | "whatsapp"
  | "pipeline"
  | "workflow"
  | "rdv"
  | "note"
  | "enrich"
  | "origin";

interface TimelineEvent {
  id: string;
  type: TimelineKind;
  dir?: "sent" | "received";
  when: string;
  author: string;
  title: string;
  body: string;
  list?: string;
}

interface TimelineApiResponse {
  events: {
    id: string;
    kind: TimelineKind;
    dir?: "sent" | "received";
    at: string;
    author: string | null;
    title: string;
    body: string;
  }[];
}

function relAgoFr(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  const date = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  if (days === 0) return `aujourd’hui · ${date}`;
  if (days === 1) return `hier · ${date}`;
  if (days < 7) return `il y a ${days}j · ${date}`;
  return date;
}

const TIMELINE_TYPE_CFG: Record<
  TimelineKind,
  { label: string; tint: string; color: string; icon: string }
> = {
  linkedin: {
    label: "LinkedIn",
    tint: "bg-[#e8f1fa]",
    color: "text-[#0a66c2]",
    icon: "in",
  },
  whatsapp: {
    label: "WhatsApp",
    tint: "bg-emerald-50",
    color: "text-emerald-700",
    icon: "W",
  },
  pipeline: {
    label: "Pipeline",
    tint: "bg-amber-50",
    color: "text-amber-700",
    icon: "↗",
  },
  workflow: {
    label: "Workflow",
    tint: "bg-violet-50",
    color: "text-violet-700",
    icon: "▶",
  },
  rdv: {
    label: "RDV",
    tint: "bg-sky-50",
    color: "text-sky-700",
    icon: "📅",
  },
  note: {
    label: "Note",
    tint: "bg-muted",
    color: "text-muted-foreground",
    icon: "✎",
  },
  enrich: {
    label: "Enrich.",
    tint: "bg-blue-50",
    color: "text-blue-700",
    icon: "✦",
  },
  origin: {
    label: "Origine",
    tint: "bg-blue-50",
    color: "text-blue-700",
    icon: "in",
  },
};

function TimelineSection({ prospect }: { prospect: Prospect }) {
  const [filter, setFilter] = useState<
    "tous" | "conv" | "pipe" | "wf" | "note"
  >("tous");

  const { data } = useQuery({
    queryKey: ["prospect-events", prospect.id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/events`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      return (json.data ?? json) as TimelineApiResponse;
    },
    staleTime: 30_000,
  });

  const events = useMemo<TimelineEvent[]>(() => {
    return (data?.events ?? []).map((e) => ({
      id: e.id,
      type: e.kind,
      dir: e.dir,
      when: relAgoFr(e.at),
      author: e.author ?? "—",
      title: e.title,
      body: e.body,
    }));
  }, [data]);

  const filtered = events.filter((e) => {
    if (filter === "tous") return true;
    if (filter === "conv") return e.type === "linkedin" || e.type === "whatsapp";
    if (filter === "pipe") return e.type === "pipeline" || e.type === "rdv";
    if (filter === "wf") return e.type === "workflow";
    if (filter === "note") return e.type === "note" || e.type === "enrich";
    return true;
  });

  const filters: { id: typeof filter; label: string; n: number }[] = [
    { id: "tous", label: "Tous", n: events.length },
    {
      id: "conv",
      label: "Conversations",
      n: events.filter((e) => e.type === "linkedin" || e.type === "whatsapp")
        .length,
    },
    {
      id: "pipe",
      label: "Pipeline",
      n: events.filter((e) => e.type === "pipeline" || e.type === "rdv").length,
    },
    {
      id: "wf",
      label: "Workflows",
      n: events.filter((e) => e.type === "workflow").length,
    },
    {
      id: "note",
      label: "Notes",
      n: events.filter((e) => e.type === "note" || e.type === "enrich").length,
    },
  ];

  return (
    <Surface padding="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold">Timeline d’activité</h3>
        <div className="flex gap-1">
          {filters.map((f) => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md border px-2 py-1 text-[11.5px] font-medium ${
                  active
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-border bg-card text-foreground/80"
                }`}
              >
                {f.label}{" "}
                <span className="ml-0.5 opacity-70">{f.n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative pl-7">
        <div className="absolute left-2.5 bottom-1.5 top-1.5 w-[1.5px] bg-border" />
        {filtered.length === 0 && (
          <div className="py-6 text-sm text-muted-foreground">
            Aucun événement à afficher.
          </div>
        )}
        {filtered.map((e) => {
          const cfg = TIMELINE_TYPE_CFG[e.type];
          return (
            <div key={e.id} className="relative pb-4">
              <div
                className={`absolute -left-[22px] top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-background text-[9px] font-bold ${cfg.tint} ${cfg.color}`}
                style={{ boxShadow: `0 0 0 2px currentColor` }}
              >
                {cfg.icon}
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13px] font-semibold">{e.title}</span>
                {e.dir && (
                  <span className={`text-[11px] ${cfg.color}`}>
                    {e.dir === "sent" ? "↑" : "↓"}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {e.when}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  · {e.author}
                </span>
              </div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-foreground/70">
                {e.type === "linkedin" || e.type === "whatsapp" ? (
                  <div
                    className={`rounded-md px-3 py-2 italic ${cfg.tint}`}
                    style={{ borderLeft: `3px solid currentColor` }}
                  >
                    “{e.body}”
                  </div>
                ) : (
                  <span>{e.body}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

/* ============================================================
   ConversationsSection
   ============================================================ */

function ConversationsSection({
  prospect,
  linkedChatId,
}: {
  prospect: Prospect;
  linkedChatId: string | null;
}) {
  const items: { kind: string; href: string; last: string; when: string }[] = [];
  if (linkedChatId || prospect.linked_chat_id) {
    items.push({
      kind: "linkedin",
      href: `/messagerie?chat=${encodeURIComponent(linkedChatId ?? prospect.linked_chat_id ?? "")}`,
      last: "Conversation LinkedIn active",
      when: "—",
    });
  }
  return (
    <Surface padding="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold">Conversations actives</h3>
        <Link
          href={
            linkedChatId
              ? `/messagerie?chat=${encodeURIComponent(linkedChatId)}`
              : "/messagerie"
          }
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:underline"
        >
          <MessageSquare className="h-3 w-3" />
          Démarrer une conversation
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-[12.5px] text-muted-foreground">
            Aucune conversation active.
          </div>
        ) : (
          items.map((it) => (
            <Link
              key={it.kind}
              href={it.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3 hover:bg-muted/40"
            >
              <ChannelDot kind={it.kind} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-semibold capitalize">
                    {it.kind}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    · {it.when}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-[12.5px] text-foreground/70">
                  {it.last}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                Ouvrir <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))
        )}
      </div>
    </Surface>
  );
}

/* ============================================================
   NotesSection
   ============================================================ */

function NotesSection({ prospect }: { prospect: Prospect }) {
  const queryClient = useQueryClient();
  const [val, setVal] = useState("");
  const mutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(String(res.status));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      setVal("");
      toast.success("Note ajoutée");
    },
    onError: () => toast.error("Impossible d’enregistrer la note"),
  });

  return (
    <Surface padding="p-5">
      <h3 className="mb-3.5 m-0 text-sm font-semibold">Notes</h3>
      <div className="flex flex-col gap-2.5">
        {prospect.notes && prospect.notes.trim() ? (
          <div className="rounded-md border-l-[3px] border-amber-500 bg-amber-50 p-3 text-[13px] leading-relaxed dark:bg-amber-900/20">
            {prospect.notes}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-[12.5px] text-muted-foreground">
            Aucune note.
          </div>
        )}
      </div>
      <div className="mt-3 flex items-end gap-1 rounded-xl border border-border bg-card p-1">
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Ajouter une note pour l'équipe…"
          className="min-h-[60px] flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground"
        />
        <button
          disabled={!val.trim() || mutation.isPending}
          onClick={() => mutation.mutate(val.trim())}
          className={`m-1.5 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium ${
            val.trim()
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-muted text-muted-foreground"
          }`}
        >
          Ajouter
        </button>
      </div>
    </Surface>
  );
}

/* ============================================================
   ContexteSection
   ============================================================ */

function ContexteSection({ prospect }: { prospect: Prospect }) {
  const items = [
    { icon: Briefcase, label: "Industrie", value: prospect.industry },
    { icon: Users, label: "Taille", value: prospect.employees },
    { icon: MapIcon, label: "Localisation", value: prospect.location },
    { icon: Globe, label: "Site web", value: prospect.website },
  ];
  return (
    <Surface padding="p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold">Contexte entreprise</h3>
        <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-blue-700">
          <Sparkles className="h-3 w-3" />
          Enrichir
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground/70">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {it.label}
                </div>
                <div className="mt-0.5 text-[13.5px] font-medium">
                  {it.value || (
                    <span className="font-normal text-muted-foreground/70">
                      Non renseigné
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

/* ============================================================
   MetadonneesSection (collapsible)
   ============================================================ */

function MetadonneesSection({ prospect }: { prospect: Prospect }) {
  const [open, setOpen] = useState(false);
  const rows: [string, string | null][] = [
    ["Source d’acquisition", prospect.source],
    ["Date de création", FR_DATE(prospect.created_at)],
    ["Dernière mise à jour", FR_DATE(prospect.updated_at)],
    ["Liste(s)", prospect.bdd_id ?? "—"],
    ["ID interne", prospect.id],
  ];
  return (
    <Surface padding={open ? "p-5" : "p-3.5"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="m-0 text-sm font-semibold">Métadonnées</h3>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[12.5px]">
          {rows.map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {k}
              </div>
              <div className="mt-0.5 text-foreground/80">{v ?? "—"}</div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

/* ============================================================
   Right column
   ============================================================ */

/**
 * Lightweight heuristic that picks the next-best action for a prospect
 * (CRM-15). Mirrors the silence-bucket logic used on Dashboard 2:
 *
 *   • status `won` → celebrate, no action
 *   • status `lost` → optionally re-engage if 60+ days
 *   • silent ≥ 11 days → "Relance urgente"
 *   • silent ≥ 7 days → "Programmer une relance"
 *   • status `proposal` ≥ 5 days → "Relancer la proposition"
 *   • status `rdv` future-looking → "Préparer le RDV"
 *   • status `new` → "Lancer le premier contact"
 *
 * Returns a structured suggestion the gradient card can render.
 */
function nextActionFor(prospect: Prospect): {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref?: string;
  tone: "default" | "warning" | "success";
} {
  const status = prospect.status as ProspectStatus | null;
  const lastAt =
    prospect.last_activity?.at ?? prospect.updated_at ?? prospect.created_at;
  const silentDays = lastAt ? daysSince(lastAt) : 0;

  if (status === "won") {
    return {
      title: "Prospect signé",
      body: "Pensez à engager l’onboarding et à demander une recommandation.",
      ctaLabel: "Voir les notes",
      tone: "success",
    };
  }
  if (status === "lost") {
    return {
      title: silentDays >= 60 ? "Réveil possible" : "Prospect clôturé",
      body:
        silentDays >= 60
          ? "Plus de 60 jours sans contact — un message de réveil ciblé peut fonctionner."
          : "Aucune action immédiate. Conservez les notes pour un futur cycle.",
      ctaLabel: silentDays >= 60 ? "Préparer un message" : "Voir l’historique",
      tone: silentDays >= 60 ? "warning" : "default",
    };
  }
  if (silentDays >= 11) {
    return {
      title: `Silence ${silentDays} jours`,
      body:
        "Sans réponse depuis plus d’une dizaine de jours, programmez une relance directe pour conserver l’opportunité.",
      ctaLabel: "Programmer une relance",
      tone: "warning",
    };
  }
  if (silentDays >= 7) {
    return {
      title: `Silence ${silentDays} jours`,
      body:
        "Le prospect n’a pas répondu cette semaine — un message court de relance peut suffire à relancer la conversation.",
      ctaLabel: "Programmer une relance",
      tone: "warning",
    };
  }
  if (status === "proposal" && silentDays >= 5) {
    return {
      title: "Proposition en attente",
      body:
        "La proposition est en attente depuis quelques jours. Confirmez la réception et proposez un créneau d’échange.",
      ctaLabel: "Relancer la proposition",
      tone: "default",
    };
  }
  if (status === "rdv") {
    return {
      title: "RDV à venir",
      body:
        "Préparez le brief, vérifiez les besoins exprimés et envoyez un rappel la veille.",
      ctaLabel: "Préparer le RDV",
      tone: "default",
    };
  }
  if (status === "new") {
    return {
      title: "Premier contact à initier",
      body:
        "Personnalisez le message d’ouverture en vous appuyant sur le profil et la liste d’origine.",
      ctaLabel: "Démarrer la conversation",
      tone: "default",
    };
  }
  return {
    title: status
      ? `Étape ${STATUS_CONFIG[status]?.label ?? "—"}`
      : "Cycle en cours",
    body:
      "Continuez à nourrir l’échange — un message ou un rendez-vous de qualification peut faire avancer le pipeline.",
    ctaLabel: "Programmer une action",
    tone: "default",
  };
}

function NextActionCard({
  prospect,
  linkedChatId,
  onEnrol,
}: {
  prospect: Prospect;
  linkedChatId: string | null;
  onEnrol: () => void;
}) {
  const router = useRouter();
  const action = nextActionFor(prospect);
  const gradient =
    action.tone === "warning"
      ? "from-amber-500 to-orange-500"
      : action.tone === "success"
        ? "from-emerald-500 to-emerald-600"
        : "from-blue-600 to-blue-500";
  const ctaTextColor =
    action.tone === "warning"
      ? "text-orange-700"
      : action.tone === "success"
        ? "text-emerald-700"
        : "text-blue-700";

  /** Map the heuristic action to a real intent. */
  const performCta = () => {
    const status = prospect.status as ProspectStatus | null;
    if (status === "won") {
      // "Voir les notes" → scroll to notes section if we want, but
      // simplest: do nothing meaningful, no-op so it doesn't mislead.
      return;
    }
    if (status === "rdv") {
      router.push(`/calendar?prospect_id=${prospect.id}`);
      return;
    }
    if (status === "new") {
      router.push(
        linkedChatId
          ? `/messagerie?chat=${encodeURIComponent(linkedChatId)}`
          : `/messagerie?prospect_id=${prospect.id}`,
      );
      return;
    }
    // proposal, qualified, contacted, lost-with-old-silence → suggest a relance
    // Today the cleanest "programmer une relance" entry point is enrolling
    // the prospect in a workflow the user has already designed.
    onEnrol();
  };

  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${gradient} p-4 text-white`}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Target className="h-3.5 w-3.5 opacity-90" />
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
          Prochaine action suggérée
        </span>
      </div>
      <div className="text-sm font-semibold leading-snug">{action.title}</div>
      <div className="mt-1 text-[12.5px] leading-relaxed opacity-90">
        {action.body}
      </div>
      <div className="mt-3.5 flex gap-2">
        <button
          onClick={performCta}
          className={`flex-1 rounded-md bg-card px-3 py-2 text-[12.5px] font-semibold ${ctaTextColor} hover:bg-card/90`}
        >
          {action.ctaLabel}
        </button>
      </div>
    </div>
  );
}

function SyntheseCard({ prospect }: { prospect: Prospect }) {
  const days = daysSince(prospect.created_at);
  const { data: engagement } = useQuery({
    queryKey: ["prospect-engagement", prospect.id],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/engagement`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.data ?? json) as {
        messages_total: number;
        rdv_total: number;
        no_show_total: number;
      };
    },
    staleTime: 60_000,
  });
  return (
    <Surface padding="p-4">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Synthèse
        </span>
        <StatusPill status={prospect.status} size="lg" />
      </div>
      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">
            Dans le pipeline
          </div>
          <div className="mt-0.5 text-lg font-semibold">{days} jours</div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-muted-foreground">
            Entré le
          </div>
          <div className="mt-1 text-[13.5px] font-medium">
            {FR_DATE(prospect.created_at)}
          </div>
        </div>
      </div>
      <div className="border-t border-border pt-3.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Engagement
        </div>
        <div className="flex flex-col gap-2 text-[12.5px]">
          {[
            {
              icon: MessageSquare,
              label: "Messages échangés",
              value: engagement ? String(engagement.messages_total) : "—",
            },
            {
              icon: Calendar,
              label: "RDV bookés",
              value: engagement ? String(engagement.rdv_total) : "—",
            },
            {
              icon: Check,
              label: "No-show",
              value: engagement ? String(engagement.no_show_total) : "—",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground/80">{s.label}</span>
                <div className="flex-1" />
                <span className="font-semibold">{s.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Surface>
  );
}

function DocumentsCard() {
  return (
    <Surface padding="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Documents & devis
        </span>
        <span className="rounded-full bg-muted px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          V2
        </span>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <FileIcon className="h-4 w-4" />
        </div>
        <div className="text-[12.5px] font-medium text-foreground/80">
          Glissez un devis ou contrat ici
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          PDF, DOCX · L’extraction du montant arrivera en V2
        </div>
      </div>
    </Surface>
  );
}

