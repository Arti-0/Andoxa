"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, GitBranch, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkflowStep } from "@/lib/workflows/schema";
import { getStepLabel, getStepTypeLucideIcon } from "@/lib/workflows";
import { cn } from "@/lib/utils";

const PREVIEW_LEN = 60;

// ─── Graph traversal helpers ─────────────────────────────────────────────────

type ConditionStep = WorkflowStep & {
  type: "condition";
  on_true_id?: string;
  on_false_id?: string;
  next_id?: string;
};

type AnyStepWithNext = WorkflowStep & { next_id?: string };

type TimelineNode =
  | { kind: "step"; step: WorkflowStep; index: number }
  | {
      kind: "condition";
      step: ConditionStep;
      trueChain: WorkflowStep[];
      falseChain: WorkflowStep[];
      index: number;
    };

/** Follow next_id from startId, collecting steps NOT already in mainPathIds. */
function collectBranchChain(
  stepMap: Map<string, WorkflowStep>,
  startId: string | undefined,
  mainPathIds: Set<string>
): WorkflowStep[] {
  const chain: WorkflowStep[] = [];
  const visited = new Set<string>();
  let current = startId ? stepMap.get(startId) : undefined;
  while (current && !mainPathIds.has(current.id) && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current);
    current = (current as AnyStepWithNext).next_id
      ? stepMap.get((current as AnyStepWithNext).next_id!)
      : undefined;
  }
  return chain;
}

function buildTimelineNodes(
  steps: WorkflowStep[],
  entryStepId?: string
): TimelineNode[] {
  if (!steps.length) return [];

  // Linear mode — no entry_step_id
  if (!entryStepId) {
    return steps.map((s, i) => ({ kind: "step", step: s, index: i }));
  }

  const stepMap = new Map<string, WorkflowStep>(steps.map((s) => [s.id, s]));

  // Collect main-path IDs (the spine: entry → next_id chain at top level)
  const mainPathIds = new Set<string>();
  let cur: WorkflowStep | undefined = stepMap.get(entryStepId);
  while (cur && !mainPathIds.has(cur.id)) {
    mainPathIds.add(cur.id);
    cur = (cur as AnyStepWithNext).next_id
      ? stepMap.get((cur as AnyStepWithNext).next_id!)
      : undefined;
  }

  // Walk main path and build nodes
  const nodes: TimelineNode[] = [];
  let idx = 0;
  cur = stepMap.get(entryStepId);
  const visited = new Set<string>();

  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);

    if (cur.type === "condition") {
      const condStep = cur as ConditionStep;
      nodes.push({
        kind: "condition",
        step: condStep,
        trueChain: collectBranchChain(stepMap, condStep.on_true_id, mainPathIds),
        falseChain: collectBranchChain(stepMap, condStep.on_false_id, mainPathIds),
        index: idx++,
      });
      cur = condStep.next_id ? stepMap.get(condStep.next_id) : undefined;
    } else {
      nodes.push({ kind: "step", step: cur, index: idx++ });
      cur = (cur as AnyStepWithNext).next_id
        ? stepMap.get((cur as AnyStepWithNext).next_id!)
        : undefined;
    }
  }

  return nodes;
}

// ─── Step card helpers ───────────────────────────────────────────────────────

function afterStepConnectorCopy(step: WorkflowStep): string | null {
  if (step.type !== "wait") return null;
  const h = (step.config as { durationHours?: number }).durationHours ?? 0;
  const onlyIfNoReply = Boolean(
    (step.config as { onlyIfNoReply?: boolean }).onlyIfNoReply
  );
  let line: string;
  if (h >= 24 && h % 24 === 0) {
    const d = h / 24;
    line = d <= 1 ? "Après 1 jour" : `Après ${d} jours`;
  } else if (h <= 1) {
    line = "Après 1 heure";
  } else {
    line = `Après ${h} heures`;
  }
  if (onlyIfNoReply) line = `${line} (si pas de réponse)`;
  return line;
}

function stepCardSecondaryLine(step: WorkflowStep): string {
  if (step.type === "wait") {
    const onlyIfNoReply = Boolean(
      (step.config as { onlyIfNoReply?: boolean }).onlyIfNoReply
    );
    return onlyIfNoReply ? "Condition : pas de réponse" : " ";
  }
  if (step.type === "condition") return "Le prospect a répondu ?";
  const t = (step.config as { messageTemplate?: string }).messageTemplate ?? "";
  const s = t.replace(/\s+/g, " ").trim();
  if (!s) {
    if (step.type === "linkedin_invite") return "Sans note d'invitation";
    return "Configurer le message…";
  }
  return s.length > PREVIEW_LEN ? `${s.slice(0, PREVIEW_LEN)}…` : s;
}

