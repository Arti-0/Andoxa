"use client";

// Simplified placeholder for the LinkedIn campaign creation wizard.
// The full 4-step design (prospects → type/name → config → confirm) is documented
// in BACKEND.md and will be ported once the supporting endpoints are wired.

import { useState } from "react";
import { Linkedin, MessageSquare, UserPlus, Workflow, Zap } from "lucide-react";
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

export type LinkedInCampaignType = "invitation_only" | "message_only" | "invitation_message";

export interface CreateCampaignPayload {
  type: LinkedInCampaignType;
  name: string;
}

const TYPES: { id: LinkedInCampaignType; label: string; description: string; icon: React.ComponentType<{ className?: string }>; recommended?: boolean }[] = [
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

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCreate,
  onDraft,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateCampaignPayload) => void;
  onDraft: (data: CreateCampaignPayload) => void;
}) {
  const [type, setType] = useState<LinkedInCampaignType | null>(null);
  const [name, setName] = useState("");
  const valid = type !== null && name.trim().length >= 3;
  const reset = () => {
    setType(null);
    setName("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#0A66C2] text-white">
              <Linkedin className="size-4" />
            </span>
            Créer une campagne LinkedIn
          </DialogTitle>
          <DialogDescription>
            Choisissez la séquence et donnez un nom à votre campagne. La sélection des prospects se fera ensuite.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const selected = type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`relative flex h-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-[#0052D9] bg-[#E8F0FD]"
                    : "border-input hover:border-foreground/40"
                }`}
              >
                {t.recommended ? (
                  <span className="absolute -top-2 right-3 rounded-full bg-[#FF6700] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Recommandé
                  </span>
                ) : null}
                <span className="inline-flex size-8 items-center justify-center rounded-md bg-[#E8F0FD] text-[#0052D9]">
                  <Icon className="size-4" />
                </span>
                <span className="text-[14px] font-semibold tracking-tight">{t.label}</span>
                <span className="text-[12px] leading-relaxed text-muted-foreground">{t.description}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign-name">
            Nom de la campagne <span className="text-destructive">*</span>
          </Label>
          <Input
            id="campaign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Prospection CTO SaaS Q2 2026"
            maxLength={100}
          />
          <p className="text-[11.5px] text-muted-foreground">
            Donnez un nom clair à votre campagne pour la retrouver facilement. Min. 3 caractères.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="outline"
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              onDraft({ type: type!, name });
            }}
          >
            Enregistrer en brouillon
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              onCreate({ type: type!, name });
            }}
          >
            <Zap className="size-3.5" />
            Créer et lancer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
