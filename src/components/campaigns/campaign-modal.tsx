"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2, UserPlus, MessageSquare, ArrowRight, ArrowLeft, Clock, Users, Zap } from "lucide-react";
import type { Prospect } from "@/lib/types/prospects";
import { toast } from "sonner";

const INVITE_PLACEHOLDER = `Bonjour {{firstName}},

Je souhaite échanger avec vous sur {{company}}.
Cordialement`;

const CONTACT_PLACEHOLDER = `Bonjour {{firstName}},

J'ai vu votre profil chez {{company}} et souhaiterais vous contacter au sujet de votre poste {{jobTitle}}.
Pouvez-vous me recontacter ?

Cordialement`;

const VARIABLES = [
  { key: "{{firstName}}", label: "Prénom" },
  { key: "{{lastName}}", label: "Nom" },
  { key: "{{company}}", label: "Entreprise" },
  { key: "{{jobTitle}}", label: "Poste" },
  { key: "{{bookingLink}}", label: "Lien de prise de RDV" },
];

function applyPreviewVariables(template: string, prospect: Prospect, bookingLinkPreview?: string): string {
  const firstName = (prospect.full_name ?? "").split(" ")[0] || "Prénom";
  const lastName = (prospect.full_name ?? "").split(" ").slice(1).join(" ") || "Nom";
  return template
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{lastName\}\}/g, lastName)
    .replace(/\{\{company\}\}/g, prospect.company ?? "Entreprise")
    .replace(/\{\{jobTitle\}\}/g, prospect.job_title ?? "Poste")
    .replace(/\{\{bookingLink\}\}/g, bookingLinkPreview ?? "[Votre lien de prise de RDV]");
}

interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "invite" | "contact" | null;
  prospects: Prospect[];
  onSuccess?: () => void;
}

interface MessageTemplate {
  id: string;
  name: string;
  channel: "linkedin" | "whatsapp" | "email";
  content: string;
}

export function CampaignModal({
  open,
  onOpenChange,
  action,
  prospects,
  onSuccess,
}: CampaignModalProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [useBatch, setUseBatch] = useState(false);

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["message-templates", "linkedin", open],
    queryFn: async () => {
      const res = await fetch("/api/message-templates?channel=linkedin", {
        credentials: "include",
      });
      if (!res.ok) return [] as MessageTemplate[];
      const json = await res.json();
      const items = (json?.data?.items ?? []) as MessageTemplate[];
      return items;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const effectiveAction = action ?? "invite";
  const isInvite = effectiveAction === "invite";
  const count = prospects.length;
  const placeholder = isInvite ? INVITE_PLACEHOLDER : CONTACT_PLACEHOLDER;
  const text = message.trim() || placeholder;
  const templates = templatesData ?? [];

  const BATCH_SIZE = 10;
  const DELAY_MS = 120000;
  const batchCount = Math.ceil(count / BATCH_SIZE);
  const estimatedTimeMinutes = Math.ceil((batchCount * DELAY_MS) / 60000);

  const handleNext = () => setStep("preview");
  const handleBack = () => setStep("compose");

  const handleConfirm = async () => {
    if (count === 0) return;
    setSending(true);

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
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? "Erreur lors de la création du job");
          return;
        }
        const jobId = json?.data?.id ?? json?.id;
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
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? "Erreur lors de l'envoi");
          return;
        }
        const chatId = json?.data?.chat_id ?? json?.chat_id ?? null;
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
  };

  const handleClose = (o: boolean) => {
    if (!o) resetState();
    onOpenChange(o);
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isInvite ? <UserPlus className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            <DialogTitle>
              {isInvite ? "Invitation LinkedIn" : "Contacter"}
              {step === "preview" ? " — Confirmation" : ""}
            </DialogTitle>
          </div>
          <DialogDescription>
            {step === "compose"
              ? isInvite
                ? `Envoyer une invitation à ${count} prospect${count > 1 ? "s" : ""} sur LinkedIn.`
                : `Démarrer une conversation avec ${count} prospect${count > 1 ? "s" : ""} sur LinkedIn.`
              : "Vérifiez les détails avant de lancer la campagne."}
          </DialogDescription>
        </DialogHeader>

        {step === "compose" && (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="message">Message (variables disponibles)</Label>
              <Textarea
                id="message"
                placeholder={placeholder}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="mt-1.5 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {VARIABLES.map((v) => v.key).join(" ")}
              </p>
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Modèles disponibles
              </p>
              {templatesLoading ? (
                <p className="text-xs text-muted-foreground">Chargement des modèles…</p>
              ) : templates.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun modèle LinkedIn enregistré.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {templates.map((tpl) => (
                    <Button
                      key={tpl.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setMessage(tpl.content)}
                    >
                      {tpl.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {count > BATCH_SIZE && (
              <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
                <input
                  type="checkbox"
                  checked={useBatch}
                  onChange={(e) => setUseBatch(e.target.checked)}
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-medium">Mode batch (recommandé)</p>
                  <p className="text-muted-foreground">
                    Envoie par lots de {BATCH_SIZE} avec 2 min de pause pour respecter les limites LinkedIn.
                  </p>
                </div>
              </label>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1 text-lg font-semibold">{count}</p>
                <p className="text-xs text-muted-foreground">Prospect{count > 1 ? "s" : ""}</p>
              </div>
              {useBatch && count > BATCH_SIZE ? (
                <>
                  <div className="rounded-md border p-3 text-center">
                    <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-1 text-lg font-semibold">{batchCount}</p>
                    <p className="text-xs text-muted-foreground">Batch{batchCount > 1 ? "es" : ""}</p>
                  </div>
                  <div className="rounded-md border p-3 text-center">
                    <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
                    <p className="mt-1 text-lg font-semibold">~{estimatedTimeMinutes} min</p>
                    <p className="text-xs text-muted-foreground">Estimé</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2 rounded-md border p-3 text-center">
                  <Zap className="mx-auto h-5 w-5 text-muted-foreground" />
                  <p className="mt-1 text-sm text-muted-foreground">Envoi direct</p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Aperçu du message</p>
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap font-mono">
                {prospects[0] ? applyPreviewVariables(text, prospects[0]) : text}
              </div>
              {prospects[0] && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Aperçu pour : {prospects[0].full_name ?? "Prospect 1"}
                </p>
              )}
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
              LinkedIn limite les invitations à ~80–100/jour et les messages à ~20–30/heure.
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "compose" ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={sending}>
                Annuler
              </Button>
              <Button onClick={handleNext} disabled={count === 0}>
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
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirmer et lancer"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
