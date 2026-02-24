"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Slot {
  start: string;
  end: string;
}

export default function BookingPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : null;
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestLinkedin, setGuestLinkedin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadSlots = useCallback(async () => {
    if (!slug) {
      setError("Lien invalide");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${slug}/slots`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Impossible de charger les créneaux");
        setSlots([]);
        return;
      }
      const data = json?.data ?? json;
      const items = data?.slots ?? [];
      setSlots(Array.isArray(items) ? items : []);
    } catch {
      setError("Erreur lors du chargement");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !guestName.trim() || !guestLinkedin.trim() || !slug) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
          guest_name: guestName.trim(),
          guest_linkedin: guestLinkedin.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Erreur lors de la réservation");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Erreur lors de la réservation");
    } finally {
      setSubmitting(false);
    }
  };

  function formatSlot(s: Slot): string {
    const start = new Date(s.start);
    return start.toLocaleString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Lien de prise de rendez-vous invalide.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-md w-full rounded-lg border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Rendez-vous réservé</h2>
          <p className="text-muted-foreground">
            Votre rendez-vous a bien été enregistré.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <div className="max-w-2xl w-full rounded-lg border bg-card p-8">
        <h1 className="text-2xl font-bold mb-2">Prendre rendez-vous</h1>
        <p className="text-muted-foreground mb-8">
          Sélectionnez un créneau disponible ci-dessous.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Chargement des créneaux...</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <>
            <div className="mb-8">
              <Label className="text-sm font-medium mb-3 block">Créneaux disponibles</Label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Aucun créneau disponible pour les 14 prochains jours.
                  </p>
                ) : (
                  slots.map((s) => (
                    <Button
                      key={`${s.start}-${s.end}`}
                      type="button"
                      variant={selectedSlot === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(s)}
                    >
                      {formatSlot(s)}
                    </Button>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="guestName">Nom</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Votre nom"
                  required
                  disabled={!selectedSlot}
                />
              </div>
              <div>
                <Label htmlFor="guestLinkedin">Profil LinkedIn</Label>
                <Input
                  id="guestLinkedin"
                  type="text"
                  value={guestLinkedin}
                  onChange={(e) => setGuestLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/votre-profil ou votre identifiant"
                  required
                  disabled={!selectedSlot}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={!selectedSlot || !guestName.trim() || !guestLinkedin.trim() || submitting}
              >
                {submitting ? "Réservation..." : "Réserver"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
