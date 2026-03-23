"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, CheckCircle, Loader2 } from "lucide-react";
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

  const slotsByDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const s of slots) {
      const d = new Date(s.start);
      const key = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    return groups;
  }, [slots]);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border bg-card p-10 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Rendez-vous confirmé</h2>
          <p className="text-muted-foreground text-sm">
            Votre rendez-vous a bien été enregistré. Vous recevrez un rappel avant le créneau.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Prendre rendez-vous</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choisissez un créneau puis renseignez vos informations.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Chargement des créneaux...</p>
            </div>
          ) : error && slots.length === 0 ? (
            <p className="py-8 text-center text-destructive">{error}</p>
          ) : (
            <>
              <div className="mb-8">
                <Label className="text-sm font-medium mb-3 block">Créneaux disponibles</Label>
                {slots.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Aucun créneau disponible pour les 14 prochains jours.
                  </p>
                ) : (
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {[...slotsByDay.entries()].map(([day, daySlots]) => (
                      <div key={day}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{day}</p>
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map((s) => {
                            const isSelected = selectedSlot?.start === s.start && selectedSlot?.end === s.end;
                            return (
                              <Button
                                key={`${s.start}-${s.end}`}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedSlot(s)}
                                className="tabular-nums"
                              >
                                {formatTime(s.start)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 border-t pt-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guestName">Nom complet</Label>
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Jean Dupont"
                      required
                      disabled={!selectedSlot}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guestLinkedin">Profil LinkedIn</Label>
                    <Input
                      id="guestLinkedin"
                      type="text"
                      value={guestLinkedin}
                      onChange={(e) => setGuestLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/jean-dupont"
                      required
                      disabled={!selectedSlot}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedSlot || !guestName.trim() || !guestLinkedin.trim() || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Réservation...
                    </>
                  ) : (
                    "Confirmer le rendez-vous"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Propulsé par <span className="font-semibold text-primary">Andoxa</span>
        </p>
      </div>
    </div>
  );
}
