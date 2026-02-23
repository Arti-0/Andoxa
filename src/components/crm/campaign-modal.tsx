"use client";

import { useState } from "react";
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
import { Loader2, UserPlus, MessageSquare } from "lucide-react";
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
];

interface CampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "invite" | "contact" | null;
  prospects: Prospect[];
  onSuccess?: () => void;
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

  const effectiveAction = action ?? "invite";
  const isInvite = effectiveAction === "invite";
  const count = prospects.length;
  const placeholder = isInvite ? INVITE_PLACEHOLDER : CONTACT_PLACEHOLDER;

  const handleSubmit = async () => {
    if (count === 0) return;
    const text = message.trim() || placeholder;
    setSending(true);

    try {
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
        const msg = json?.error?.message ?? `Erreur lors de l'${isInvite ? "invitation" : "envoi"}`;
        toast.error(msg);
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
      setMessage("");

      if (chatId && !isInvite) {
        router.push(`/messagerie?chat=${encodeURIComponent(chatId)}`);
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSending(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isInvite ? (
              <UserPlus className="h-5 w-5" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
            <DialogTitle>
              {isInvite ? "Invitation LinkedIn" : "Contacter"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isInvite
              ? `Envoyer une invitation à ${count} prospect${count > 1 ? "s" : ""} sur LinkedIn.`
              : `Démarrer une conversation avec ${count} prospect${count > 1 ? "s" : ""} sur LinkedIn.`}
            {" "}
            LinkedIn limite les invitations à ~80–100/jour.
          </DialogDescription>
        </DialogHeader>

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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isInvite ? (
              "Envoyer les invitations"
            ) : (
              "Envoyer les messages"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
