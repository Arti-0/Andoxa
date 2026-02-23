"use client";

import { useWorkspace } from "../../../lib/workspace";

/**
 * Campaigns Page
 * 
 * Gestion des campagnes email
 * - Liste des campagnes
 * - Création/édition
 * - Stats de campagne
 */
export default function CampaignsPage() {
  const { workspace } = useWorkspace();

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campagnes</h1>
          <p className="text-muted-foreground">
            Gérez vos campagnes d'emailing
          </p>
        </div>
        <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
          Nouvelle campagne
        </button>
      </div>

      {/* TODO: Campaign list component */}
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Liste des campagnes à implémenter
      </div>
    </div>
  );
}
