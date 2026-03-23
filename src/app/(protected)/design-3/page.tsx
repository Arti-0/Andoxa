"use client";

import {
  X,
  Check,
  AlertCircle,
  Info,
  ChevronRight,
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Lock,
  User,
} from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function Alert({
  variant,
  title,
  message,
}: {
  variant: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
}) {
  const config = {
    info: { icon: Info, bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-900", text: "text-blue-800 dark:text-blue-300", iconColor: "text-blue-600" },
    success: { icon: Check, bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-900", text: "text-emerald-800 dark:text-emerald-300", iconColor: "text-emerald-600" },
    warning: { icon: AlertCircle, bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", text: "text-amber-800 dark:text-amber-300", iconColor: "text-amber-600" },
    error: { icon: X, bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900", text: "text-red-800 dark:text-red-300", iconColor: "text-red-600" },
  };
  const c = config[variant];
  const Icon = c.icon;
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${c.bg} ${c.border}`}>
      <Icon className={`h-5 w-5 shrink-0 ${c.iconColor}`} />
      <div>
        <p className={`text-sm font-semibold ${c.text}`}>{title}</p>
        <p className={`mt-0.5 text-sm ${c.text} opacity-80`}>{message}</p>
      </div>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent group">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

export default function Design3Page() {
  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Design 3 — Forms & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alerts, settings navigation, and modal patterns.
        </p>
      </div>

      {/* Section: Alerts */}
      <section className="space-y-3">
        <SectionTitle>Alerts</SectionTitle>
        <div className="space-y-3">
          <Alert variant="info" title="Information" message="Votre session d'essai expire dans 3 jours." />
          <Alert variant="success" title="Succès" message="Le prospect a été ajouté au CRM." />
          <Alert variant="warning" title="Attention" message="Certains prospects n'ont pas de numéro de téléphone." />
          <Alert variant="error" title="Erreur" message="Impossible de se connecter à LinkedIn. Réessayez." />
        </div>
      </section>

      {/* Section: Settings page concept */}
      <section className="space-y-3">
        <SectionTitle>Settings page concept</SectionTitle>
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="divide-y">
            <SettingsRow icon={User} title="Profil" description="Gérer votre nom et photo de profil" />
            <SettingsRow icon={Globe} title="Langue" description="Français (France)" />
            <SettingsRow icon={Moon} title="Thème" description="Suivre le système" />
            <SettingsRow icon={Bell} title="Notifications" description="Email et push" />
            <SettingsRow icon={Lock} title="Mot de passe" description="Modifié il y a 23 jours" />
            <SettingsRow icon={Lock} title="Authentification 2FA" description="Non configurée" />
            <SettingsRow icon={Settings} title="Organisation" description="Gérer votre équipe" />
          </div>
        </div>
      </section>

      {/* Section: Modal Preview */}
      <section className="space-y-3">
        <SectionTitle>Modal / Dialog</SectionTitle>
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="text-base font-semibold">Confirmer l&apos;action</h3>
              <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
            </div>
            <button className="rounded-md p-1 hover:bg-accent transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-muted-foreground">
              Vous êtes sur le point de supprimer 12 prospects. Cette action ne peut pas être annulée.
              Êtes-vous sûr de vouloir continuer ?
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
            <button className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">
              Annuler
            </button>
            <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
              Supprimer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
