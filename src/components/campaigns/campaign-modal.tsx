"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  UserPlus,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Clock,
  Users,
  Zap,
  AlertCircle,
} from "lucide-react";
import type { Prospect } from "@/lib/types/prospects";
import { toast } from "sonner";
import { applyMessageVariables } from "@/lib/unipile/campaign";
import {
  CAMPAIGN_VARIABLE_META,
  extractUsedCampaignVariables,
  missingVariablesForProspect,
} from "@/lib/campaigns/variable-gaps";
import { MessageComposeForm } from "@/components/campaigns/message-compose-form";

const INVITE_PLACEHOLDER = `Bonjour {{firstName}},

Je souhaite échanger avec vous sur {{company}}.
Cordialement`;

const CONTACT_PLACEHOLDER = `Bonjour {{firstName}},

J'ai vu votre profil chez {{company}} et souhaiterais vous contacter au sujet de votre poste {{jobTitle}}.
Pouvez-vous me recontacter ?

Cordialement`;

function applyPreviewVariables(
  template: string,
  prospect: Prospect,
  bookingLinkPreview?: string
): string {
  return applyMessageVariables(template, prospect, { bookingLink: bookingLinkPreview ?? undefined });
}

export interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "invite" | "contact" | null;
  prospects: Prospect[];
  listName?: string | null;
  onSuccess?: () => void;
}

async function trySaveAsTemplate(name: string, content: string): Promise<boolean> {
  const res = await fetch("/api/message-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: name.trim(),
      channel: "linkedin",
      content: content.trim().slice(0, 2000),
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    toast.error(j?.error?.message ?? "Le modèle n’a pas pu être enregistré");
    return false;
  }
  return true;
}

