"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Search,
  Loader2,
  ExternalLink,
  UserPlus,
  Link2,
  X,
  StickyNote,
  Megaphone,
  Phone,
  PanelRightClose,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractCleanRole } from "@/lib/utils/extract-role";
import { WorkflowEnrollModal } from "@/components/workflows/workflow-enroll-modal";
import { useWorkspace } from "@/lib/workspace";
import { normalizePlanIdForRoutes } from "@/lib/billing/effective-plan";
import { canAccessRoute, type PlanId } from "@/lib/config/plans-config";
import type { Prospect } from "@/lib/types/prospects";
import {
  PROSPECT_STATUS_COLORS,
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/lib/types/prospects";

interface ProspectHit {
  id: string;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  status: string | null;
}

interface MessagerieContextPayload {
  linkedinFirstDegree: boolean | null;
  activeWorkflow: {
    runId: string;
    workflowId: string;
    workflowName: string;
    runStatus: string;
    currentStepLabel: string | null;
    canProcessNextStep: boolean;
  } | null;
}

export interface ChatCrmPanelProps {
  chatId: string;
  prospectId: string | null;
  onLinked: (chatId: string, prospectId: string) => void;
  /** Canal de la conversation (ex. LINKEDIN, WHATSAPP). */
  chatChannel?: string | null;
  /** When set, show a control to dismiss the mobile CRM drawer. */
  onCloseMobile?: () => void;
}

function parseProspectJson(json: unknown): Prospect | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const data = (o.success === true ? o.data : o.data ?? o) as Prospect | null;
  return data && typeof data === "object" && "id" in data ? (data as Prospect) : null;
}

