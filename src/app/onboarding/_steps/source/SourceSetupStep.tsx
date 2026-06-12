"use client";

import type { DragEvent } from "react";
import { useCallback, useState } from "react";
import { ChevronRight, FileSpreadsheet, Puzzle, Upload } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useParseCSV } from "@/hooks/use-parse-csv";
import { ONBOARDING_PROFILE_STEP } from "../../config";
import { OnboardingContinueButton } from "../../_components/OnboardingContinueButton";
import {
  cardShell,
  fieldLabelClass,
  inputPremiumClass,
  setupFormMax,
  subClass,
  welcomeStepTitleClass,
} from "../onboarding-layout-classes";

/** Drop the extension explainer GIF in /public and point this at it. */
const EXTENSION_DEMO_GIF_SRC: string | null = null;

const MAX_CLIENT_ROWS = 5000;

type SourcePhase = "choice" | "csv" | "extension";

type TargetField =
  | "full_name"
  | "email"
  | "phone"
  | "company"
  | "job_title"
  | "linkedin";

// Same header aliases as the CRM import dialog, applied silently: onboarding
// skips the column-mapping UI and maps whatever it recognizes.
const HEADER_ALIASES: Record<TargetField, string[]> = {
  full_name: ["full name", "name", "nom complet", "nom", "fullname"],
  email: ["email", "e-mail", "mail", "email address", "adresse email"],
  phone: ["phone", "telephone", "téléphone", "tel", "mobile", "numero"],
  company: ["company", "societe", "société", "entreprise", "organization"],
  job_title: ["job title", "title", "poste", "fonction", "position"],
  linkedin: ["linkedin", "linkedin url", "linkedin profile", "profile url", "url"],
};

function inferHeaderMapping(fields: string[]): Partial<Record<TargetField, string>> {
  const lower = fields.map((f) => ({ original: f, normalized: f.trim().toLowerCase() }));
  const mapping: Partial<Record<TargetField, string>> = {};
  for (const target of Object.keys(HEADER_ALIASES) as TargetField[]) {
    const aliases = HEADER_ALIASES[target];
    const exact = lower.find((f) => aliases.includes(f.normalized));
    const partial =
      exact ?? lower.find((f) => aliases.some((alias) => f.normalized.includes(alias)));
    if (partial) mapping[target] = partial.original;
  }
  return mapping;
}

function downloadCsvTemplate() {
  const csv =
    "full_name,email,phone,company,job_title,linkedin\n" +
    "Marie Dupont,marie.dupont@acme.fr,+33612345678,Acme,Head of Sales,https://www.linkedin.com/in/marie-dupont\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "andoxa-prospects-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

async function completeOnboarding(): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        onboarding_step: ONBOARDING_PROFILE_STEP.COMPLETED,
      }),
    });
    const json = (await res.json()) as { success?: boolean };
    return res.ok && json.success === true;
  } catch {
    return false;
  }
}

