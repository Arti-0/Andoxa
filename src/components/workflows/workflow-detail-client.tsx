"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Info,
  ListPlus,
  Loader2,
  Pause,
  Pencil,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActivityFeed } from "@/components/design";
import type { ActivityFeedItem } from "@/components/design";
import type { WorkflowStep, WorkflowStepType } from "@/lib/workflows/schema";
import { WORKFLOW_STEP_TYPES_BUILDER_UI } from "@/lib/workflows/schema";
import {
  getStepLabel,
  parseWorkflowUi,
  WORKFLOW_COLOR_KEYS,
  WORKFLOW_ICON_KEYS,
  type WorkflowColorKey,
  type WorkflowIconKey,
} from "@/lib/workflows";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { WorkflowListIcon } from "./workflow-list-icon";
import { WorkflowStepWaitModal } from "./workflow-step-wait-modal";
import { WorkflowStepMessageModal } from "./workflow-step-message-modal";
import { WorkflowListEnrollModal } from "./workflow-list-enroll-modal";
import { WorkflowCanvas } from "./canvas/workflow-canvas";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";
import { CanvasSkeleton } from "@/components/skeletons/page-skeleton";
import type { WorkflowCanvasPositions } from "@/lib/workflows";
import { Trash2 } from "lucide-react";

type WorkflowStatsPayload = {
  runs_total: number;
  runs_by_status: Record<string, number>;
  queue: { pending_steps: number; processing_steps: number };
  recent_activity: {
    id: string;
    prospect_id: string | null;
    prospect_name: string | null;
    action: string;
    created_at: string;
    summary: string;
  }[];
  available_lists: { bdd_id: string; name: string; run_count: number }[];
  unassigned_run_count: number;
  list_filter_bdd_id: string | null;
  steps_progress_pct: number | null;
  runs_completed_pct: number | null;
  failed_runs_count: number;
  sample_errors: { prospect_id: string; message: string }[];
  runs_scan_truncated?: boolean;
};

const RUN_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  running: "En cours",
  paused: "En pause",
  completed: "Terminé",
  failed: "Échoué",
  cancelled: "Annulé",
};

const EXEC_STATUS_LABELS: Record<string, string> = {
  pending: "À venir",
  processing: "En cours",
  completed: "Fait",
  failed: "Échec",
  cancelled: "Annulé",
};

function newStepId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultConfigForType(type: WorkflowStepType): WorkflowStep["config"] {
  switch (type) {
    case "wait":
      return { durationHours: 24, onlyIfNoReply: false };
    case "linkedin_invite":
    case "linkedin_message":
      return { messageTemplate: "" };
    case "whatsapp_message":
      return { messageTemplate: "Bonjour {{firstName}},\n\n" };
    default:
      return { messageTemplate: "" };
  }
}


interface WorkflowDetailClientProps {
  workflowId: string;
}

