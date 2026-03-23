"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles, Crown, Building2 } from "lucide-react";

interface BillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string | null;
  subscriptionStatus: string | null;
}

const PLAN_DISPLAY: Record<string, { label: string; icon: typeof CreditCard; accent: string }> = {
  free: { label: "Gratuit", icon: CreditCard, accent: "border-muted text-muted-foreground" },
  starter: { label: "Starter", icon: Sparkles, accent: "border-blue-500/40 text-blue-600 dark:text-blue-400" },
  pro: { label: "Pro", icon: Crown, accent: "border-primary/40 text-primary" },
  enterprise: { label: "Enterprise", icon: Building2, accent: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
};

const STATUS_DISPLAY: Record<string, string> = {
  active: "Actif",
  trialing: "Essai gratuit",
  past_due: "En retard",
  canceled: "Annulé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  unpaid: "Impayé",
  paused: "En pause",
};

export function BillingModal({
  open,
  onOpenChange,
  plan,
  subscriptionStatus,
}: BillingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planKey = (plan ?? "free").toLowerCase();
  const display = PLAN_DISPLAY[planKey] ?? PLAN_DISPLAY.free;
  const PlanIcon = display.icon;
  const statusLabel = STATUS_DISPLAY[subscriptionStatus ?? ""] ?? subscriptionStatus ?? "—";

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paiements/portal", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL du portail non reçue");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'accès au portail");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abonnement</DialogTitle>
          <DialogDescription>
            Gérez votre plan et consultez vos factures via le portail de facturation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 ${display.accent}`}>
            <PlanIcon className="h-6 w-6" />
            <span className="text-lg font-bold">{display.label}</span>
            <span className="text-xs text-muted-foreground">Plan actuel</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border p-4">
            <span className="text-lg font-bold">{statusLabel}</span>
            <span className="text-xs text-muted-foreground">Statut</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleManageBilling} disabled={loading}>
            {loading ? "Redirection..." : "Gérer ma facturation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
