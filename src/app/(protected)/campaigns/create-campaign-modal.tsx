"use client";

// 4-step campaign creation wizard.
//
// Flow:
//   1. Prospects — pick a BDD (list) + refinements (exclude contacted /
//      only with phone / exclude already in active campaigns).
//   2. Type & name — pick invitation_only / message_only / invitation_message
//      and a campaign name.
//   3. Configuration — write the invite note and/or the message with variable
//      pills + a text preview.
//   4. Recap — review + create (or save as draft).
//
// The previous flow created a draft with no targets and required the user to
// add prospects on the detail page. The wizard keeps that path open via
// "Enregistrer en brouillon" on steps 2-4.
//
// API: POST /api/campaigns/jobs now accepts `bdd_id` + refinement booleans;
// the server resolves prospect ids workspace-scoped and applies the refinements.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Linkedin,
  MessageSquare,
  UserPlus,
  Workflow,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { applyMessageVariables } from "@/lib/messaging/template-variables";

export type LinkedInCampaignType =
  | "invitation_only"
  | "message_only"
  | "invitation_message";

export interface CreateCampaignPayload {
  type: LinkedInCampaignType;
  name: string;
  /** When set, server resolves prospect_ids from this bdd + the refinements. */
  bdd_id?: string;
  refine_exclude_contacted?: boolean;
  refine_only_with_phone?: boolean;
  refine_exclude_active?: boolean;
  /** Invitation note (markdown not supported). Sent only when hasNote=true. */
  invitation_note?: string;
  /** Message body (for message_only / invitation_message). */
  message?: string;
}

// ─── Types tiles ─────────────────────────────────────────────────────────────
const TYPES: {
  id: LinkedInCampaignType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}[] = [
  {
    id: "invitation_only",
    label: "Invitation seule",
    description: "Envoyer une demande de connexion, avec ou sans note.",
    icon: UserPlus,
  },
  {
    id: "message_only",
    label: "Message",
    description: "Envoyer un message direct à des prospects 1er niveau.",
    icon: MessageSquare,
  },
  {
    id: "invitation_message",
    label: "Invitation + Message",
    description: "Invitation puis message si elle est acceptée.",
    icon: Workflow,
    recommended: true,
  },
];

// ─── Variable pills ──────────────────────────────────────────────────────────
const VARIABLES = [
  { token: "{{firstName}}", label: "Prénom" },
  { token: "{{lastName}}", label: "Nom" },
  { token: "{{company}}", label: "Société" },
  { token: "{{jobTitle}}", label: "Poste" },
  { token: "{{bookingLink}}", label: "Lien booking" },
];

const PREVIEW_PROSPECT = {
  full_name: "Marie Dupont",
  company: "Acme",
  job_title: "CTO",
};
const PREVIEW_BOOKING_LINK = "andoxa.fr/booking/vous";

function applyPreviewVars(text: string): string {
  return applyMessageVariables(text, PREVIEW_PROSPECT, {
    bookingLink: PREVIEW_BOOKING_LINK,
  });
}

/**
 * Inserts `token` at the textarea's caret position (or replaces selection),
 * then moves the caret to the end of the inserted token. Falls back to
 * append-at-end if the ref isn't attached yet.
 */
function insertAtCaret(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  current: string,
  token: string,
  setValue: (v: string) => void,
) {
  const el = ref.current;
  if (!el) {
    setValue(current + token);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);
  setValue(next);
  // Re-focus + reposition caret right after the inserted token. Wrapped in a
  // microtask so React has flushed the controlled value before we set selection.
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + token.length;
    el.setSelectionRange(pos, pos);
  });
}

// ─── Bdds (lists) hook ───────────────────────────────────────────────────────
interface BddRow {
  id: string;
  name: string;
  prospect_count?: number | null;
  contacted_count?: number | null;
}

function useBddOptions(open: boolean) {
  return useQuery({
    queryKey: ["campaigns", "wizard-bdds"] as const,
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/bdd?page=1&pageSize=200", {
        credentials: "include",
      });
      if (!res.ok) return [] as BddRow[];
      const json = (await res.json()) as {
        items?: BddRow[];
        data?: { items?: BddRow[] };
      };
      return json.items ?? json.data?.items ?? [];
    },
    staleTime: 60_000,
  });
}

