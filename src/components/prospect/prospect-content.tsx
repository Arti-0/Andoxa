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

import { useEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  NameAvatar,
  StatusPill,
  SourcePill,
  ChannelDot,
  Surface,
  SectionTitle,
  useDynamicStatusConfig,
  prospectPhotoFromEnrichment,
  type StatusConfig,
} from "@/components/crm/crm-shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { isProspectAutomationExcluded } from "@/lib/prospects/automation-opt-out";
import { isFeatureEnabled } from "@/lib/config/feature-flags";
import type { Prospect } from "@/lib/types/prospects";

/** #FF: workflows — hide workflow card, enroll action & timeline tag. */
const SHOW_WORKFLOWS = isFeatureEnabled("workflows");

const STATUS_FALLBACK: StatusConfig = {
  label: "—",
  hex: "#94a3b8",
  dot: "bg-slate-400",
  pill: "bg-muted text-foreground",
};

interface ProspectContentProps {
  prospect: Prospect;
  linkedChatId?: string | null;
  /** Pre-fetched timeline rows from /api/prospects/[id]/overview.
   *  When omitted (e.g. another caller still using the old contract),
   *  TimelineSection falls back to its own /events fetch. */
  timelineEvents?: TimelineApiResponse["events"];
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
  timelineEvents,
}: ProspectContentProps) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const queryClient = useQueryClient();

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/prospects/${prospect.id}/enrich`, {
        method: "POST",
        credentials: "include",
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
      queryClient.invalidateQueries({
        queryKey: ["prospect-overview", prospect.id],
      });
      toast.success("Profil LinkedIn actualisé");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Enrichissement impossible"),
  });

  const handleEnrich = () => enrichMutation.mutate();

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_min(360px,100%)] lg:items-start">
      <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
        <HeaderBanner
          prospect={prospect}
          linkedChatId={linkedChatId ?? null}
          enrollOpen={enrollOpen}
          setEnrollOpen={setEnrollOpen}
          onEnrich={handleEnrich}
          enriching={enrichMutation.isPending}
        />
        <PipelineWorkflowSection
          prospect={prospect}
          onEnrol={() => setEnrollOpen(true)}
        />
        <TimelineSection prospect={prospect} events={timelineEvents} />
        <ConversationsSection
          prospect={prospect}
          linkedChatId={linkedChatId ?? null}
        />
        <NotesSection prospect={prospect} />
        <ContexteSection
          prospect={prospect}
          onEnrich={handleEnrich}
          enriching={enrichMutation.isPending}
        />
        <MetadonneesSection prospect={prospect} />
      </div>

      <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2 lg:sticky lg:top-[76px] lg:self-start">
        <NextActionCard
          prospect={prospect}
          linkedChatId={linkedChatId ?? null}
        />
        <DocumentsCard />
      </div>
    </div>
  );
}

/* ============================================================
   Breadcrumb (used by the route page wrapper)
   ============================================================ */

export function ProspectBreadcrumb({ prospect }: { prospect: Prospect }) {
  const name = prospect.full_name ?? "Sans nom";
  return (
    <div className="mb-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
      <Link
        href={prospect.bdd_id ? `/crm?bdd_id=${prospect.bdd_id}` : "/crm"}
        className="inline-flex shrink-0 items-center gap-1 text-blue-700 hover:underline"
      >
        <ArrowLeft className="h-3 w-3" />
        Retour
      </Link>
      <span className="hidden text-border sm:inline">·</span>
      <span className="hidden sm:inline">CRM</span>
      <span className="hidden text-border sm:inline">›</span>
      <span className="hidden md:inline">Prospects</span>
      <span className="hidden text-border md:inline">›</span>
      <span className="min-w-0 truncate font-medium text-foreground" title={name}>
        {name}
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
  onEnrich,
  enriching,
}: {
  prospect: Prospect;
  linkedChatId: string | null;
  enrollOpen: boolean;
  setEnrollOpen: (v: boolean) => void;
  onEnrich: () => void;
  enriching: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pipelineOrder, cfgByKey } = useDynamicStatusConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // "Programmer un RDV" now opens an inline modal (mounted right here) instead
  // of routing to /calendar — the design's internal booking modal. Lives in
  // this header banner because it's the action bar's natural sibling; can be
  // hoisted later if other pages need it.
  const [rdvOpen, setRdvOpen] = useState(false);

  const statusMutation = useMutation({
    mutationFn: async (next: string) => {
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
      queryClient.invalidateQueries({ queryKey: ["prospect-overview", prospect.id] });
      queryClient.invalidateQueries({
        queryKey: ["prospect-events", prospect.id],
      });
      const label = cfgByKey.get(next)?.label ?? next;
      toast.success(`Déplacé vers ${label}`);
    },
    onError: () => toast.error("Impossible de mettre à jour le statut"),
  });
  const enrichDays = prospect.enriched_at
    ? daysSince(prospect.enriched_at)
    : null;

  const hasConversation = !!(linkedChatId || prospect.linked_chat_id);
  const chatHref = linkedChatId
    ? `/messagerie?chat=${encodeURIComponent(linkedChatId)}`
    : prospect.linked_chat_id
      ? `/messagerie?chat=${encodeURIComponent(prospect.linked_chat_id)}`
      : `/messagerie?prospect_id=${prospect.id}`;

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
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <NameAvatar
              name={prospect.full_name ?? "?"}
              size={72}
              photo={prospectPhotoFromEnrichment(prospect)}
            />
            <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h2 className="m-0 min-w-0 text-xl font-semibold tracking-tight sm:text-[22px]">
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
              <PopoverContent align="start" className="w-[220px] p-1">
                <div className="px-2 pb-1 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Déplacer vers
                </div>
                {pipelineOrder.map((stId) => {
                  const cfg = cfgByKey.get(stId) ?? STATUS_FALLBACK;
                  const active = prospect.status === stId;
                  return (
                    <button
                      key={stId}
                      onClick={() => statusMutation.mutate(stId)}
                      className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[12.5px] hover:bg-accent ${active ? "font-semibold" : ""}`}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                        style={{ backgroundColor: cfg.hex }}
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
                className="inline-flex max-w-full min-w-0 items-center gap-1 truncate text-xs text-blue-700 hover:underline"
                title={prospect.linkedin}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {prospect.linkedin.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}
          </div>
          <div className="mt-1.5 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <span className="min-w-0 line-clamp-2 sm:line-clamp-none">
              {prospect.job_title ?? "—"}
            </span>
            <span className="hidden text-border sm:inline">·</span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Building2 className="h-3 w-3 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{prospect.company ?? "—"}</span>
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
          </div>
        <div className="relative flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
          <Link
            href={chatHref}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-blue-700 sm:w-auto"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="sm:hidden">
              {hasConversation ? "Conversation" : "Message"}
            </span>
            <span className="hidden sm:inline">
              {hasConversation ? "Voir la conversation" : "Envoyer un message"}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setRdvOpen(true)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-card px-3.5 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-50 sm:w-auto"
          >
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="sm:hidden">RDV</span>
            <span className="hidden sm:inline">Programmer un RDV</span>
          </button>
          <div className="flex w-full gap-2 sm:w-auto">
            {/* #FF: workflows — enroll-in-parcours hidden until ready. */}
            {SHOW_WORKFLOWS && (
              <button
                onClick={() => setEnrollOpen(true)}
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-card px-3 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-50 sm:flex-none sm:px-3.5"
              >
                <Play className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Parcours</span>
              </button>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground/70 hover:bg-accent sm:h-9 sm:w-9 ${
                menuOpen ? "bg-accent" : ""
              }`}
              aria-label="Plus d'actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-[min(240px,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-1 shadow-lg sm:top-11">
              <MenuRow
                disabled={!prospect.linkedin || enriching}
                onClick={() => {
                  setMenuOpen(false);
                  onEnrich();
                }}
              >
                {enriching ? "Enrichissement…" : "Enrichir via LinkedIn"}
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
      </div>

      {SHOW_WORKFLOWS && (
        <WorkflowEnrollModal
          open={enrollOpen}
          onOpenChange={setEnrollOpen}
          prospects={[{ id: prospect.id, full_name: prospect.full_name }]}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
            queryClient.invalidateQueries({ queryKey: ["prospect-overview", prospect.id] });
            queryClient.invalidateQueries({
              queryKey: ["prospect-events", prospect.id],
            });
          }}
        />
      )}
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
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        {/* #FF: workflows — section is "Pipeline" only while workflows are off. */}
        <h3 className="m-0 text-sm font-semibold">
          {SHOW_WORKFLOWS ? "Pipeline & Workflow" : "Pipeline"}
        </h3>
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Dans le pipeline depuis {inDays}j
        </span>
      </div>
      <Stepper status={prospect.status} />

      {SHOW_WORKFLOWS && (
      <div className="mt-3 rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-violet-100/40 p-3.5 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-violet-900/20">
        {wf ? (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500 text-white">
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
            </div>
            <button
              onClick={onEnrol}
              className="w-full shrink-0 rounded-md border border-violet-200 bg-card px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 sm:w-auto dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300"
            >
              Inscrire
            </button>
          </div>
        )}
      </div>
      )}
    </Surface>
  );
}

function Stepper({ status }: { status: string | null }) {
  const { pipelineOrder, cfgByKey } = useDynamicStatusConfig();
  const stages = pipelineOrder.filter((s) => s !== "lost");
  const currentIdx = status ? stages.indexOf(status) : -1;
  return (
    <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex min-w-max items-start gap-0 sm:min-w-0 sm:w-full">
      {stages.map((s, i) => {
        const cfg = cfgByKey.get(s) ?? STATUS_FALLBACK;
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
            className="flex w-[4.5rem] shrink-0 flex-col items-center sm:w-auto sm:min-w-0"
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
              className={`mt-1.5 max-w-[72px] truncate text-center text-[11.5px] ${txt}`}
              title={cfg.label}
            >
              {cfg.label}
            </div>
          </div>
        );
      })}
      </div>
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

function TimelineSection({
  prospect,
  events: preFetched,
}: {
  prospect: Prospect;
  /** Pre-fetched events from the parent overview query. When provided we
   *  skip the dedicated /events round-trip. */
  events?: TimelineApiResponse["events"];
}) {
  const [filter, setFilter] = useState<
    "tous" | "conv" | "pipe" | "wf" | "note"
  >("tous");
  // Show at most 6 rows at once; "Voir plus" reveals the next batch. Keeping a
  // count (rather than a boolean) lets long histories expand progressively
  // without a layout jump — the list just grows downward in place.
  const PAGE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE);

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
    enabled: !preFetched,
    initialData: preFetched ? { events: preFetched } : undefined,
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
    // #FF: workflows — drop workflow rows entirely while disabled.
    if (!SHOW_WORKFLOWS && e.type === "workflow") return false;
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
    // #FF: workflows — hide the Workflows filter chip while disabled.
    ...(SHOW_WORKFLOWS
      ? [
          {
            id: "wf" as typeof filter,
            label: "Workflows",
            n: events.filter((e) => e.type === "workflow").length,
          },
        ]
      : []),
    {
      id: "note",
      label: "Notes",
      n: events.filter((e) => e.type === "note" || e.type === "enrich").length,
    },
  ];

  return (
    <Surface padding="p-4 sm:p-5">
      <div className="mb-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="m-0 shrink-0 text-sm font-semibold">Historique d’activité</h3>
        <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {filters.map((f) => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setVisibleCount(PAGE);
                }}
                className={`shrink-0 rounded-md border px-2 py-1 text-[11.5px] font-medium whitespace-nowrap ${
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
        {filtered.slice(0, visibleCount).map((e) => {
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
        {filtered.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE)}
            className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            Voir plus
            <span className="text-muted-foreground">
              ({filtered.length - visibleCount})
            </span>
          </button>
        )}
        {visibleCount > PAGE && filtered.length <= visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount(PAGE)}
            className="mt-1 inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-muted/60"
          >
            Voir moins
          </button>
        )}
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
    <Surface padding="p-4 sm:p-5">
      <div className="mb-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="m-0 text-sm font-semibold">Conversations actives</h3>
        <Link
          href={
            linkedChatId
              ? `/messagerie?chat=${encodeURIComponent(linkedChatId)}`
              : "/messagerie"
          }
          className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:underline"
        >
          <MessageSquare className="h-3 w-3 shrink-0" />
          {items.length > 0 ? "Voir la conversation" : "Envoyer un message"}
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
              className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ChannelDot kind={it.kind} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
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
              </div>
              <div className="inline-flex shrink-0 items-center gap-1 self-end text-xs font-medium text-blue-700 sm:self-auto">
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
  const savedNotes = prospect.notes ?? "";
  // `draft` is the full, freely-editable note body — the source of truth the
  // user can rewrite however they like. `addition` is the quick "append a new
  // note" box, which adds a fresh paragraph (separated by a blank line) without
  // touching the rest. We keep the draft in sync when the server value changes
  // but don't clobber in-progress edits.
  const [draft, setDraft] = useState(savedNotes);
  const [addition, setAddition] = useState("");
  const dirty = draft !== savedNotes;
  const savedNotesRef = useRef(savedNotes);

  // Re-sync the editor only when the server value changes *and* the user has no
  // pending edits, so a background refetch never wipes what they're typing.
  useEffect(() => {
    setDraft((current) =>
      current === savedNotesRef.current ? savedNotes : current,
    );
    savedNotesRef.current = savedNotes;
  }, [savedNotes]);

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
    onSuccess: (_d, notes) => {
      queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      queryClient.invalidateQueries({ queryKey: ["prospect-overview", prospect.id] });
      savedNotesRef.current = notes;
      setDraft(notes);
    },
    onError: () => toast.error("Impossible d’enregistrer la note"),
  });

  const saveEdits = () => {
    if (!dirty) return;
    mutation.mutate(draft.trim(), {
      onSuccess: () => toast.success("Notes mises à jour"),
    });
  };

  const appendNote = () => {
    const add = addition.trim();
    if (!add) return;
    // New session → new paragraph. We append to whatever is currently saved,
    // separated by a blank line, even if it's the same day.
    const base = draft.trim();
    const next = base ? `${base}\n\n${add}` : add;
    setAddition("");
    setDraft(next);
    mutation.mutate(next, {
      onSuccess: () => toast.success("Note ajoutée"),
    });
  };

  return (
    <Surface padding="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-sm font-semibold">Notes</h3>
        {dirty && (
          <button
            onClick={saveEdits}
            disabled={mutation.isPending}
            className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
      </div>

      {/* Full editable body — the user can modify or rewrite freely. */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Aucune note. Écrivez ici…"
        className="min-h-[120px] w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-blue-500"
      />

      {/* Quick add — appends a new paragraph without overriding edits above. */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-2 sm:flex-row sm:items-end sm:gap-1 sm:p-1.5">
        <textarea
          value={addition}
          onChange={(e) => setAddition(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) appendNote();
          }}
          placeholder="Ajouter une note (nouveau paragraphe)…"
          className="min-h-[44px] w-full flex-1 resize-none border-none bg-transparent px-2.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground"
        />
        <button
          disabled={!addition.trim() || mutation.isPending}
          onClick={appendNote}
          className={`inline-flex w-full shrink-0 items-center justify-center rounded-md px-3 py-2 text-xs font-medium sm:m-1 sm:w-auto sm:py-1.5 ${
            addition.trim()
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

function ContexteSection({
  prospect,
  onEnrich,
  enriching,
}: {
  prospect: Prospect;
  onEnrich: () => void;
  enriching: boolean;
}) {
  const summary =
    (
      prospect.enrichment_metadata as { summary?: string | null } | null
    )?.summary?.trim() ?? null;
  const canEnrich = !!prospect.linkedin?.trim();

  const items: {
    icon: typeof Building2;
    label: string;
    value: string | null | undefined;
    href?: string | null;
  }[] = [
    { icon: Building2, label: "Entreprise", value: prospect.company },
    { icon: MapIcon, label: "Localisation", value: prospect.location },
    {
      icon: Globe,
      label: "Site web",
      value: prospect.website,
      href: prospect.website,
    },
  ];
  if (prospect.industry?.trim()) {
    items.push({
      icon: Briefcase,
      label: "Industrie",
      value: prospect.industry,
    });
  }
  if (prospect.employees?.trim()) {
    items.push({ icon: Users, label: "Taille", value: prospect.employees });
  }

  return (
    <Surface padding="p-4 sm:p-5">
      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h3 className="m-0 text-sm font-semibold">Contexte entreprise</h3>
        <button
          type="button"
          onClick={onEnrich}
          disabled={!canEnrich || enriching}
          title={
            canEnrich
              ? "Relance une lecture du profil LinkedIn pour mettre à jour l'entreprise, la localisation et le site web"
              : "Ajoutez une URL LinkedIn pour enrichir ce prospect"
          }
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-1"
        >
          {enriching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {enriching ? "Enrichissement…" : "Actualiser via LinkedIn"}
        </button>
      </div>
      <p className="mb-3.5 mt-0 text-[12px] leading-relaxed text-muted-foreground">
        Données issues du CRM et, le cas échéant, du dernier enrichissement
        LinkedIn. L&apos;entreprise affichée en haut de page provient du même
        champ.
      </p>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          const display = it.value?.trim();
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
                  {display ? (
                    it.href ? (
                      <a
                        href={
                          display.startsWith("http")
                            ? display
                            : `https://${display}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-blue-700 hover:underline"
                      >
                        {display}
                      </a>
                    ) : (
                      <span className="break-words">{display}</span>
                    )
                  ) : (
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
      {summary && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Résumé LinkedIn
          </div>
          {/* Preserve the paragraph/line-break structure of the LinkedIn
              summary instead of collapsing it into one block. */}
          <div className="mt-1.5 flex flex-col gap-2">
            {summary
              .split(/\n{2,}/)
              .map((para) => para.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p
                  key={i}
                  className="mb-0 whitespace-pre-line text-[13px] leading-relaxed text-foreground/85"
                >
                  {para}
                </p>
              ))}
          </div>
        </div>
      )}
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
        <div className="mt-3.5 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[12.5px] sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {k}
                </div>
                <div className="mt-0.5 text-foreground/80">{v ?? "—"}</div>
              </div>
            ))}
          </div>
          <AutomationOptOutToggle prospect={prospect} />
        </div>
      )}
    </Surface>
  );
}

