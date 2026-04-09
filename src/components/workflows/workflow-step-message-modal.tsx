"use client";

import { useEffect, useRef, useState } from "react";
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
import { LinkedInPremiumBadge } from "@/components/ui/linkedin-premium-badge";
import { toast } from "sonner";
import type { WorkflowStepType } from "@/lib/workflows/schema";
import { getMaxCharsForMode } from "@/lib/linkedin/limits";

async function postMessageTemplate(
  name: string,
  content: string,
  channel: "linkedin" | "whatsapp",
  maxLen: number
): Promise<boolean> {
  const res = await fetch("/api/message-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      name: name.trim(),
      channel,
      content: content.trim().slice(0, maxLen),
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
  isPremium?: boolean;
}

export function WorkflowStepMessageModal({
  open,
  onOpenChange,
  stepType,
  initialMessage,
  onSave,
  isPremium = false,
}: WorkflowStepMessageModalProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(initialMessage);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const channel = stepType === "whatsapp_message" ? "whatsapp" : "linkedin";
  const linkedinMode = stepType === "linkedin_invite" ? "invite" : "contact";

  const maxChars =
    channel === "linkedin"
      ? getMaxCharsForMode(linkedinMode, isPremium)
      : 2000;

  const wasOpenRef = useRef(false);
  const lastInitialRef = useRef(initialMessage);
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const initialChanged = lastInitialRef.current !== initialMessage;
    if (!wasOpenRef.current || initialChanged) {
      setMessage(initialMessage.slice(0, maxChars));
      setSaveAsTemplate(false);
      setTemplateName("");
      lastInitialRef.current = initialMessage;
    }
    wasOpenRef.current = true;
  }, [open, initialMessage, maxChars]);

  useEffect(() => {
    if (!open) return;
    setMessage((m) => m.slice(0, maxChars));
  }, [maxChars, open]);

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
    if (stepType === "whatsapp_message" && !message.trim()) {
      toast.error("Le message WhatsApp est obligatoire.");
      return;
    }
    onSave(message);
    if (saveAsTemplate && templateName.trim()) {
      const ok = await postMessageTemplate(
        templateName,
        message,
        channel,
        maxChars
      );
      if (ok) {
        toast.success("Modèle enregistré");
        await queryClient.invalidateQueries({ queryKey: ["message-templates"] });
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
            <DialogDescription className="flex flex-wrap items-center gap-1.5">
              <LinkedInPremiumBadge size="sm" />
              <span>
                {isPremium
                  ? `Note facultative — jusqu'à ${maxChars} caractères (Premium).`
                  : `Note facultative — jusqu'à ${maxChars} caractères. Limite étendue à 300 caractères avec LinkedIn Premium.`}
              </span>
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
            isPremium={isPremium}
            maxLength={maxChars}
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