export function CampaignModal({
  open,
  onOpenChange,
  action,
  prospects,
  listName: _listName,
  onSuccess,
}: CampaignModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"compose" | "gaps" | "preview">("compose");
  const [useBatch, setUseBatch] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [gapDefaults, setGapDefaults] = useState<Record<string, string>>({});
  const [gapDrafts, setGapDrafts] = useState<Record<string, string>>({});
  const [gapTargets, setGapTargets] = useState<Prospect[]>([]);

  const { data: bookingSlugRes } = useQuery({
    queryKey: ["booking-slug", open],
    queryFn: async () => {
      const res = await fetch("/api/booking/slug", { credentials: "include" });
      if (!res.ok) return { booking_slug: null as string | null };
      const json = await res.json();
      const d = json?.data ?? json;
      return { booking_slug: (d?.booking_slug ?? null) as string | null };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const bookingSlug = bookingSlugRes?.booking_slug ?? null;
  const bookingUrl =
    typeof window !== "undefined" && bookingSlug
      ? `${window.location.origin}/booking/${bookingSlug}`
      : "";

  useEffect(() => {
    if (!open) return;
    setSaveAsTemplate(false);
    setTemplateName("");
  }, [open]);

  const effectiveAction = action ?? "invite";
  const isInvite = effectiveAction === "invite";
  const count = prospects.length;
  const placeholder = isInvite ? INVITE_PLACEHOLDER : CONTACT_PLACEHOLDER;
  const text = message.trim() || placeholder;
  const BATCH_SIZE = 10;
  const DELAY_MS = 120000;
  const batchCount = Math.ceil(count / BATCH_SIZE);
  const estimatedBatchMinutes = Math.ceil((batchCount * DELAY_MS) / 60000);
  const avgThrottleSec = isInvite ? 0.4 : 0.5;
  const sequentialMinutes = Math.max(1, Math.ceil((count * avgThrottleSec) / 60));

  const usedVarKeys = useMemo(() => extractUsedCampaignVariables(text), [text]);
  const hasBookingLink = Boolean(bookingSlug);
  const incompleteProspects = useMemo(() => {
    return prospects.filter(
      (p) => missingVariablesForProspect(p, usedVarKeys, hasBookingLink).length > 0
    );
  }, [prospects, usedVarKeys, hasBookingLink]);

  const gapProspectCount = Object.keys(gapDefaults).length;
  const adjustedMessageCount = useMemo(() => {
    return Object.keys(gapDefaults).filter((id) => {
      const def = (gapDefaults[id] ?? "").trim();
      const dr = gapDrafts[id];
      if (dr === undefined) return false;
      return dr.trim() !== def;
    }).length;
  }, [gapDefaults, gapDrafts]);

  const handleComposeNext = () => {
    if (saveAsTemplate && !templateName.trim()) {
      toast.error("Indiquez un nom pour le modèle ou désactivez l’enregistrement.");
      return;
    }
    if (incompleteProspects.length > 0) {
      const defs: Record<string, string> = {};
      for (const p of incompleteProspects) {
        defs[p.id] = applyMessageVariables(text, p, { bookingLink: bookingUrl || undefined });
      }
      setGapTargets(incompleteProspects);
      setGapDefaults(defs);
      setGapDrafts({});
      setStep("gaps");
    } else {
      setGapTargets([]);
      setGapDefaults({});
      setGapDrafts({});
      setStep("preview");
    }
  };

  const handleGapsNext = () => setStep("preview");

  const handleBack = () => {
    if (step === "preview") {
      if (Object.keys(gapDefaults).length > 0) setStep("gaps");
      else setStep("compose");
    } else if (step === "gaps") {
      setStep("compose");
    }
  };

  const buildMessageByProspect = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const id of Object.keys(gapDefaults)) {
      const final = (gapDrafts[id] ?? gapDefaults[id] ?? "").trim();
      if (final) out[id] = final;
    }
    return out;
  };

  const handleConfirm = async () => {
    if (count === 0) return;
    setSending(true);
    const messageByProspect = buildMessageByProspect();

    try {
      if (useBatch && count > BATCH_SIZE) {
        const res = await fetch("/api/campaigns/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: effectiveAction,
            prospect_ids: prospects.map((p) => p.id),
            message_template: text,
            batch_size: BATCH_SIZE,
            delay_ms: DELAY_MS,
            message_overrides:
              Object.keys(messageByProspect).length > 0 ? messageByProspect : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? "Erreur lors de la création du job");
          return;
        }
        const jobId = json?.data?.id ?? json?.id;
        if (saveAsTemplate && templateName.trim()) {
          const ok = await trySaveAsTemplate(templateName, text);
          if (ok) {
            void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
            toast.success("Modèle enregistré");
          }
        }
        toast.success(`Campagne créée — ${count} prospects en ${batchCount} batch(es)`);
        onSuccess?.();
        onOpenChange(false);
        resetState();
        if (jobId) router.push(`/campaigns/${jobId}`);
      } else {
        const res = await fetch(`/api/unipile/campaigns/${effectiveAction}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            prospect_ids: prospects.map((p) => p.id),
            message: text,
            message_by_prospect:
              Object.keys(messageByProspect).length > 0 ? messageByProspect : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? "Erreur lors de l’envoi");
          return;
        }
        const chatId = json?.data?.chat_id ?? json?.chat_id ?? null;
        if (saveAsTemplate && templateName.trim()) {
          const ok = await trySaveAsTemplate(templateName, text);
          if (ok) {
            void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
            toast.success("Modèle enregistré");
          }
        }
        toast.success(
          isInvite
            ? `${count} invitation${count > 1 ? "s" : ""} envoyée${count > 1 ? "s" : ""}`
            : `${count} message${count > 1 ? "s" : ""} envoyé${count > 1 ? "s" : ""}`
        );
        onSuccess?.();
        onOpenChange(false);
        resetState();
        if (chatId && !isInvite) {
          router.push(`/messagerie?chat=${encodeURIComponent(chatId)}`);
        }
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSending(false);
    }
  };

  const resetState = () => {
    setMessage("");
    setStep("compose");
    setUseBatch(false);
    setSaveAsTemplate(false);
    setTemplateName("");
    setGapDefaults({});
    setGapDrafts({});
    setGapTargets([]);
  };

  const handleClose = (o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  };

  if (!action) return null;

  const titleSuffix =
    step === "preview" ? " — Confirmation" : step === "gaps" ? " — Champs manquants" : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isInvite ? <UserPlus className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            <DialogTitle>
              {isInvite ? "Invitation LinkedIn" : "Message LinkedIn"}
              {titleSuffix}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {step === "compose" && "Rédigez le message de campagne LinkedIn."}
            {step === "gaps" && "Complétez le texte pour les prospects sans donnée CRM pour certaines variables."}
            {step === "preview" && "Vérifiez le résumé avant envoi."}
          </DialogDescription>
        </DialogHeader>

        {step === "compose" && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm font-medium">Message</Label>
              <div className="flex shrink-0 items-center gap-2">
                <Label htmlFor="save-template" className="cursor-pointer text-sm font-normal">
                  Enregistrer comme template
                </Label>
                <Switch id="save-template" checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
              </div>
            </div>

            <MessageComposeForm
              message={message}
              onMessageChange={setMessage}
              channel="linkedin"
              linkedinMode={isInvite ? "invite" : "contact"}
              footerExtra={
                count > BATCH_SIZE ? (
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent/50">
                    <input
                      type="checkbox"
                      checked={useBatch}
                      onChange={(e) => setUseBatch(e.target.checked)}
                      className="shrink-0"
                    />
                    <span className="text-sm font-medium">Mode batch (recommandé)</span>
                  </label>
                ) : null
              }
            />

            {saveAsTemplate && (
              <div>
                <Label htmlFor="template-name" className="sr-only">
                  Nom du modèle
                </Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nom du modèle"
                  maxLength={100}
                />
              </div>
            )}
          </div>
        )}

        {step === "gaps" && (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
            <p className="text-sm text-muted-foreground">
              {gapTargets.length} prospect{gapTargets.length > 1 ? "s" : ""} — variables sans donnée en CRM. Ajustez
              chaque message si besoin.
            </p>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
              {gapTargets.map((p) => {
                const missing = missingVariablesForProspect(p, usedVarKeys, hasBookingLink);
                return (
                  <div key={p.id} className="rounded-md border p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{p.full_name ?? p.id.slice(0, 8)}</span>
                      {missing.map((k) => (
                        <span
                          key={k}
                          className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                          title={CAMPAIGN_VARIABLE_META[k].crmColumn}
                        >
                          {`{{${k}}}`}
                        </span>
                      ))}
                    </div>
                    <Textarea
                      value={gapDrafts[p.id] ?? gapDefaults[p.id] ?? ""}
                      onChange={(e) =>
                        setGapDrafts((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      rows={4}
                      className="font-mono text-sm"
                      maxLength={2000}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 overflow-y-auto py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-lg font-semibold">{count}</p>
                <p className="text-xs text-muted-foreground">Destinataires</p>
              </div>
              {useBatch && count > BATCH_SIZE ? (
                <>
                  <div className="rounded-md border p-3 text-center">
                    <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-1 text-lg font-semibold">{batchCount}</p>
                    <p className="text-xs text-muted-foreground">Lots</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-1 text-lg font-semibold">~{estimatedBatchMinutes} min</p>
                    <p className="text-xs text-muted-foreground">Durée estimée</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2 rounded-md border p-3 text-center">
                  <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-1 text-lg font-semibold">~{sequentialMinutes} min</p>
                  <p className="text-xs text-muted-foreground">Envoi séquentiel (~{avgThrottleSec}s / prospect)</p>
                </div>
              )}
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <p className="mb-2 font-medium">Résumé</p>
              <ul className="list-inside list-disc space-y-1.5 text-muted-foreground">
                <li>
                  <span className="text-foreground">Mode :</span>{" "}
                  {useBatch && count > BATCH_SIZE
                    ? `lots de ${BATCH_SIZE}, pause ~${DELAY_MS / 60000} min entre chaque lot`
                    : "envoi direct, un prospect après l’autre"}
                </li>
                {gapProspectCount > 0 && (
                  <>
                    <li>
                      <span className="text-foreground">Messages ajustés (données CRM manquantes) :</span>{" "}
                      {gapProspectCount} prospect{gapProspectCount > 1 ? "s" : ""}
                    </li>
                    <li>
                      <span className="text-foreground">Modifiés manuellement à l’étape précédente :</span>{" "}
                      {adjustedMessageCount}
                    </li>
                  </>
                )}
                <li>
                  <span className="text-foreground">Limites LinkedIn (indicatif) :</span>{" "}
                  {isInvite
                    ? "invitations ~80–100 / jour selon le compte"
                    : "messages ~20–30 / heure selon le compte"}
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Les quotas réels dépendent de votre compte LinkedIn et de votre activité récente.</span>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Exemple (1er prospect)</p>
              <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-sm">
                {prospects[0]
                  ? applyPreviewVariables(
                      text,
                      prospects[0],
                      bookingUrl || undefined
                    )
                  : text}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t pt-4">
          {step === "compose" ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={sending}>
                Annuler
              </Button>
              <Button onClick={handleComposeNext} disabled={count === 0}>
                {incompleteProspects.length > 0 ? "Suite" : "Aperçu"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : step === "gaps" ? (
            <>
              <Button variant="outline" onClick={handleBack} disabled={sending}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleGapsNext} disabled={count === 0}>
                Aperçu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} disabled={sending}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleConfirm} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer et lancer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