export function SourceSetupStep() {
  const [phase, setPhase] = useState<SourcePhase>("choice");

  return (
    <div className="flex min-h-0 flex-1 flex-col px-1 sm:px-0">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto overscroll-y-contain px-1 py-6 sm:py-8">
        <div
          className={cn(
            setupFormMax,
            "flex min-h-[450px] w-full flex-col justify-center gap-12"
          )}
        >
          {phase === "choice" ? (
            <ChoicePhase onSelect={setPhase} />
          ) : phase === "csv" ? (
            <CsvPhase onBack={() => setPhase("choice")} />
          ) : (
            <ExtensionPhase onBack={() => setPhase("choice")} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Phase 1 : fork ──────────────────────────────────────────────────────────

function ChoicePhase({ onSelect }: { onSelect: (p: SourcePhase) => void }) {
  const options: {
    phase: SourcePhase;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[] = [
    {
      phase: "csv",
      icon: FileSpreadsheet,
      title: "Importer un fichier CSV",
      description:
        "Vous avez déjà une liste de prospects ? Importez-la et lancez votre première campagne dans la foulée.",
    },
    {
      phase: "extension",
      icon: Puzzle,
      title: "Extraire depuis LinkedIn",
      description:
        "Installez l’extension Andoxa et récupérez vos prospects directement depuis une recherche LinkedIn.",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-12">
      <h1 className={welcomeStepTitleClass}>Ajoutez vos premiers prospects.</h1>
      <div className="flex w-full flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.phase}
            type="button"
            onClick={() => onSelect(opt.phase)}
            className={cn(
              "group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all",
              "hover:border-zinc-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:hover:border-white/20"
            )}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-zinc-900 group-hover:text-white dark:bg-white/10 dark:text-zinc-200 dark:group-hover:bg-white dark:group-hover:text-zinc-900">
              <opt.icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {opt.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {opt.description}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Phase 2a : CSV → liste → handoff campagne ──────────────────────────────

function CsvPhase({ onBack }: { onBack: () => void }) {
  const { parse } = useParseCSV();
  const [listName, setListName] = useState("Ma première liste");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<Record<string, string | null>>>([]);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!/\.csv$/i.test(file.name)) {
        toast.error("Format non supporté — importez un fichier .csv");
        return;
      }
      try {
        const { data, fields } = await parse(file);
        const mapping = inferHeaderMapping(fields);
        if (!mapping.full_name && !mapping.email && !mapping.linkedin) {
          toast.error(
            "Colonnes non reconnues. Utilisez le modèle CSV (nom, email ou URL LinkedIn requis)."
          );
          return;
        }
        const mapped = data
          .slice(0, MAX_CLIENT_ROWS)
          .map((row) => {
            const pick = (target: TargetField) => {
              const header = mapping[target];
              const value = header ? String(row[header] ?? "").trim() : "";
              return value.length > 0 ? value : null;
            };
            return {
              full_name: pick("full_name"),
              email: pick("email"),
              phone: pick("phone"),
              company: pick("company"),
              job_title: pick("job_title"),
              linkedin: pick("linkedin"),
            };
          })
          .filter((r) => r.full_name || r.email || r.linkedin);
        if (mapped.length === 0) {
          toast.error("Aucune ligne valide dans ce fichier.");
          return;
        }
        setFileName(file.name);
        setRows(mapped);
      } catch {
        toast.error("Impossible de lire ce fichier.");
      }
    },
    [parse]
  );

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      void handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile]
  );

  const canImport = listName.trim().length >= 2 && rows.length > 0 && !importing;

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: listName.trim(),
          source: "csv",
          prospects: rows,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { bddId?: string };
        error?: { message?: string };
      };
      const bddId = json.data?.bddId ?? (json as { bddId?: string }).bddId;
      if (!res.ok || !bddId) {
        toast.error(json.error?.message ?? "Import impossible.");
        setImporting(false);
        return;
      }
      const done = await completeOnboarding();
      if (!done) {
        toast.error("Impossible de finaliser.");
        setImporting(false);
        return;
      }
      // Handoff: the campaigns page opens its creation wizard with the new
      // list preselected via ?new=campaign&bdd= (same path as the CRM).
      window.location.assign(
        `/campaigns?new=campaign&bdd=${encodeURIComponent(bddId)}`
      );
    } catch {
      toast.error("Import impossible.");
      setImporting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <h1 className={welcomeStepTitleClass}>Importez votre liste.</h1>
      <div className={cn(cardShell, setupFormMax)}>
        <div className="space-y-5 text-left">
          <div className="space-y-2">
            <Label htmlFor="source-list-name" className={fieldLabelClass}>
              Nom de la liste
            </Label>
            <Input
              id="source-list-name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Ma première liste"
              className={cn(
                inputPremiumClass,
                "min-h-11 text-base sm:min-h-10 sm:text-sm"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className={fieldLabelClass}>Fichier CSV</Label>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  document.getElementById("source-csv-input")?.click();
                }
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById("source-csv-input")?.click()
              }
              className={cn(
                "relative flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 p-3 transition-colors dark:border-white/10 sm:min-h-30 sm:p-4",
                "hover:border-zinc-300 hover:bg-zinc-50 dark:hover:border-white/20 dark:hover:bg-white/5",
                dragActive &&
                  "border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-white/10"
              )}
            >
              <input
                id="source-csv-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                disabled={importing}
                onChange={(ev) => void handleFile(ev.target.files?.[0] ?? null)}
              />
              {fileName ? (
                <>
                  <FileSpreadsheet className="size-6 text-emerald-600 dark:text-emerald-500" />
                  <p className="max-w-full truncate px-2 text-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {fileName}
                  </p>
                  <p className="text-center text-xs text-emerald-600 dark:text-emerald-500">
                    {rows.length} prospect{rows.length > 1 ? "s" : ""} détecté
                    {rows.length > 1 ? "s" : ""}
                  </p>
                </>
              ) : (
                <>
                  <Upload
                    className={cn(
                      "size-6",
                      dragActive
                        ? "text-zinc-600 dark:text-zinc-300"
                        : "text-zinc-400 dark:text-zinc-500"
                    )}
                  />
                  <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                    Glisser-déposer ou cliquer
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={downloadCsvTemplate}
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Télécharger le modèle CSV
            </button>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        <OnboardingContinueButton
          disabled={!canImport}
          loading={importing}
          onClick={() => void handleImport()}
        >
          Importer et créer ma campagne
        </OnboardingContinueButton>
        <BackToChoice onBack={onBack} disabled={importing} />
      </div>
    </div>
  );
}

// ─── Phase 2b : extension → CRM ──────────────────────────────────────────────

function ExtensionPhase({ onBack }: { onBack: () => void }) {
  const chromeExtUrl = process.env.NEXT_PUBLIC_EXTENSION_CHROME_URL ?? "";
  const firefoxExtUrl = process.env.NEXT_PUBLIC_EXTENSION_FIREFOX_URL ?? "";
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    setFinishing(true);
    const done = await completeOnboarding();
    if (!done) {
      toast.error("Impossible de finaliser.");
      setFinishing(false);
      return;
    }
    // The extension creates its own lists when scraping — no empty list /
    // empty campaign here; the user lands on the CRM to source leads.
    window.location.assign("/crm");
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <h1 className={welcomeStepTitleClass}>Installez l’extension.</h1>
      <div className={cn(cardShell, setupFormMax, "text-center")}>
        <p className={cn(subClass, "!mt-0")}>
          Depuis une recherche LinkedIn, l’extension extrait vos prospects et
          les ajoute directement à une liste dans Andoxa.
        </p>
        {EXTENSION_DEMO_GIF_SRC ? (
          // eslint-disable-next-line @next/next/no-img-element -- animated GIF
          <img
            src={EXTENSION_DEMO_GIF_SRC}
            alt="Démonstration de l’extension Andoxa sur LinkedIn"
            className="mx-auto w-full max-w-sm rounded-xl border border-zinc-200 dark:border-white/10"
          />
        ) : (
          <div
            className="mx-auto max-w-xs rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-white/10 dark:bg-zinc-900"
            aria-hidden
          >
            <div className="flex h-9 items-center gap-1 rounded-md bg-white px-2 dark:bg-zinc-950">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <div className="ml-4 flex flex-1 justify-end gap-1">
                <span className="inline-flex size-7 items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
                  <Puzzle className="size-4 text-zinc-500" />
                </span>
                <span className="inline-flex size-7 items-center justify-center rounded border border-[#5e6ad2]/40 bg-[#5e6ad2]/15 text-xs font-bold text-[#5e6ad2]">
                  A
                </span>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-zinc-500 dark:text-zinc-500">
              Repérez l’icône puzzle → Andoxa dans la barre d’outils
            </p>
          </div>
        )}
        <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3">
          {chromeExtUrl ? (
            <Button
              asChild
              className="h-11 min-h-11 flex-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 sm:flex-none sm:px-4"
            >
              <a href={chromeExtUrl} target="_blank" rel="noreferrer">
                <span className="sm:hidden">Chrome</span>
                <span className="hidden sm:inline">Télécharger pour Chrome</span>
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 flex-1 border-zinc-300 dark:border-white/15 sm:flex-none"
              onClick={() =>
                toast.message("Lien Chrome non configuré", {
                  description: "Définissez NEXT_PUBLIC_EXTENSION_CHROME_URL.",
                })
              }
            >
              <span className="sm:hidden">Chrome</span>
              <span className="hidden sm:inline">Télécharger pour Chrome</span>
            </Button>
          )}
          {firefoxExtUrl ? (
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 flex-1 dark:border-white/15 sm:flex-none sm:px-4"
            >
              <a href={firefoxExtUrl} target="_blank" rel="noreferrer">
                <span className="sm:hidden">Firefox</span>
                <span className="hidden sm:inline">Télécharger pour Firefox</span>
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex w-full flex-col items-center gap-4">
        <OnboardingContinueButton
          loading={finishing}
          onClick={() => void handleFinish()}
        >
          J’ai installé l’extension
        </OnboardingContinueButton>
        <BackToChoice onBack={onBack} disabled={finishing} />
      </div>
    </div>
  );
}

function BackToChoice({
  onBack,
  disabled,
}: {
  onBack: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      disabled={disabled}
      className="text-xs font-medium text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-600 hover:underline disabled:opacity-50 dark:text-zinc-500 dark:hover:text-zinc-300"
    >
      Choisir une autre méthode
    </button>
  );
}