// ─── Stepper ────────────────────────────────────────────────────────────────
function Stepper({
  step,
  maxReached,
  onJump,
}: {
  step: number;
  maxReached: number;
  onJump: (s: number) => void;
}) {
  const labels = ["Prospects", "Type", "Configuration", "Récap"];
  return (
    <div className="flex items-center gap-1 border-b px-6 py-3">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = idx === step;
        const done = idx < step;
        const reachable = idx <= maxReached;
        return (
          <button
            key={label}
            type="button"
            onClick={() => reachable && onJump(idx)}
            disabled={!reachable}
            className={cn(
              "group inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              active && "text-foreground",
              done && "text-muted-foreground",
              !active && !done && "text-muted-foreground/60",
              reachable && "cursor-pointer hover:bg-muted",
              !reachable && "cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                active && "bg-[var(--brand-blue)] text-white",
                done && "bg-emerald-500 text-white",
                !active && !done && "border border-border bg-background text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : idx}
            </span>
            {label}
            {idx < labels.length && (
              <span className="ml-1 h-px w-6 bg-border" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function CreateCampaignModal({
  open,
  onOpenChange,
  onCreate,
  onDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateCampaignPayload) => void | Promise<void>;
  onDraft: (data: CreateCampaignPayload) => void | Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [submitting, setSubmitting] = useState<"create" | "draft" | null>(null);

  // Step 1
  const [bddId, setBddId] = useState<string | null>(null);
  const [excludeContacted, setExcludeContacted] = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [excludeActive, setExcludeActive] = useState(true);

  // Step 2
  const [type, setType] = useState<LinkedInCampaignType | null>(null);
  const [name, setName] = useState("");

  // Step 3
  const [hasNote, setHasNote] = useState(false);
  const [invitationNote, setInvitationNote] = useState("");
  const [message, setMessage] = useState("");

  const { data: bdds = [], isLoading: bddsLoading } = useBddOptions(open);

  const reset = () => {
    setStep(1);
    setMaxReached(1);
    setSubmitting(null);
    setBddId(null);
    setExcludeContacted(false);
    setOnlyWithPhone(false);
    setExcludeActive(true);
    setType(null);
    setName("");
    setHasNote(false);
    setInvitationNote("");
    setMessage("");
  };

  // Reset state when modal closes (after a tick so the close animation finishes).
  useEffect(() => {
    if (!open) {
      const t = setTimeout(reset, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const selectedBdd = useMemo(
    () => bdds.find((b) => b.id === bddId) ?? null,
    [bdds, bddId],
  );

  // ── Validation per step ─────────────────────────────────────────────────
  const step1Valid = !!bddId;
  const nameValid = name.trim().length >= 3 && name.trim().length <= 80;
  const step2Valid = !!type && nameValid;
  const step3Valid = (() => {
    if (!type) return false;
    if (type === "invitation_only") {
      return hasNote
        ? invitationNote.trim().length > 0 && invitationNote.length <= 300
        : true;
    }
    if (type === "message_only") {
      return message.trim().length > 0 && message.length <= 2000;
    }
    // invitation_message
    const noteOk =
      !hasNote || (invitationNote.trim().length > 0 && invitationNote.length <= 300);
    return noteOk && message.trim().length > 0 && message.length <= 2000;
  })();

  const goNext = () => {
    const next = Math.min(step + 1, 4);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };
  const goPrev = () => setStep((s) => Math.max(s - 1, 1));

  const buildPayload = (): CreateCampaignPayload => ({
    type: type!,
    name: name.trim(),
    bdd_id: bddId ?? undefined,
    refine_exclude_contacted: excludeContacted,
    refine_only_with_phone: onlyWithPhone,
    refine_exclude_active: excludeActive,
    invitation_note: hasNote ? invitationNote.trim() : undefined,
    message: type === "invitation_only" ? undefined : message.trim(),
  });

  const run = async (kind: "create" | "draft") => {
    if (submitting) return;
    if (!type || !nameValid) return;
    setSubmitting(kind);
    try {
      await (kind === "create" ? onCreate(buildPayload()) : onDraft(buildPayload()));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#0A66C2] text-white">
              <Linkedin className="size-4" />
            </span>
            Créer une campagne LinkedIn
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choisissez les prospects à cibler."}
            {step === 2 && "Sélectionnez la séquence et donnez-lui un nom."}
            {step === 3 && "Rédigez votre message — les variables sont remplacées par les données du prospect."}
            {step === 4 && "Vérifiez les détails puis lancez la campagne."}
          </DialogDescription>
        </DialogHeader>

        <Stepper step={step} maxReached={maxReached} onJump={(n) => setStep(n)} />

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1Prospects
              bdds={bdds}
              loading={bddsLoading}
              selected={bddId}
              onSelect={setBddId}
              excludeContacted={excludeContacted}
              setExcludeContacted={setExcludeContacted}
              onlyWithPhone={onlyWithPhone}
              setOnlyWithPhone={setOnlyWithPhone}
              excludeActive={excludeActive}
              setExcludeActive={setExcludeActive}
            />
          )}
          {step === 2 && (
            <Step2TypeName
              type={type}
              setType={setType}
              name={name}
              setName={setName}
              nameValid={nameValid}
            />
          )}
          {step === 3 && type && (
            <Step3Config
              type={type}
              hasNote={hasNote}
              setHasNote={setHasNote}
              invitationNote={invitationNote}
              setInvitationNote={setInvitationNote}
              message={message}
              setMessage={setMessage}
            />
          )}
          {step === 4 && type && (
            <Step4Recap
              type={type}
              name={name}
              bdd={selectedBdd}
              excludeContacted={excludeContacted}
              onlyWithPhone={onlyWithPhone}
              excludeActive={excludeActive}
              hasNote={hasNote}
              invitationNote={invitationNote}
              message={message}
            />
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t bg-muted/30 px-6 py-3 sm:flex-row sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Étape <strong className="text-foreground">{step}</strong> sur 4
          </div>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={!!submitting}
              >
                <ArrowLeft className="size-3.5" />
                Précédent
              </Button>
            )}
            {step >= 2 && step <= 3 && (
              <Button
                variant="outline"
                onClick={() => void run("draft")}
                disabled={!type || !nameValid || !!submitting}
              >
                {submitting === "draft" ? "Enregistrement…" : "Brouillon"}
              </Button>
            )}
            {step < 4 && (
              <Button
                onClick={goNext}
                disabled={
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid) ||
                  (step === 3 && !step3Valid)
                }
              >
                Continuer
                <ArrowRight className="size-3.5" />
              </Button>
            )}
            {step === 4 && (
              <Button
                onClick={() => void run("create")}
                disabled={!!submitting}
              >
                <Zap className="size-3.5" />
                {submitting === "create" ? "Création…" : "Créer et lancer"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── STEP 1 ─────────────────────────────────────────────────────────────────
function Step1Prospects({
  bdds,
  loading,
  selected,
  onSelect,
  excludeContacted,
  setExcludeContacted,
  onlyWithPhone,
  setOnlyWithPhone,
  excludeActive,
  setExcludeActive,
}: {
  bdds: BddRow[];
  loading: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  excludeContacted: boolean;
  setExcludeContacted: (v: boolean) => void;
  onlyWithPhone: boolean;
  setOnlyWithPhone: (v: boolean) => void;
  excludeActive: boolean;
  setExcludeActive: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="mb-2 block">Liste de prospects</Label>
        {loading ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Chargement des listes…
          </div>
        ) : bdds.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Aucune liste — créez-en une depuis le CRM.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {bdds.map((b) => {
              const active = selected === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className={cn(
                    "flex w-full items-center justify-between border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
                    active
                      ? "bg-[var(--brand-blue-tint)]"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {b.prospect_count ?? 0} prospects
                      {b.contacted_count != null && b.contacted_count > 0
                        ? ` · ${b.contacted_count} déjà contactés`
                        : ""}
                    </div>
                  </div>
                  {active && <Check className="size-4 text-[var(--brand-blue)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="mb-1 block">Affinages</Label>
        <RefineToggle
          label="Exclure les prospects déjà contactés"
          hint="Garde uniquement les prospects au statut « nouveau »"
          checked={excludeContacted}
          onCheckedChange={setExcludeContacted}
        />
        <RefineToggle
          label="Uniquement avec un numéro de téléphone"
          hint="Recommandé pour les séquences multicanaux"
          checked={onlyWithPhone}
          onCheckedChange={setOnlyWithPhone}
        />
        <RefineToggle
          label="Exclure ceux déjà dans une campagne active"
          hint="Évite les chevauchements et la double sollicitation"
          checked={excludeActive}
          onCheckedChange={setExcludeActive}
        />
      </div>
    </div>
  );
}

function RefineToggle({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && (
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</div>
        )}
      </div>
    </label>
  );
}

// ─── STEP 2 ─────────────────────────────────────────────────────────────────
function Step2TypeName({
  type,
  setType,
  name,
  setName,
  nameValid,
}: {
  type: LinkedInCampaignType | null;
  setType: (t: LinkedInCampaignType) => void;
  name: string;
  setName: (n: string) => void;
  nameValid: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={cn(
                "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all",
                active
                  ? "border-[var(--brand-blue)] bg-[var(--brand-blue-tint)] shadow-sm"
                  : "hover:border-[var(--brand-blue)]/40 hover:bg-muted/30",
              )}
            >
              {t.recommended && (
                <span className="absolute right-2 top-2 rounded-full bg-[var(--brand-orange)]/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--brand-orange)]">
                  Recommandé
                </span>
              )}
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-md",
                  active
                    ? "bg-[var(--brand-blue)] text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="text-[11.5px] leading-snug text-muted-foreground">
                {t.description}
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <Label htmlFor="campaign-name" className="mb-1.5 block">
          Nom de la campagne <span className="text-destructive">*</span>
        </Label>
        <Input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Prospection CTO SaaS Q2 2026"
          maxLength={80}
        />
        <div className="mt-1 flex items-center justify-between">
          <span
            className={cn(
              "text-[11.5px]",
              !nameValid && name.length > 0
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {name.length > 0 && name.trim().length < 3
              ? "Au moins 3 caractères."
              : "Choisissez un nom clair pour la retrouver facilement."}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {name.length}/80
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3 ─────────────────────────────────────────────────────────────────
function Step3Config({
  type,
  hasNote,
  setHasNote,
  invitationNote,
  setInvitationNote,
  message,
  setMessage,
}: {
  type: LinkedInCampaignType;
  hasNote: boolean;
  setHasNote: (v: boolean) => void;
  invitationNote: string;
  setInvitationNote: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
}) {
  const showNote = type === "invitation_only" || type === "invitation_message";
  const showMessage = type === "message_only" || type === "invitation_message";

  // Refs are what makes variable pills insert at caret instead of appending
  // to the end. The helper restores focus + caret position post-insert.
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {showNote && (
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {type === "invitation_message" ? "1. Note d'invitation" : "Note d'invitation"}
              </Label>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <Switch checked={hasNote} onCheckedChange={setHasNote} />
                <span>Avec note</span>
              </label>
            </div>
            {hasNote ? (
              <>
                <VariablePills
                  onInsert={(t) =>
                    insertAtCaret(noteRef, invitationNote, t, setInvitationNote)
                  }
                />
                <Textarea
                  ref={noteRef}
                  value={invitationNote}
                  onChange={(e) => setInvitationNote(e.target.value)}
                  placeholder="Bonjour {{firstName}}, je vous suis depuis quelque temps…"
                  rows={4}
                  maxLength={300}
                  className="mt-2 resize-y"
                />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Limite LinkedIn : 300 caractères.
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[11px] tabular-nums",
                      invitationNote.length > 300
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {invitationNote.length}/300
                  </span>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2.5 text-[12px] text-muted-foreground">
                Une demande de connexion sans note sera envoyée.
              </div>
            )}
          </div>
        )}

        {showMessage && (
          <div className="rounded-lg border p-4">
            <Label className="mb-2 block text-sm font-semibold">
              {type === "invitation_message" ? "2. Message après acceptation" : "Message"}
            </Label>
            <VariablePills
              onInsert={(t) => insertAtCaret(messageRef, message, t, setMessage)}
            />
            <Textarea
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={"Bonjour {{firstName}},\n\nJ'ai vu votre profil chez {{company}}…"}
              rows={8}
              maxLength={2000}
              className="mt-2 resize-y"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Markdown léger non supporté.
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  message.length > 2000
                    ? "text-destructive"
                    : message.length > 1800
                      ? "text-amber-600"
                      : "text-muted-foreground",
                )}
              >
                {message.length}/2000
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 lg:sticky lg:top-0">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Aperçu (Marie Dupont · Acme)
        </div>
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          {showNote && (
            <PreviewBubble title="Note d'invitation" tone="blue">
              {hasNote ? applyPreviewVars(invitationNote || "—") : "Demande sans note"}
            </PreviewBubble>
          )}
          {showMessage && (
            <PreviewBubble title="Message" tone="slate">
              {applyPreviewVars(message || "—")}
            </PreviewBubble>
          )}
        </div>
      </div>
    </div>
  );
}

function VariablePills({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {VARIABLES.map((v) => (
        <button
          key={v.token}
          type="button"
          onClick={() => onInsert(v.token)}
          className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-[var(--brand-blue)] hover:bg-[var(--brand-blue-tint)] hover:text-[var(--brand-blue)]"
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function PreviewBubble({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "blue" | "slate";
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div
        className={cn(
          "whitespace-pre-wrap rounded-md border p-2.5 text-[12.5px] leading-relaxed",
          tone === "blue"
            ? "border-[var(--brand-blue)]/30 bg-[var(--brand-blue-tint)] text-foreground"
            : "border-border bg-background text-foreground",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ─── STEP 4 ─────────────────────────────────────────────────────────────────
function Step4Recap({
  type,
  name,
  bdd,
  excludeContacted,
  onlyWithPhone,
  excludeActive,
  hasNote,
  invitationNote,
  message,
}: {
  type: LinkedInCampaignType;
  name: string;
  bdd: BddRow | null;
  excludeContacted: boolean;
  onlyWithPhone: boolean;
  excludeActive: boolean;
  hasNote: boolean;
  invitationNote: string;
  message: string;
}) {
  const typeLabel = TYPES.find((t) => t.id === type)?.label ?? "—";
  const refines = [
    excludeContacted ? "Déjà contactés exclus" : null,
    onlyWithPhone ? "Uniquement avec téléphone" : null,
    excludeActive ? "Pas dans une campagne active" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <RecapCard label="Type">
          <div className="text-sm font-medium">{typeLabel}</div>
          <div className="text-[11.5px] text-muted-foreground">Canal LinkedIn</div>
        </RecapCard>
        <RecapCard label="Nom">
          <div className="text-sm font-medium">{name || "—"}</div>
        </RecapCard>
        <RecapCard label="Cible">
          <div className="text-sm font-medium">{bdd?.name ?? "—"}</div>
          <div className="text-[11.5px] text-muted-foreground">
            {bdd?.prospect_count ?? 0} prospects dans la liste
          </div>
        </RecapCard>
        <RecapCard label="Affinages">
          {refines.length === 0 ? (
            <div className="text-[11.5px] text-muted-foreground">Aucun</div>
          ) : (
            <ul className="space-y-0.5">
              {refines.map((r) => (
                <li key={r} className="flex items-center gap-1.5 text-[12px]">
                  <Check className="size-3 text-emerald-500" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </RecapCard>
      </div>

      {hasNote && (
        <RecapCard label="Note d'invitation">
          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground">
            {applyPreviewVars(invitationNote || "—")}
          </div>
        </RecapCard>
      )}

      {(type === "message_only" || type === "invitation_message") && (
        <RecapCard label="Message">
          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground">
            {applyPreviewVars(message || "—")}
          </div>
        </RecapCard>
      )}

      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-900">
        <strong className="font-semibold">Limites de quota.</strong> Les
        quotas réels dépendent de votre compte LinkedIn et de votre activité
        récente. Andoxa respecte les limites pour protéger votre compte.
      </div>
    </div>
  );
}

function RecapCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
