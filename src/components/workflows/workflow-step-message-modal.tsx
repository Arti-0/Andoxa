"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Smartphone, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MessageComposeForm } from "@/components/campaigns/message-compose-form";
import { toast } from "sonner";
import type { WorkflowStepType } from "@/lib/workflows/schema";

async function postMessageTemplate(
  name: string,
  content: string,
  channel: "linkedin" | "whatsapp"
): Promise<boolean> {
  const res = await fetch("/api/message-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: name.trim(),
      channel,
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

interface WorkflowStepMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepType: "linkedin_invite" | "linkedin_message" | "whatsapp_message";
  initialMessage: string;
  onSave: (message: string) => void;
}

export function WorkflowStepMessageModal({
  open,
  onOpenChange,
  stepType,
  initialMessage,
  onSave,
}: WorkflowStepMessageModalProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(initialMessage);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (open) {
      setMessage(initialMessage);
      setSaveAsTemplate(false);
      setTemplateName("");
    }
  }, [open, initialMessage]);

  const channel = stepType === "whatsapp_message" ? "whatsapp" : "linkedin";
  const linkedinMode = stepType === "linkedin_invite" ? "invite" : "contact";

  const title =
    stepType === "linkedin_invite"
      ? "Invitation LinkedIn"
      : stepType === "linkedin_message"
        ? "Message LinkedIn"
        : "Message WhatsApp";

  const Icon =
    stepType === "linkedin_invite"
      ? UserPlus
      : stepType === "linkedin_message"
        ? MessageSquare
        : Smartphone;

  const handleSave = async () => {
    if (saveAsTemplate && !templateName.trim()) {
      toast.error("Indiquez un nom pour le modèle");
      return;
    }
    onSave(message);
    if (saveAsTemplate && templateName.trim()) {
      const ok = await postMessageTemplate(templateName, message, channel);
      if (ok) {
        toast.success("Modèle enregistré");
        await queryClient.invalidateQueries({ queryKey: ["message-templates", channel] });
        await queryClient.invalidateQueries({ queryKey: ["message-templates", channel, "compose-form"] });
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          {stepType === "linkedin_invite" ? (
            <DialogDescription>
              La note d’invitation est facultative : sur LinkedIn, une demande peut être envoyée sans texte
              personnel (selon les règles du compte et de l’API). Ce n’est pas réservé à Premium ; les limites
              de longueur et d’usage peuvent toutefois varier.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm font-medium">Message</Label>
            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="wf-save-template" className="cursor-pointer text-sm font-normal">
                Enregistrer comme template
              </Label>
              <Switch
                id="wf-save-template"
                checked={saveAsTemplate}
                onCheckedChange={setSaveAsTemplate}
              />
            </div>
          </div>
          <MessageComposeForm
            message={message}
            onMessageChange={setMessage}
            channel={channel}
            linkedinMode={linkedinMode}
          />
          {saveAsTemplate ? (
            <div>
              <Label htmlFor="wf-template-name" className="sr-only">
                Nom du modèle
              </Label>
              <Input
                id="wf-template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nom du modèle"
                maxLength={100}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type WorkflowMessageStepType = Extract<
  WorkflowStepType,
  "linkedin_invite" | "linkedin_message" | "whatsapp_message"
>;