function TimelineStepCard({
  step,
  index,
  reduceMotion,
  variant,
  dragHandleProps,
  dragHandleRef,
  isDragging,
  onActivate,
  trailing,
}: {
  step: WorkflowStep;
  index: number;
  reduceMotion: boolean;
  variant: "readonly" | "sortable" | "overlay";
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: (node: HTMLButtonElement | null) => void;
  isDragging?: boolean;
  onActivate?: () => void;
  trailing?: ReactNode;
}) {
  const Icon = getStepTypeLucideIcon(step.type);
  const label = getStepLabel(step.type).label;
  const secondary = stepCardSecondaryLine(step);

  const body = (
    <>
      {dragHandleProps ? (
        <button
          type="button"
          className="mt-0.5 flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-dashed border-muted-foreground/25 text-muted-foreground hover:bg-muted/50 active:cursor-grabbing"
          ref={dragHandleRef}
          {...dragHandleProps}
          aria-label="Réordonner"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground ring-2 ring-background">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {index + 1}.
            </span>
            <span className="font-medium leading-none">{label}</span>
          </div>
          <p
            className={cn(
              "mt-1.5 text-sm text-muted-foreground",
              step.type === "wait" && secondary.trim() === "" && "min-h-[1.25rem]"
            )}
          >
            {step.type === "wait" ? (
              secondary.trim() ? (
                secondary
              ) : (
                <span className="text-muted-foreground/50"> </span>
              )
            ) : (
              secondary
            )}
          </p>
        </div>
      </div>
      {onActivate ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onActivate}
          aria-label="Modifier l'étape"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      ) : null}
      {trailing}
    </>
  );

  const cardClass = cn(
    "relative flex min-w-0 flex-1 gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-border/60",
    variant === "overlay" && "shadow-lg ring-2 ring-primary/30 scale-[1.02]"
  );

  if (variant === "sortable") {
    return (
      <div
        className={cn(
          cardClass,
          isDragging && "opacity-40"
        )}
      >
        {body}
      </div>
    );
  }

  if (variant === "overlay") {
    return <div className={cardClass}>{body}</div>;
  }

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.08 }
      }
      className={cardClass}
    >
      {body}
    </motion.div>
  );
}

function Connector({ text, reduceMotion }: { text: string | null; reduceMotion: boolean }) {
  return (
    <div className="relative flex min-h-[2.5rem] items-stretch pl-[22px]">
      <div className="absolute bottom-0 left-[10px] top-0 w-px bg-border" aria-hidden />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        className="flex flex-1 items-center py-1 pl-6"
      >
        <span
          className={cn(
            "text-xs font-medium leading-snug",
            text ? "text-primary" : "text-muted-foreground/60"
          )}
        >
          {text ?? "Puis"}
        </span>
      </motion.div>
    </div>
  );
}