export function WorkflowDetailClient({ workflowId }: WorkflowDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<{
    id: string;
    name: string;
    is_active: boolean;
    draft_definition: { schemaVersion: 1; steps: WorkflowStep[] };
    published_definition: unknown;
    metadata?: unknown;
  } | null>(null);

  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIconKey, setEditIconKey] = useState<WorkflowIconKey>("Workflow");
  const [editColorKey, setEditColorKey] = useState<WorkflowColorKey>("violet");

  const [editWaitIndex, setEditWaitIndex] = useState<number | null>(null);
  const [editMsgIndex, setEditMsgIndex] = useState<number | null>(null);
  const [canvasPositions, setCanvasPositions] = useState<WorkflowCanvasPositions>({});
  const canvasCommitTimer = useRef<number | null>(null);
  const { data: linkedInAccount } = useLinkedInAccount();
  const linkedinIsPremium = linkedInAccount?.linkedin_is_premium ?? false;

  const [runsLoading, setRunsLoading] = useState(false);
  const [runs, setRuns] = useState<
    {
      id: string;
      status: string;
      current_step_index: number;
      last_error: string | null;
      created_at: string;
      prospect_id: string;
      prospect: { full_name: string | null; company: string | null } | null;
      enrollment_list_labels?: string[];
      steps_total?: number;
      steps_completed?: number;
    }[]
  >([]);

  const [sheetRunId, setSheetRunId] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetData, setSheetData] = useState<{
    run: Record<string, unknown> & {
      prospect?: { full_name?: string | null } | null;
    };
    executions: Record<string, unknown>[];
  } | null>(null);

  const [mainTab, setMainTab] = useState("parcours");
  /** `null` = toutes les sources ; `__none__` = sans liste BDD */
  const [listFilter, setListFilter] = useState<string | null>(null);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [addStepSelectOpen, setAddStepSelectOpen] = useState(false);
  const [launchPrereqMessage, setLaunchPrereqMessage] = useState<string | null>(null);
  const detailReduceMotion = useReducedMotion() ?? false;

  /** Parcours enregistré comme prêt (étapes figées + comptes OK) — permet de lancer sur des listes. */
  const published = workflow?.published_definition != null;

  const stepsForView = useMemo((): WorkflowStep[] => {
    if (!workflow) return [];
    const pub = workflow.published_definition as { schemaVersion?: number; steps?: WorkflowStep[] } | null;
    if (pub && Array.isArray(pub.steps) && pub.steps.length) return pub.steps;
    const draft = workflow.draft_definition;
    return Array.isArray(draft?.steps) ? draft.steps : [];
  }, [workflow]);

  const entryStepIdForView = useMemo((): string | undefined => {
    if (!workflow) return undefined;
    const pub = workflow.published_definition as { entry_step_id?: string } | null;
    if (pub?.entry_step_id) return pub.entry_step_id;
    const draft = workflow.draft_definition as { entry_step_id?: string } | null;
    return draft?.entry_step_id ?? undefined;
  }, [workflow]);

  const headerUi = workflow ? parseWorkflowUi(workflow.metadata) : parseWorkflowUi(null);

  const { data: wfStats, isLoading: statsLoading } = useQuery({
    queryKey: ["workflow-stats", workflowId, listFilter],
    queryFn: async () => {
      const q = listFilter ? `?bdd_id=${encodeURIComponent(listFilter)}` : "";
      const res = await fetch(`/api/workflows/${workflowId}/stats${q}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("stats");
      const json = await res.json();
      return json.data as WorkflowStatsPayload;
    },
    enabled: !!workflowId && published,
    refetchInterval: mainTab === "runs" && published ? 8000 : false,
  });

  const statsFeedItems: ActivityFeedItem[] = useMemo(() => {
    const rows = wfStats?.recent_activity ?? [];
    return rows.map((r) => ({
      id: r.id,
      name: r.prospect_name ?? "Prospect",
      action: r.summary,
      time: new Date(r.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status:
        r.action === "workflow_step_failed"
          ? ("warning" as const)
          : r.action === "workflow_run_completed" || r.action === "workflow_enrolled"
            ? ("success" as const)
            : ("default" as const),
      href: r.prospect_id ? `/prospect/${r.prospect_id}` : undefined,
    }));
  }, [wfStats?.recent_activity]);

  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Erreur");
      }
      const w = json.data.workflow;
      setWorkflow(w);
      setLaunchPrereqMessage(
        typeof json.data.launch_prereq_message === "string"
          ? json.data.launch_prereq_message
          : null
      );
      const def = w.draft_definition as { schemaVersion?: number; steps?: WorkflowStep[] };
      setSteps(Array.isArray(def?.steps) ? def.steps : []);
      const ui = parseWorkflowUi(w.metadata);
      setCanvasPositions(ui.canvas ?? {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chargement impossible");
      setWorkflow(null);
      setLaunchPrereqMessage(null);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (listFilter) params.set("bdd_id", listFilter);
      const res = await fetch(`/api/workflows/${workflowId}/runs?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? "Erreur");
      setRuns(json.data.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Exécutions introuvables");
    } finally {
      setRunsLoading(false);
    }
  }, [workflowId, listFilter]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  const definitionPayload = useMemo(
    () => ({ schemaVersion: 1 as const, steps }),
    [steps]
  );

  const saveChanges = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Indiquez un nom.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          draft_definition: definitionPayload,
          ui: { icon: editIconKey, color: editColorKey },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? json?.error?.details?.draft_definition ?? "Erreur");
      }
      setWorkflow(json.data.workflow);
      setEditMode(false);
      toast.success("Enregistré");
      await loadWorkflow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = () => {
    if (!workflow) return;
    setEditName(workflow.name);
    const ui = parseWorkflowUi(workflow.metadata);
    setEditIconKey(ui.icon);
    setEditColorKey(ui.color);
    const def = workflow.draft_definition as { steps?: WorkflowStep[] };
    setSteps(Array.isArray(def?.steps) ? def.steps : []);
    setEditMode(true);
  };

  const cancelEdit = async () => {
    setEditMode(false);
    await loadWorkflow();
  };

  const toggleActive = async (checked: boolean) => {
    if (checked && !published) return;
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: checked }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json?.error?.message ?? "Mise à jour impossible");
      return;
    }
    setWorkflow(json.data.workflow);
    void queryClient.invalidateQueries({
      queryKey: ["workflow-stats", workflowId],
      exact: false,
    });
  };

  const confirmDelete = async () => {
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json?.error?.message ?? "Suppression impossible");
      return;
    }
    toast.success("Parcours supprimé");
    router.push("/workflows");
  };

  const addStep = (type: WorkflowStepType) => {
    setAddStepSelectOpen(false);
    setSteps((prev) => [
      ...prev,
      {
        id: newStepId(),
        type,
        config: defaultConfigForType(type),
      } as WorkflowStep,
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStepConfig = (index: number, patch: Record<string, unknown>) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index ? ({ ...s, config: { ...s.config, ...patch } } as WorkflowStep) : s
      )
    );
  };

  // Canvas → click step opens its config modal (wait or message).
  const openStepFromCanvas = useCallback(
    (stepId: string) => {
      const idx = steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return;
      const s = steps[idx];
      if (!s) return;
      if (s.type === "condition") return; // no config modal for condition (v1)
      if (s.type === "wait") setEditWaitIndex(idx);
      else setEditMsgIndex(idx);
    },
    [steps]
  );

  // Persist canvas node positions in workflow metadata. Debounced upstream by the canvas itself.
  const commitCanvasPositions = useCallback(
    (positions: WorkflowCanvasPositions) => {
      // Optimistically update local state so the canvas doesn't snap back.
      setCanvasPositions(positions);
      if (canvasCommitTimer.current) {
        window.clearTimeout(canvasCommitTimer.current);
      }
      canvasCommitTimer.current = window.setTimeout(async () => {
        try {
          await fetch(`/api/workflows/${workflowId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ui: { canvas: positions } }),
          });
        } catch {
          // Position persistence is non-critical; silently swallow.
        }
      }, 400);
    },
    [workflowId]
  );

  useEffect(() => {
    return () => {
      if (canvasCommitTimer.current) window.clearTimeout(canvasCommitTimer.current);
    };
  }, []);

  const openRunSheet = async (runId: string) => {
    setSheetRunId(runId);
    setSheetLoading(true);
    setSheetData(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/runs/${runId}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message ?? "Erreur");
      setSheetData(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Détail indisponible");
      setSheetRunId(null);
    } finally {
      setSheetLoading(false);
    }
  };

  const patchRun = async (runId: string, action: "pause" | "resume" | "cancel") => {
    const res = await fetch(`/api/workflows/${workflowId}/runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error(json?.error?.message ?? "Action impossible");
      return;
    }
    toast.success("Mis à jour");
    await loadRuns();
    void queryClient.invalidateQueries({
      queryKey: ["workflow-stats", workflowId],
      exact: false,
    });
    if (sheetRunId === runId && sheetData) {
      setSheetData({ ...sheetData, run: json.data.run });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => loadRuns(), 0);
    return () => window.clearTimeout(t);
  }, [loadRuns]);

  const msgStep =
    editMsgIndex != null && steps[editMsgIndex]
      ? (steps[editMsgIndex].type as "linkedin_invite" | "linkedin_message" | "whatsapp_message")
      : null;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-56 rounded-md bg-muted animate-pulse" />
        </div>
        <CanvasSkeleton />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Parcours introuvable.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/workflows">Retour</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/workflows" aria-label="Retour">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <WorkflowListIcon icon={headerUi.icon} color={headerUi.color} className="h-10 w-10" />
                <span className="truncate">{workflow.name}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {published
                  ? workflow.is_active
                    ? "Le parcours avance pour les contacts inscrits. La pause arrête le traitement des étapes sans annuler les parcours en cours."
                    : "Le parcours est en pause : aucune étape ne s’exécute tant que vous ne reprenez pas. Vous pouvez le modifier."
                  : "Après avoir enregistré le parcours comme prêt (étapes + comptes), vous pourrez lancer sur une ou plusieurs listes depuis ce bouton."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5"
              disabled={!published}
              title={
                !published
                  ? (launchPrereqMessage ?? "Finalisez le parcours pour lancer sur des listes.")
                  : undefined
              }
              onClick={() => {
                if (!published) return;
                setEnrollModalOpen(true);
              }}
            >
              <ListPlus className="h-4 w-4 shrink-0" />
              Lancer sur des listes
            </Button>
            {published ? (
              workflow.is_active ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void toggleActive(false)}
                  title="Arrête le traitement des étapes sans annuler les parcours en cours"
                >
                  <Pause className="h-4 w-4 shrink-0" />
                  Pause
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void toggleActive(true)}
                  title="Reprendre l’exécution des étapes pour les contacts inscrits"
                >
                  <Play className="h-4 w-4 shrink-0" />
                  Reprendre
                </Button>
              )
            ) : null}
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!published && launchPrereqMessage ? (
          <Alert className="mb-6 border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30">
            <Info className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <AlertTitle className="text-amber-950 dark:text-amber-100">
              Avant de lancer sur des listes
            </AlertTitle>
            <AlertDescription className="text-amber-950/90 dark:text-amber-100/90">
              <p className="mb-2 text-pretty">{launchPrereqMessage}</p>
              <p className="text-xs">
                <Link href="/settings" className="font-medium underline underline-offset-2">
                  Connexion des comptes (LinkedIn / WhatsApp)
                </Link>
                {" · "}
                <span className="text-muted-foreground">
                  Onglet Parcours : Modifier → Sauvegarder pour enregistrer une version prête à lancer.
                </span>
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        <Tabs
          value={mainTab}
          onValueChange={(v) => {
            setMainTab(v);
            if (v === "runs") loadRuns();
          }}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="parcours">Parcours</TabsTrigger>
            <TabsTrigger value="runs">Exécutions</TabsTrigger>
          </TabsList>

          <TabsContent value="parcours" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">Parcours</CardTitle>
                  <CardDescription>
                    {editMode
                      ? "Modifiez l’ordre et le contenu des étapes."
                      : "Ordre actuellement en place pour les prochains lancements."}
                  </CardDescription>
                </div>
                {!editMode && !workflow.is_active ? (
                  <Button type="button" size="sm" variant="outline" onClick={startEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                ) : null}
                {!editMode && workflow.is_active ? (
                  <p className="text-xs text-muted-foreground">
                    Mettez le parcours en pause pour le modifier.
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-6">
                {!editMode ? (
                  stepsForView.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Aucune étape dans ce parcours.
                    </p>
                  ) : (
                    <div className="h-[560px] rounded-xl border bg-muted/20">
                      <WorkflowCanvas
                        readOnly
                        definition={{
                          schemaVersion: 1,
                          steps: stepsForView,
                          entry_step_id: entryStepIdForView,
                        }}
                        positions={canvasPositions}
                        onSelectStep={openStepFromCanvas}
                        className="h-full w-full"
                      />
                    </div>
                  )
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="wf-edit-name">Nom</Label>
                      <Input
                        id="wf-edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Icône</Label>
                      <div className="flex flex-wrap gap-2">
                        {WORKFLOW_ICON_KEYS.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setEditIconKey(key)}
                            className={cn(
                              "rounded-lg p-1 ring-2 transition-opacity",
                              editIconKey === key
                                ? "ring-primary opacity-100"
                                : "ring-transparent opacity-70 hover:opacity-100"
                            )}
                            aria-label={key}
                          >
                            <WorkflowListIcon icon={key} color={editColorKey} className="h-9 w-9" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Couleur</Label>
                      <div className="flex flex-wrap gap-2">
                        {WORKFLOW_COLOR_KEYS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColorKey(c)}
                            className={cn(
                              "rounded-full p-1 ring-2",
                              editColorKey === c ? "ring-primary" : "ring-transparent"
                            )}
                            aria-label={c}
                          >
                            <WorkflowListIcon icon={editIconKey} color={c} className="h-8 w-8" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Étapes</Label>
                      <Select
                        open={addStepSelectOpen}
                        onOpenChange={setAddStepSelectOpen}
                        onValueChange={(v) => addStep(v as WorkflowStepType)}
                      >
                        <SelectTrigger className="w-full max-w-sm">
                          <SelectValue placeholder="Ajouter une étape" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKFLOW_STEP_TYPES_BUILDER_UI.map((t) => (
                            <SelectItem key={t} value={t}>
                              {getStepLabel(t).label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {steps.length === 0 ? (
                        <AnimatePresence>
                          <motion.div
                            key="empty"
                            initial={detailReduceMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={detailReduceMotion ? undefined : { opacity: 0, y: -4 }}
                            transition={
                              detailReduceMotion ? { duration: 0 } : { duration: 0.25 }
                            }
                            className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center"
                          >
                            <p className="max-w-sm text-sm text-muted-foreground">
                              Ajoutez des attentes, messages WhatsApp ou pauses pour composer votre parcours.
                            </p>
                            <Button
                              type="button"
                              className="mt-4"
                              variant="default"
                              onClick={() => setAddStepSelectOpen(true)}
                            >
                              Ajouter une première étape
                            </Button>
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-[560px] rounded-xl border bg-muted/20">
                            <WorkflowCanvas
                              definition={{ schemaVersion: 1, steps }}
                              positions={canvasPositions}
                              onPositionsChange={commitCanvasPositions}
                              onSelectStep={openStepFromCanvas}
                              className="h-full w-full"
                            />
                          </div>
                          <details className="rounded-md border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                            <summary className="cursor-pointer select-none font-medium">
                              Liste des étapes ({steps.length})
                            </summary>
                            <ul className="mt-2 space-y-1">
                              {steps.map((s, i) => (
                                <li
                                  key={s.id}
                                  className="flex items-center justify-between gap-2 rounded border bg-card px-2 py-1"
                                >
                                  <span className="truncate">
                                    <span className="tabular-nums text-muted-foreground">
                                      {i + 1}.
                                    </span>{" "}
                                    <span className="text-foreground">
                                      {getStepLabel(s.type).label}
                                    </span>
                                  </span>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => removeStep(i)}
                                    aria-label="Supprimer l'étape"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </details>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t pt-4">
                      <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit}>
                        Annuler
                      </Button>
                      <Button type="button" disabled={saving} onClick={() => void saveChanges()}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Sauvegarder
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs" className="mt-4 space-y-6">
            {!published ? (
              <p className="text-sm text-muted-foreground">
                Les exécutions apparaîtront une fois le parcours enregistré et prêt.
              </p>
            ) : null}

            {published && (
              <div className="space-y-4 rounded-xl border border-violet-300/60 bg-gradient-to-br from-violet-50/95 via-violet-50/40 to-background p-4 shadow-sm dark:border-violet-800/50 dark:from-violet-950/40 dark:via-violet-950/20 dark:to-background">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">
                      Portée d’exécution
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-violet-900/75 dark:text-violet-200/70">
                      Choisissez la liste (lancement) pour filtrer les contacts, la progression globale et les
                      indicateurs ci‑dessous. Sans filtre, les totaux portent sur toutes les exécutions récentes
                      chargées.
                    </p>
                  </div>
                  <div className="w-full shrink-0 sm:w-[min(100%,280px)]">
                    <Label className="text-xs text-violet-900/80 dark:text-violet-200/80">Liste ciblée</Label>
                    <Select
                      value={listFilter ?? "__all__"}
                      onValueChange={(v) => setListFilter(v === "__all__" ? null : v)}
                    >
                      <SelectTrigger className="mt-1 border-violet-200 bg-white/80 dark:border-violet-800 dark:bg-violet-950/40">
                        <SelectValue placeholder="Toutes les sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Toutes les sources</SelectItem>
                        {(wfStats?.available_lists ?? []).map((l) => (
                          <SelectItem key={l.bdd_id} value={l.bdd_id}>
                            {l.name} ({l.run_count})
                          </SelectItem>
                        ))}
                        {(wfStats?.unassigned_run_count ?? 0) > 0 ? (
                          <SelectItem value="__none__">
                            Sans liste ({wfStats?.unassigned_run_count})
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {wfStats?.runs_scan_truncated ? (
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Aperçu basé sur les dernières exécutions chargées — les totaux peuvent être tronqués si vous
                    avez un très grand volume.
                  </p>
                ) : null}

                <div className="rounded-lg border border-violet-200/80 bg-white/70 p-3 dark:border-violet-800/50 dark:bg-violet-950/30">
                  <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-violet-800 dark:text-violet-300">
                        Progression des étapes (liste)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Part des étapes déjà réalisées sur l’ensemble des contacts de cette portée.
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums text-violet-950 dark:text-violet-100">
                      {statsLoading
                        ? "—"
                        : wfStats?.runs_total === 0
                          ? "—"
                          : wfStats?.steps_progress_pct != null
                            ? `${wfStats.steps_progress_pct} %`
                            : "—"}
                    </span>
                  </div>
                  <Progress
                    value={
                      statsLoading || !wfStats?.runs_total
                        ? 0
                        : (wfStats.steps_progress_pct ?? 0)
                    }
                    className="h-2.5 bg-violet-200/60 dark:bg-violet-900/50"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Parcours terminés (statut) :{" "}
                    <span className="font-medium text-foreground">
                      {statsLoading
                        ? "—"
                        : wfStats?.runs_completed_pct != null
                          ? `${wfStats.runs_completed_pct} %`
                          : "—"}
                    </span>
                    {" · "}
                    Exécutions dans cette portée :{" "}
                    <span className="font-medium text-foreground">
                      {statsLoading ? "—" : wfStats?.runs_total ?? "—"}
                    </span>
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-3 py-2.5 dark:border-emerald-900/45 dark:bg-emerald-950/35">
                    <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">Exécutions</p>
                    <p className="text-2xl font-semibold tabular-nums text-emerald-950 dark:text-emerald-50">
                      {statsLoading ? "—" : wfStats?.runs_total ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-200/90 bg-sky-50/90 px-3 py-2.5 dark:border-sky-900/45 dark:bg-sky-950/35">
                    <p className="text-xs font-medium text-sky-900 dark:text-sky-200">En cours</p>
                    <p className="text-2xl font-semibold tabular-nums text-sky-950 dark:text-sky-50">
                      {statsLoading
                        ? "—"
                        : (wfStats?.runs_by_status?.running ?? 0) +
                          (wfStats?.runs_by_status?.pending ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 dark:border-amber-900/45 dark:bg-amber-950/35">
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-200">File</p>
                    <p className="text-2xl font-semibold tabular-nums text-amber-950 dark:text-amber-50">
                      {statsLoading ? "—" : wfStats?.queue.pending_steps ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-200/90 bg-orange-50/85 px-3 py-2.5 dark:border-orange-900/45 dark:bg-orange-950/35">
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-200">En traitement</p>
                    <p className="text-2xl font-semibold tabular-nums text-orange-950 dark:text-orange-50">
                      {statsLoading ? "—" : wfStats?.queue.processing_steps ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-rose-200/90 bg-rose-50/90 px-3 py-2.5 dark:border-rose-900/45 dark:bg-rose-950/35">
                    <p className="text-xs font-medium text-rose-900 dark:text-rose-200">Échecs</p>
                    <p className="text-2xl font-semibold tabular-nums text-rose-950 dark:text-rose-50">
                      {statsLoading ? "—" : wfStats?.failed_runs_count ?? "—"}
                    </p>
                  </div>
                </div>

                {!statsLoading &&
                wfStats?.sample_errors?.length &&
                wfStats.sample_errors.length > 0 ? (
                  <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 p-3 dark:border-rose-900/40 dark:bg-rose-950/25">
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                      Derniers messages d’erreur (parcours)
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-rose-950 dark:text-rose-100">
                      {wfStats.sample_errors.map((err, i) => (
                        <li key={`${err.prospect_id}-${i}`} className="break-words">
                          <Link
                            href={`/prospect/${err.prospect_id}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            Prospect
                          </Link>
                          {" — "}
                          {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {published && (
              <ActivityFeed
                title="Journal d’exécution"
                items={statsFeedItems}
                emptyMessage="Aucun événement récent sur cet onglet (actualisation automatique toutes les 8 s)."
              />
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Contacts en parcours</CardTitle>
                <Button variant="outline" size="sm" onClick={() => loadRuns()} disabled={runsLoading}>
                  {runsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rafraîchir"}
                </Button>
              </CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune exécution pour l’instant.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Listes</TableHead>
                        <TableHead>Progression</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Démarré</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((r) => {
                        const labels = r.enrollment_list_labels ?? [];
                        const total = r.steps_total ?? 0;
                        const done = r.steps_completed ?? 0;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              {r.prospect?.full_name ?? r.prospect_id.slice(0, 8)}
                            </TableCell>
                            <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                              {labels.length ? (
                                <span className="line-clamp-2" title={labels.join(", ")}>
                                  {labels.join(" · ")}
                                </span>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="tabular-nums text-sm">
                              {total > 0 ? `${done} / ${total} étapes` : "—"}
                            </TableCell>
                            <TableCell>{RUN_STATUS_LABELS[r.status] ?? r.status}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(r.created_at).toLocaleString("fr-FR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => openRunSheet(r.id)}>
                                Détail
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Supprimer ce parcours ?"
          description="Tout l’historique et les exécutions associées seront supprimés."
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={confirmDelete}
        />

        {editWaitIndex != null && steps[editWaitIndex]?.type === "wait" && (
          <WorkflowStepWaitModal
            open
            onOpenChange={(o) => !o && setEditWaitIndex(null)}
            durationHours={
              (steps[editWaitIndex].config as { durationHours: number }).durationHours
            }
            onlyIfNoReply={
              (steps[editWaitIndex].config as { onlyIfNoReply?: boolean }).onlyIfNoReply
            }
            onSave={(hours, onlyIfNoReply) =>
              updateStepConfig(editWaitIndex, { durationHours: hours, onlyIfNoReply })
            }
          />
        )}

        {editMsgIndex != null && msgStep && (
          <WorkflowStepMessageModal
            open
            onOpenChange={(o) => !o && setEditMsgIndex(null)}
            stepType={msgStep}
            initialMessage={
              (steps[editMsgIndex].config as { messageTemplate?: string }).messageTemplate ?? ""
            }
            onSave={(msg) => updateStepConfig(editMsgIndex, { messageTemplate: msg })}
            isPremium={linkedinIsPremium}
          />
        )}

        <Sheet open={!!sheetRunId} onOpenChange={(o) => !o && setSheetRunId(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Détail de l’exécution</SheetTitle>
            </SheetHeader>
            {sheetLoading && (
              <div className="mt-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {!sheetLoading && sheetData && (
              <div className="mt-6 space-y-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Prospect : </span>
                  {(sheetData.run.prospect as { full_name?: string } | null)?.full_name ??
                    String(sheetData.run.prospect_id ?? "")}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Statut : </span>
                  {RUN_STATUS_LABELS[String(sheetData.run.status)] ?? String(sheetData.run.status)}
                </p>
                {sheetData.run.last_error ? (
                  <p className="text-sm text-destructive">{String(sheetData.run.last_error)}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {sheetData.run.status === "running" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => patchRun(String(sheetData.run.id), "pause")}
                    >
                      Pause
                    </Button>
                  )}
                  {sheetData.run.status === "paused" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => patchRun(String(sheetData.run.id), "resume")}
                    >
                      Reprendre
                    </Button>
                  )}
                  {sheetData.run.status !== "completed" &&
                    sheetData.run.status !== "cancelled" &&
                    sheetData.run.status !== "failed" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => patchRun(String(sheetData.run.id), "cancel")}
                      >
                        Annuler
                      </Button>
                    )}
                </div>
                <h3 className="text-sm font-medium">Étapes</h3>
                <ul className="space-y-2 text-sm">
                  {(sheetData.executions ?? []).map((ex) => (
                    <li key={String(ex.id)} className="rounded-md border p-2">
                      <div className="font-medium">
                        #{Number(ex.step_index) + 1} — {getStepLabel(String(ex.step_type)).label} —{" "}
                        {EXEC_STATUS_LABELS[String(ex.status)] ?? String(ex.status)}
                      </div>
                      {ex.last_error ? (
                        <div className="mt-1 text-xs text-destructive">{String(ex.last_error)}</div>
                      ) : null}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {ex.processed_at
                          ? `Traité : ${new Date(String(ex.processed_at)).toLocaleString("fr-FR")}`
                          : ex.run_after
                            ? `Prévu : ${new Date(String(ex.run_after)).toLocaleString("fr-FR")}`
                            : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <WorkflowListEnrollModal
          open={enrollModalOpen}
          onOpenChange={setEnrollModalOpen}
          workflowId={workflowId}
          onSuccess={() => {
            void queryClient.invalidateQueries({
              queryKey: ["workflow-stats", workflowId],
              exact: false,
            });
            void loadRuns();
            void loadWorkflow();
          }}
        />
      </div>
    </div>
  );
}