function LinkedCrmSidebar({
  prospectId,
  chatChannel,
  onCloseMobile,
}: {
  prospectId: string;
  chatChannel?: string | null;
  onCloseMobile?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspace } = useWorkspace();
  const routePlan = normalizePlanIdForRoutes(
    workspace?.plan,
    workspace?.subscription_status
  ) as PlanId;
  const canUseWorkflows = canAccessRoute(routePlan, "/whatsapp");

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);

  const { data: prospect, isLoading: prospectLoading } = useQuery({
    queryKey: ["prospect", prospectId],
    queryFn: async () => {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      return parseProspectJson(json);
    },
    enabled: !!prospectId,
  });

  const { data: ctxData, isLoading: ctxLoading } = useQuery({
    queryKey: ["prospect-messagerie-context", prospectId],
    queryFn: async () => {
      const res = await fetch(
        `/api/prospects/${prospectId}/messagerie-context`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const payload = (json?.data ?? json) as MessagerieContextPayload;
      return payload;
    },
    enabled: !!prospectId,
  });

  const noteMutation = useMutation({
    mutationFn: async (addition: string) => {
      const trimmed = addition.trim();
      if (!trimmed) return;
      const current = prospect?.notes?.trim() ?? "";
      const next = current ? `${current}\n${trimmed}` : trimmed;
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: { message?: string } })?.error?.message ??
            "Échec de l’enregistrement"
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prospect", prospectId] });
      setNoteOpen(false);
      setNoteDraft("");
      toast.success("Note enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const processStepMutation = useMutation({
    mutationFn: async () => {
      const wf = ctxData?.activeWorkflow;
      if (!wf) throw new Error("Aucun parcours actif");
      const res = await fetch(
        `/api/workflows/${wf.workflowId}/runs/${wf.runId}/process-now`,
        { method: "POST", credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error?.message ?? "Impossible d’exécuter l’étape"
        );
      }
      const data = json?.data ?? json;
      return data as { outcome?: string; reason?: string };
    },
    onSuccess: (data) => {
      if (data?.outcome === "skipped") {
        toast.message("Étape non exécutée", {
          description: data.reason ?? "Raison inconnue",
        });
      } else {
        toast.success("Étape lancée");
      }
      void queryClient.invalidateQueries({
        queryKey: ["prospect-messagerie-context", prospectId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyPhone = useCallback(() => {
    const p = prospect?.phone?.trim();
    if (!p) return;
    void navigator.clipboard.writeText(p);
    toast.success("Numéro copié");
  }, [prospect?.phone]);

  if (prospectLoading || !prospect) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusKey = (prospect.status ?? "new") as ProspectStatus;
  const statusLabel =
    PROSPECT_STATUS_LABELS[statusKey] ?? prospect.status ?? "—";
  const statusClass =
    PROSPECT_STATUS_COLORS[statusKey] ??
    "bg-muted text-muted-foreground";

  const phone = prospect.phone?.trim() ?? "";
  const showLinkedinBlock = chatChannel !== "WHATSAPP";

  return (
    <div className="space-y-4 text-sm">
      {onCloseMobile && (
        <div className="flex justify-end lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onCloseMobile}
            aria-label="Fermer le panneau CRM"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      )}

      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Prospect
        </p>
        <div className="flex gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-tight">
              {prospect.full_name ?? "Sans nom"}
              {prospect.job_title?.trim() ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {extractCleanRole(prospect.job_title)}
                </span>
              ) : null}
            </p>
            {prospect.company?.trim() ? (
              <p className="truncate text-xs text-muted-foreground">
                {prospect.company}
              </p>
            ) : null}
          </div>
        </div>
        {prospect.status && (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {statusLabel}
          </span>
        )}
        <Link
          href={`/prospect/${prospectId}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Voir la fiche →
        </Link>
      </section>

      <section className="space-y-2 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions rapides
        </p>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Ajouter une note"
            title="Ajouter une note"
            onClick={() => setNoteOpen((v) => !v)}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Voir les campagnes"
            title="Voir les campagnes"
            onClick={() =>
              router.push(`/campaigns?prospect=${encodeURIComponent(prospectId)}`)
            }
          >
            <Megaphone className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!phone}
            aria-label={
              phone ? "Copier le numéro" : "Numéro non renseigné"
            }
            title={phone ? "Copier le numéro" : "Numéro non renseigné"}
            onClick={copyPhone}
          >
            {phone ? (
              <Phone className="h-3.5 w-3.5" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </Button>
        </div>
        {noteOpen && (
          <form
            className="space-y-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              noteMutation.mutate(noteDraft);
            }}
          >
            <Textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Votre note…"
              rows={3}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setNoteOpen(false);
                  setNoteDraft("");
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 flex-1 text-xs"
                disabled={!noteDraft.trim() || noteMutation.isPending}
              >
                {noteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-2 border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workflow
        </p>
        {ctxLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Chargement…
          </div>
        ) : ctxData?.activeWorkflow ? (
          <div className="space-y-2 rounded-md border bg-muted/30 p-2.5">
            <div className="flex items-start gap-2">
              <Workflow className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium leading-tight">
                  {ctxData.activeWorkflow.workflowName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ctxData.activeWorkflow.currentStepLabel ?? "Étape en cours"}
                </p>
                <p className="text-[10px] uppercase text-muted-foreground">
                  {ctxData.activeWorkflow.runStatus}
                </p>
              </div>
            </div>
            {ctxData.activeWorkflow.canProcessNextStep && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 w-full text-xs"
                disabled={processStepMutation.isPending}
                onClick={() => processStepMutation.mutate()}
              >
                {processStepMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Envoyer la prochaine étape maintenant"
                )}
              </Button>
            )}
          </div>
        ) : canUseWorkflows ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setWorkflowModalOpen(true)}
          >
            Ajouter à un parcours
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aucun parcours actif pour ce prospect.
          </p>
        )}
      </section>

      {showLinkedinBlock && (
        <section className="space-y-1 border-t pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            LinkedIn
          </p>
          <p className="text-xs">
            {ctxLoading ? (
              <span className="text-muted-foreground">Vérification…</span>
            ) : ctxData?.linkedinFirstDegree === true ? (
              "Relation LinkedIn ✓"
            ) : (
              "Pas encore en relation"
            )}
          </p>
        </section>
      )}

      <WorkflowEnrollModal
        open={workflowModalOpen}
        onOpenChange={setWorkflowModalOpen}
        prospects={[
          {
            id: prospectId,
            full_name: prospect.full_name ?? undefined,
          },
        ]}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ["prospect-messagerie-context", prospectId],
          });
        }}
      />
    </div>
  );
}

function ProspectSearchInput({
  onSelect,
}: {
  onSelect: (prospect: ProspectHit) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProspectHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchResults = useCallback(async (query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/prospects?search=${encodeURIComponent(t)}&pageSize=8`,
        { credentials: "include" }
      );
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setResults((data.items ?? []) as ProspectHit[]);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void fetchResults(q), 250);
    return () => clearTimeout(t);
  }, [q, fetchResults]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          placeholder="Nom, entreprise…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Recherche…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Aucun prospect
            </p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.full_name ?? "Sans nom"}</span>
                {p.company && (
                  <span className="text-xs text-muted-foreground">
                    {p.company}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CreateProspectForm({
  onCreated,
  onCancel,
}: {
  onCreated: (prospect: ProspectHit) => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName.trim(),
          company: company.trim() || undefined,
          source: "messaging",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Erreur lors de la création");
        return;
      }
      const data = (json.success ? json.data : (json?.data ?? json)) as ProspectHit;
      toast.success("Prospect créé");
      onCreated(data);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="crm-full-name" className="text-xs">
          Nom complet *
        </Label>
        <Input
          id="crm-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Prénom Nom"
          className="h-8 text-sm"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="crm-company" className="text-xs">
          Entreprise
        </Label>
        <Input
          id="crm-company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Nom de l'entreprise"
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={loading || !fullName.trim()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Créer"
          )}
        </Button>
      </div>
    </form>
  );
}

export function ChatCrmPanel({
  chatId,
  prospectId,
  onLinked,
  chatChannel,
  onCloseMobile,
}: ChatCrmPanelProps) {
  const [mode, setMode] = useState<"idle" | "link" | "create">("idle");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setMode("idle");
  }, [chatId]);

  const linkChat = useCallback(
    async (prospect: ProspectHit) => {
      setLinking(true);
      try {
        const res = await fetch("/api/unipile/chats/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            chat_id: chatId,
            prospect_id: prospect.id,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? "Erreur lors de la liaison");
          return;
        }
        toast.success(
          `Conversation liée à ${prospect.full_name ?? "ce prospect"}`
        );
        onLinked(chatId, prospect.id);
        setMode("idle");
      } catch {
        toast.error("Erreur réseau");
      } finally {
        setLinking(false);
      }
    },
    [chatId, onLinked]
  );

  return (
    <div className="flex h-full min-h-0 w-full max-w-[240px] flex-col border-t bg-card lg:border-l lg:border-t-0">
      <div className="shrink-0 border-b px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          CRM
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {prospectId ? (
          <LinkedCrmSidebar
            prospectId={prospectId}
            chatChannel={chatChannel}
            onCloseMobile={onCloseMobile}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Cette conversation n&apos;est pas liée à un prospect Andoxa.
            </p>

            {mode === "idle" && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setMode("link")}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Lier à un prospect existant
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setMode("create")}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Créer un prospect
                </Button>
              </div>
            )}

            {mode === "link" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Rechercher un prospect</p>
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ProspectSearchInput onSelect={(p) => void linkChat(p)} />
                {linking && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Liaison en cours…
                  </div>
                )}
              </div>
            )}

            {mode === "create" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Nouveau prospect</p>
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Fermer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <CreateProspectForm
                  onCreated={(p) => void linkChat(p)}
                  onCancel={() => setMode("idle")}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
