"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string | null;
  subscriptionStatus: string | null;
}

export function BillingModal({
  open,
  onOpenChange,
  plan,
  subscriptionStatus,
}: BillingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abonnement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Plan actuel</p>
            <p className="font-medium">{plan || "free"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Statut</p>
            <p className="font-medium">{subscriptionStatus || "—"}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez votre abonnement, changez de plan et consultez vos factures via
            le portail Stripe.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleManageBilling}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Redirection…" : "Gérer ma facturation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
