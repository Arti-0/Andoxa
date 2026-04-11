"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Smartphone,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  WORKFLOW_COLOR_KEYS,
  WORKFLOW_ICON_KEYS,
  type WorkflowColorKey,
  type WorkflowIconKey,
} from "@/lib/workflows";
import { WorkflowStepWaitModal } from "./workflow-step-wait-modal";
import { WorkflowStepMessageModal } from "./workflow-step-message-modal";
import type { WorkflowStep, WorkflowStepType } from "@/lib/workflows/schema";
import { WORKFLOW_STEP_TYPES } from "@/lib/workflows/schema";
import { WorkflowListIcon } from "./workflow-list-icon";
import { useLinkedInAccount } from "@/hooks/use-linkedin-account";

const STEP_TYPE_LABELS: Record<WorkflowStepType, string> = {
  wait: "Attente",
  linkedin_invite: "Invitation LinkedIn",
  linkedin_message: "Message LinkedIn",
  whatsapp_message: "Message WhatsApp",
};

const STEP_TYPE_ICONS: Record<WorkflowStepType, typeof Clock> = {
  wait: Clock,
  linkedin_invite: UserPlus,
  linkedin_message: MessageSquare,
  whatsapp_message: Smartphone,
};

/** Pastilles pleines pour le sélecteur de couleur (ronds, pas l’icône dans un carré). */
const COLOR_SWATCH_CLASS: Record<WorkflowColorKey, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
};

const PICKER_CELL = "flex size-11 shrink-0 items-center justify-center ring-2 ring-offset-2 ring-offset-background transition-opacity";

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

function stepSummary(step: WorkflowStep): string {
  if (step.type === "wait") {
    const h = (step.config as { durationHours?: number }).durationHours ?? 0;
    return `${h} h`;
  }
  const t = (step.config as { messageTemplate?: string }).messageTemplate ?? "";
  const s = t.replace(/\s+/g, " ").trim();
  if (!s) {
    if (step.type === "linkedin_invite") return "Sans note d’invitation";
    return "Configurer le message…";
  }
  return s.length > 56 ? `${s.slice(0, 56)}…` : s;
}

export function WorkflowNewPageClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<WorkflowIconKey>("Workflow");
  const [colorKey, setColorKey] = useState<WorkflowColorKey>("violet");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editWaitIndex, setEditWaitIndex] = useState<number | null>(null);
  const [editMsgIndex, setEditMsgIndex] = useState<number | null>(null);
  const { data: linkedInAccount } = useLinkedInAccount();
  const linkedinIsPremium = linkedInAccount?.linkedin_is_premium ?? false;

  const definitionPayload = useMemo(
    () => ({ schemaVersion: 1 as const, steps }),
    [steps]
  );

  const addStep = (type: WorkflowStepType) => {
    setSteps((prev) => [
      ...prev,
      { id: newStepId(), type, config: defaultConfigForType(type) } as WorkflowStep,
    ]);
  };

  const removeStep = (index: number) => setSteps((prev) => prev.filter((_, i) => i !== index));

  const moveStep = (index: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const updateStepConfig = (index: number, patch: Record<string, unknown>) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index ? ({ ...s, config: { ...s.config, ...patch } } as WorkflowStep) : s
      )
    );
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Indiquez un nom.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmed,
          draft_definition: definitionPayload,
          ui: { icon: iconKey, color: colorKey },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message ?? "Enregistrement impossible");
      }
      const id = json.data.id as string;
      toast.success("Workflow enregistré");
      router.push(`/workflows/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const msgStep =
    editMsgIndex != null && steps[editMsgIndex]
      ? (steps[editMsgIndex].type as "linkedin_invite" | "linkedin_message" | "whatsapp_message")
      : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/workflows" aria-label="Retour">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">Nouveau parcours</p>
              <p className="text-xs text-muted-foreground">
                Après enregistrement, vous accédez à la fiche du parcours : vous y choisissez les listes et
                lancez le parcours pour vos contacts.
              </p>
            </div>
          </div>
          <Button type="button" disabled={submitting} onClick={handleSave}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nom et repère visuel</CardTitle>
              <CardDescription>Pour retrouver le workflow dans la liste.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wf-name">Nom</Label>
                <Input
                  id="wf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Relance LinkedIn J+3"
                />
              </div>
              <div className="space-y-2">
                <Label>Icône</Label>
                <div className="flex flex-wrap gap-2">
                  {WORKFLOW_ICON_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIconKey(key)}
                      className={cn(
                        PICKER_CELL,
                        "rounded-lg",
                        iconKey === key
                          ? "ring-primary opacity-100"
                          : "ring-transparent opacity-70 hover:opacity-100"
                      )}
                      aria-label={key}
                    >
                      <WorkflowListIcon icon={key} color={colorKey} className="h-9 w-9" />
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
                      onClick={() => setColorKey(c)}
                      className={cn(
                        PICKER_CELL,
                        "rounded-full",
                        colorKey === c ? "ring-primary opacity-100" : "ring-transparent opacity-80 hover:opacity-100"
                      )}
                      aria-label={c}
                    >
                      <span
                        className={cn(
                          "size-8 shrink-0 rounded-full shadow-sm ring-1 ring-black/10 dark:ring-white/15",
                          COLOR_SWATCH_CLASS[c]
                        )}
                        aria-hidden
                      />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parcours</CardTitle>
              <CardDescription className="text-pretty">
                Construisez la séquence d’actions pour chaque contact : attentes, invitations et messages
                s’enchaînent dans l’ordre affiché. Le détail de chaque message s’édite dans la fenêtre
                dédiée ; des raccourcis pour les champs du contact y sont proposés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Ajouter une étape</Label>
                <Select onValueChange={(v) => addStep(v as WorkflowStepType)}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Choisir le type d’étape…" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_STEP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {STEP_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-10 space-y-4">
                {steps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune étape pour l’instant.</p>
                ) : (
                  <div className="flex flex-col items-center gap-0">
                    {steps.map((step, index) => (
                      <div key={step.id} className="w-full max-w-lg">
                        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-xs">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            onClick={() => {
                              if (step.type === "wait") setEditWaitIndex(index);
                              else setEditMsgIndex(index);
                            }}
                          >
                            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              {(() => {
                                const Icon = STEP_TYPE_ICONS[step.type];
                                return <Icon className="h-4 w-4" />;
                              })()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="font-medium">{STEP_TYPE_LABELS[step.type]}</span>
                              <p className="truncate text-sm text-muted-foreground">{stepSummary(step)}</p>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveStep(index, -1)}
                              disabled={index === 0}
                              aria-label="Monter"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => moveStep(index, 1)}
                              disabled={index === steps.length - 1}
                              aria-label="Descendre"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeStep(index)}
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {index < steps.length - 1 ? (
                          <div className="flex justify-center py-2">
                            <ArrowDown className="h-5 w-5 text-muted-foreground" aria-hidden />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </div>
  );
}
