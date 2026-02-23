"use client";

import { Calendar as CalendarIcon } from "lucide-react";

/**
 * Page Calendrier - Bientôt disponible
 * Calendrier des événements et rendez-vous
 */
export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Calendrier</h1>
        <p className="text-muted-foreground">
          Gérez vos rendez-vous et événements
        </p>
      </div>

      <section className="rounded-lg border bg-card p-12 text-center">
        <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          Bientôt disponible – Planifiez vos rendez-vous et synchronisez avec
          votre agenda.
        </p>
      </section>
    </div>
  );
}
