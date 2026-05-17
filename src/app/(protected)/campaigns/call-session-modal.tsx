"use client";

// Simplified placeholder for the call-session creation wizard.
// The full 2-step design (prospects → planification) is documented in BACKEND.md.

import { useState } from "react";
import { CalendarDays, Phone, Zap } from "lucide-react";
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

export interface CreateSessionPayload {
  name: string;
  scheduleMode: "now" | "later";
  scheduleDate?: string;
  scheduleTime?: string;
}

export function CallSessionModal({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateSessionPayload) => void;
}) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");

  const valid = name.trim().length >= 3 && (mode === "now" || (date && time));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setName("");
          setMode("now");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#FF6700] text-white">
              <Phone className="size-4" />
            </span>
            Nouvelle session d&apos;appels
          </DialogTitle>
          <DialogDescription>
            Donnez un nom à la session puis choisissez si elle démarre maintenant ou plus tard. La sélection des prospects se fera ensuite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="session-name">
            Nom de la session <span className="text-destructive">*</span>
          </Label>
          <Input
            id="session-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Appels relance leads MQL — 12 mai"
            maxLength={100}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("now")}
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${
              mode === "now" ? "border-[#FF6700] bg-orange-50" : "border-input"
            }`}
          >
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-orange-100 text-[#FF6700]">
              <Zap className="size-4" />
            </span>
            <span>
              <div className="text-[13px] font-semibold">Démarrer maintenant</div>
              <div className="text-[11.5px] text-muted-foreground">Démarre dès la création</div>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("later")}
            className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${
              mode === "later" ? "border-[#FF6700] bg-orange-50" : "border-input"
            }`}
          >
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-orange-100 text-[#FF6700]">
              <CalendarDays className="size-4" />
            </span>
            <span>
              <div className="text-[13px] font-semibold">Planifier pour plus tard</div>
              <div className="text-[11.5px] text-muted-foreground">Choisir date et heure</div>
            </span>
          </button>
        </div>

        {mode === "later" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="session-date">Date</Label>
              <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-time">Heure</Label>
              <Input id="session-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              if (!valid) return;
              onCreate({ name, scheduleMode: mode, scheduleDate: date, scheduleTime: time });
            }}
          >
            {mode === "now" ? <Zap className="size-3.5" /> : <CalendarDays className="size-3.5" />}
            {mode === "now" ? "Créer et démarrer" : "Créer la session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