/**
 * Per-prospect automation opt-out toggle. When enabled the prospect is
 * filtered out of every batch send (campaigns, workflow auto-enrollments,
 * manual workflow enrollment) — see `lib/prospects/automation-opt-out.ts`
 * for the full list of consumers. Lives in the Métadonnées block because
 * it sits below the day-to-day workflow and is rarely toggled.
 */
function AutomationOptOutToggle({ prospect }: { prospect: Prospect }) {
  const queryClient = useQueryClient();
  const excluded = isProspectAutomationExcluded(prospect);

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ automation_excluded: next }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        throw new Error(
          json.error?.message ?? "Impossible de mettre à jour le réglage"
        );
      }
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ["prospect", prospect.id] });
      queryClient.invalidateQueries({
        queryKey: ["prospect-overview", prospect.id],
      });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success(
        next
          ? "Prospect exclu des automatisations"
          : "Prospect réintégré aux automatisations"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-dashed bg-muted/30 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium">
          Exclure des automatisations
        </div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
          Quand cette option est activée, le prospect n&apos;est jamais inclus
          dans les campagnes ni enrôlé dans un workflow — déclencheur
          automatique (acceptation, réponse, changement de statut…) ou
          sélection manuelle. Utile pour les contacts sensibles à protéger
          des envois en masse.
        </p>
      </div>
      <Switch
        checked={excluded}
        disabled={mutation.isPending}
        onCheckedChange={(next) => mutation.mutate(next)}
        aria-label="Exclure des automatisations"
        className="mt-0.5 shrink-0"
      />
    </div>
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
  const status = prospect.status;
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
        "Sans réponse depuis plus d’une dizaine de jours, un message direct peut conserver l’opportunité.",
      ctaLabel: "Envoyer un message",
      tone: "warning",
    };
  }
  if (silentDays >= 7) {
    return {
      title: `Silence ${silentDays} jours`,
      body:
        "Le prospect n’a pas répondu cette semaine — un message court peut relancer la conversation.",
      ctaLabel: "Envoyer un message",
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
    title: status ? "Étape en cours" : "Cycle en cours",
    body:
      "Continuez à nourrir l’échange — un message ou un rendez-vous de qualification peut faire avancer le pipeline.",
    ctaLabel: "Programmer une action",
    tone: "default",
  };
}

function NextActionCard({
  prospect,
  linkedChatId,
}: {
  prospect: Prospect;
  linkedChatId: string | null;
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
    const status = prospect.status;
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
    // Silence / relance / generic → open the conversation so the user can
    // send a message directly (replaces the old "enroll in a workflow" path,
    // which is gated off and was a poor fit for "envoyer un message").
    router.push(
      linkedChatId
        ? `/messagerie?chat=${encodeURIComponent(linkedChatId)}`
        : `/messagerie?prospect_id=${prospect.id}`,
    );
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