/** Mini branch step card used inside the OUI/NON panels. */
function BranchStepMini({ step, index }: { step: WorkflowStep; index: number }) {
  const Icon = getStepTypeLucideIcon(step.type);
  const label = getStepLabel(step.type).label;
  const secondary = stepCardSecondaryLine(step);
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-card p-3 shadow-xs">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium leading-none">
          <span className="tabular-nums text-muted-foreground">{index + 1}.&nbsp;</span>
          {label}
        </p>
        {secondary.trim() ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{secondary}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Condition node rendered in the read-only timeline: shows OUI and NON branch columns. */
function ConditionTimelineNode({
  node,
  reduceMotion,
  isLast,
}: {
  node: Extract<TimelineNode, { kind: "condition" }>;
  reduceMotion: boolean;
  isLast: boolean;
}) {
  return (
    <>
      {/* Condition header card */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.2, delay: node.index * 0.05 }
        }
        className="relative flex gap-0"
      >
        <div className="relative flex w-10 shrink-0 flex-col items-center pt-1">
          <div className="z-[1] h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
          <div className="min-h-[2rem] w-px flex-1 bg-border" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pb-2">
          <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs ring-1 ring-border/60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground ring-2 ring-background">
              <GitBranch className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {node.index + 1}.
                </span>
                <span className="font-medium leading-none">Condition</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">Le prospect a répondu ?</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Branch columns */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2, delay: node.index * 0.05 + 0.1 }}
        className="relative flex gap-0"
      >
        {/* Vertical spine */}
        <div className="relative flex w-10 shrink-0 flex-col items-center">
          <div className="w-px flex-1 bg-border" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pb-4 pl-4">
          <div className="grid grid-cols-2 gap-3">
            {/* OUI branch */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ OUI</p>
              {node.trueChain.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune étape.</p>
              ) : (
                <div className="space-y-2">
                  {node.trueChain.map((s, i) => (
                    <BranchStepMini key={s.id} step={s} index={i} />
                  ))}
                </div>
              )}
            </div>
            {/* NON branch */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">✗ NON</p>
              {node.falseChain.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucune étape.</p>
              ) : (
                <div className="space-y-2">
                  {node.falseChain.map((s, i) => (
                    <BranchStepMini key={s.id} step={s} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Spine continuation / end dot */}
      {isLast ? (
        <div className="flex gap-0">
          <div className="relative flex w-10 shrink-0 flex-col items-center">
            <div className="z-[1] h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
          </div>
          <div className="pb-2 pl-4">
            <p className="text-xs text-muted-foreground">Fin du parcours</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

// ─── Public components ────────────────────────────────────────────────────────

export function WorkflowParcoursReadOnlyTimeline({
  steps,
  entryStepId,
}: {
  steps: WorkflowStep[];
  entryStepId?: string;
}) {
  const reduceMotion = useReducedMotion() ?? false;

  const nodes = useMemo(
    () => buildTimelineNodes(steps, entryStepId),
    [steps, entryStepId]
  );

  if (!steps.length) {
    return <p className="text-sm text-muted-foreground">Aucune étape.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      {nodes.map((node, ni) => {
        const isLast = ni === nodes.length - 1;

        if (node.kind === "condition") {
          return (
            <Fragment key={node.step.id}>
              <ConditionTimelineNode
                node={node}
                reduceMotion={reduceMotion}
                isLast={isLast}
              />
              {!isLast ? (
                <Connector text={null} reduceMotion={reduceMotion} />
              ) : null}
            </Fragment>
          );
        }

        const step = node.step;
        return (
          <Fragment key={step.id}>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.2, delay: ni * 0.05 }
              }
              className="relative flex gap-0"
            >
              <div className="relative flex w-10 shrink-0 flex-col items-center pt-1">
                <div className="z-[1] h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                {!isLast ? (
                  <div className="min-h-[2rem] w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pb-6">
                <TimelineStepCard
                  step={step}
                  index={node.index}
                  reduceMotion={reduceMotion}
                  variant="readonly"
                />
              </div>
            </motion.div>
            {!isLast ? (
              <Connector text={afterStepConnectorCopy(step)} reduceMotion={reduceMotion} />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}

function SortableStepRow({
  step,
  index,
  total,
  reduceMotion,
  onEdit,
  onRemove,
  showDropBefore,
}: {
  step: WorkflowStep;
  index: number;
  total: number;
  reduceMotion: boolean;
  onEdit: () => void;
  onRemove: () => void;
  showDropBefore: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 2 : undefined,
  };

  const isLast = index === total - 1;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {showDropBefore ? (
        <div
          className="absolute -top-1 left-0 right-0 z-10 h-0.5 rounded-full bg-primary shadow-sm"
          aria-hidden
        />
      ) : null}
      <div className="relative flex gap-0">
        <div className="relative flex w-10 shrink-0 flex-col items-center pt-1">
          <div className="z-[1] h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
          {!isLast ? (
            <div className="min-h-[2rem] w-px flex-1 bg-border" aria-hidden />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 pb-2">
          <TimelineStepCard
            step={step}
            index={index}
            reduceMotion={reduceMotion}
            variant="sortable"
            isDragging={isDragging}
            dragHandleProps={{ ...attributes, ...listeners } as HTMLAttributes<HTMLButtonElement>}
            dragHandleRef={setActivatorNodeRef}
            onActivate={onEdit}
            trailing={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label="Supprimer l'étape"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>
      {!isLast ? (
        <Connector text={afterStepConnectorCopy(step)} reduceMotion={reduceMotion} />
      ) : null}
    </div>
  );
}

export function WorkflowParcoursEditTimeline({
  steps,
  onReorder,
  onEditStep,
  onRemoveStep,
}: {
  steps: WorkflowStep[];
  onReorder: (next: WorkflowStep[]) => void;
  onEditStep: (index: number) => void;
  onRemoveStep: (index: number) => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeIndex = useMemo(
    () => (activeId ? steps.findIndex((s) => s.id === activeId) : -1),
    [activeId, steps]
  );
  const overIndex = useMemo(
    () => (overId ? steps.findIndex((s) => s.id === overId) : -1),
    [overId, steps]
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
  };

  const handleDragOver = (e: DragOverEvent) => {
    if (e.over?.id) setOverId(String(e.over.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(steps, oldIndex, newIndex));
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const activeStep = activeId ? steps.find((s) => s.id === activeId) : null;

  /** Ligne d'insertion au-dessus de la ligne survolée (cible de dépôt). */
  const showLineBefore = (index: number) => {
    if (!activeId || overIndex < 0 || activeIndex < 0 || activeIndex === overIndex) return false;
    return overIndex === index;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="mx-auto w-full max-w-xl">
          <AnimatePresence initial={false} mode="popLayout">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                layout={!reduceMotion}
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                className="relative"
              >
                <SortableStepRow
                  step={step}
                  index={index}
                  total={steps.length}
                  reduceMotion={reduceMotion}
                  onEdit={() => onEditStep(index)}
                  onRemove={() => onRemoveStep(index)}
                  showDropBefore={showLineBefore(index)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
      <DragOverlay adjustScale={false}>
        {activeStep ? (
          <div className="max-w-xl opacity-95">
            <TimelineStepCard
              step={activeStep}
              index={activeIndex}
              reduceMotion={reduceMotion}
              variant="overlay"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
