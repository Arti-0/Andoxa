"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Plus, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParseCSV } from "@/hooks/use-parse-csv";
import { useParseExcel } from "@/hooks/use-parse-excel";
import { getImportMaxRows, isPlanId, toPlanId, type PlanId } from "@/lib/config/plans-config";
import { mapProspectRow } from "@/lib/utils/deduplicateProspects";
import { useWorkspace } from "@/lib/workspace";

interface ProspectRow {
  name: string;
  url: string;
}

type TargetField =
  | "full_name"
  | "email"
  | "phone"
  | "company"
  | "job_title"
  | "linkedin";

const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  full_name: "Nom complet",
  email: "Email",
  phone: "Téléphone",
  company: "Société",
  job_title: "Poste",
  linkedin: "URL LinkedIn",
};

const TARGET_FIELDS = Object.keys(TARGET_FIELD_LABELS) as TargetField[];

/**
 * A CSV column mapped to a user-named custom field. On import these ride as
 * extra keys on each prospect row; the server stores any non-standard key under
 * `prospects.metadata`, and the CRM table surfaces them as toggleable columns.
 */
interface CustomMapping {
  id: string;
  /** CSV header to read the value from. */
  source: string;
  /** Display name / metadata key for the custom column. */
  name: string;
}

// Standard keys the import route treats as first-class columns — a custom
// column must not reuse one of these names (it would land as a standard field
// instead of metadata).
const RESERVED_FIELD_NAMES = new Set<string>([
  "full_name",
  "name",
  "email",
  "phone",
  "company",
  "job_title",
  "linkedin",
  "url",
]);

const NONE_OPTION = "__none__";
const MAX_CLIENT_ROWS = 5000;
/** How many rows to render in the preview table (the rest still import). */
const PREVIEW_ROWS = 50;

function inferMapping(target: TargetField, fields: string[]): string {
  const lower = fields.map((f) => ({ original: f, normalized: f.trim().toLowerCase() }));

  const candidates: Record<TargetField, string[]> = {
    full_name: ["full name", "name", "nom complet", "nom", "fullname"],
    email: ["email", "e-mail", "mail", "email address", "adresse email"],
    phone: ["phone", "telephone", "téléphone", "tel", "mobile", "numero"],
    company: ["company", "societe", "société", "entreprise", "organization"],
    job_title: ["job title", "title", "poste", "fonction", "position"],
    linkedin: ["linkedin", "linkedin url", "linkedin profile", "profile url", "url"],
  };

  const aliases = candidates[target];
  const exact = lower.find((f) => aliases.includes(f.normalized));
  if (exact) return exact.original;

  const partial = lower.find((f) => aliases.some((alias) => f.normalized.includes(alias)));
  return partial?.original ?? NONE_OPTION;
}

interface ProspectImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When true, expose the manual multi-row tab in addition to file import.
   * The Prospects view keeps this off (single-prospect add lives in
   * "Nouveau prospect"); the Listes view turns it on so a list can be built
   * by hand without leaving the import flow.
   */
  showManual?: boolean;
}

export function ProspectImportDialog({
  open,
  onOpenChange,
  showManual = false,
}: ProspectImportDialogProps) {
  const queryClient = useQueryClient();
  const { parse: parseCsv } = useParseCSV();
  const { parse: parseExcel } = useParseExcel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [activeTab, setActiveTab] = useState<"manual" | "file">(
    showManual ? "manual" : "file",
  );
  const [rows, setRows] = useState<ProspectRow[]>([{ name: "", url: "" }]);
  const [fileType, setFileType] = useState<"csv" | "xlsx" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fields, setFields] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [mappings, setMappings] = useState<Record<TargetField, string>>({
    full_name: NONE_OPTION,
    email: NONE_OPTION,
    phone: NONE_OPTION,
    company: NONE_OPTION,
    job_title: NONE_OPTION,
    linkedin: NONE_OPTION,
  });
  // Custom columns: CSV column → user-named metadata field (HubSpot-style, kept
  // deliberately simple). Empty by default; the user adds rows on demand.
  const [customMappings, setCustomMappings] = useState<CustomMapping[]>([]);

  const validCustomMappings = useMemo(
    () =>
      customMappings.filter(
        (m) =>
          m.source &&
          m.source !== NONE_OPTION &&
          m.name.trim().length > 0 &&
          !RESERVED_FIELD_NAMES.has(m.name.trim().toLowerCase()),
      ),
    [customMappings],
  );

  const addCustomMapping = () =>
    setCustomMappings((prev) => [
      ...prev,
      { id: crypto.randomUUID(), source: NONE_OPTION, name: "" },
    ]);
  const updateCustomMapping = (id: string, patch: Partial<CustomMapping>) =>
    setCustomMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  const removeCustomMapping = (id: string) =>
    setCustomMappings((prev) => prev.filter((m) => m.id !== id));

  const { workspace } = useWorkspace();
  const autoEnrichEnabled = useMemo(() => {
    const meta = (workspace?.metadata ?? {}) as Record<string, unknown>;
    return meta?.auto_enrich_on_import === true;
  }, [workspace?.metadata]);

  const enrichmentPreview = useMemo(() => {
    if (activeTab === "manual") {
      const total = rows.filter((r) => r.name.trim() || r.url.trim()).length;
      const withLinkedIn = rows.filter((r) => r.url.trim().length > 0).length;
      return { total, withLinkedIn };
    }
    const total = parsedRows.length;
    const liCol = mappings.linkedin;
    if (!liCol || liCol === NONE_OPTION) return { total, withLinkedIn: 0 };
    const withLinkedIn = parsedRows.reduce((acc, row) => {
      const v = row[liCol];
      return acc + (typeof v === "string" && v.trim().length > 0 ? 1 : 0);
    }, 0);
    return { total, withLinkedIn };
  }, [activeTab, rows, parsedRows, mappings.linkedin]);

  const { data: subscriptionInfo } = useQuery({
    queryKey: ["subscription-info"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/info", { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { currentPlan?: string; limitsPlanId?: string };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const planId: PlanId = useMemo(() => {
    const raw = subscriptionInfo?.limitsPlanId ?? subscriptionInfo?.currentPlan;
    return isPlanId(raw) ? raw : toPlanId(raw);
  }, [subscriptionInfo?.limitsPlanId, subscriptionInfo?.currentPlan]);

  const maxRows = getImportMaxRows(planId);
  const isOverPlanRowLimit = maxRows !== -1 && parsedRows.length > maxRows;

  /** Full mapped rows (used for both preview and submit). */
  const mappedRows = useMemo(() => {
    return parsedRows.map((row) => {
      const mapped: Record<string, unknown> = {};
      TARGET_FIELDS.forEach((target) => {
        const source = mappings[target];
        if (source && source !== NONE_OPTION) mapped[target] = row[source];
      });
      return mapProspectRow(mapped) as Record<string, unknown>;
    });
  }, [parsedRows, mappings]);

  const validRowCount = useMemo(
    () =>
      mappedRows.filter(
        (r) => r.full_name || r.email || r.linkedin,
      ).length,
    [mappedRows],
  );

  const resetForm = () => {
    setListName("");
    setActiveTab(showManual ? "manual" : "file");
    setRows([{ name: "", url: "" }]);
    setFileType(null);
    setFileName(null);
    setFields([]);
    setParsedRows([]);
    setMappings({
      full_name: NONE_OPTION,
      email: NONE_OPTION,
      phone: NONE_OPTION,
      company: NONE_OPTION,
      job_title: NONE_OPTION,
      linkedin: NONE_OPTION,
    });
    setCustomMappings([]);
    setError(null);
  };

  const addRow = () => setRows((prev) => [...prev, { name: "", url: "" }]);
  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, i) => i !== index));
  const updateRow = (index: number, field: "name" | "url", value: string) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const handleFileUpload = async (file: File) => {
    setError(null);
    const extension = file.name.split(".").pop()?.toLowerCase();
    const type =
      extension === "csv" ? "csv" : extension === "xls" || extension === "xlsx" ? "xlsx" : null;
    if (!type) {
      setError("Format non supporté. Utilisez un fichier .csv, .xlsx ou .xls");
      return;
    }
    try {
      const result =
        type === "csv"
          ? await parseCsv(file, { header: true, skipEmptyLines: true })
          : await parseExcel(file);

      if (result.data.length > MAX_CLIENT_ROWS) {
        setError(`Fichier trop volumineux (${result.data.length} lignes). Limite: ${MAX_CLIENT_ROWS}.`);
        return;
      }

      setFileType(type);
      setFileName(file.name);
      setFields(result.fields);
      setParsedRows(result.data);
      setMappings({
        full_name: inferMapping("full_name", result.fields),
        email: inferMapping("email", result.fields),
        phone: inferMapping("phone", result.fields),
        company: inferMapping("company", result.fields),
        job_title: inferMapping("job_title", result.fields),
        linkedin: inferMapping("linkedin", result.fields),
      });
      // Default the list name to the file name (sans extension) if empty.
      setListName((prev) => prev || file.name.replace(/\.[^.]+$/, ""));
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Impossible de parser le fichier");
    }
  };

  const buildMappedRows = () =>
    mappedRows
      .map((normalized, i) => {
        const base: Record<string, string> = {
          full_name: String(normalized.full_name ?? "").trim(),
          email: String(normalized.email ?? "").trim(),
          phone: String(normalized.phone ?? "").trim(),
          company: String(normalized.company ?? "").trim(),
          job_title: String(normalized.job_title ?? "").trim(),
          linkedin: String(normalized.linkedin ?? "").trim(),
        };
        // Custom columns ride as extra keys; the import route stores any
        // non-standard key under prospects.metadata. Values come from the
        // original CSV row (parsedRows is index-aligned with mappedRows).
        const raw = parsedRows[i] ?? {};
        for (const cm of validCustomMappings) {
          const v = raw[cm.source];
          const s = v == null ? "" : String(v).trim();
          if (s) base[cm.name.trim()] = s;
        }
        return base;
      })
      .filter((row) => row.full_name || row.email || row.linkedin);

  const handleSubmit = async () => {
    if (!listName.trim()) {
      setError("Le nom de la liste est requis");
      return;
    }

    const isFileMode = activeTab === "file";
    let payload: Record<string, unknown>;

    if (isFileMode) {
      if (!fileType || parsedRows.length === 0) {
        setError("Ajoutez un fichier CSV/Excel avant de lancer l'import.");
        return;
      }
      if (isOverPlanRowLimit) {
        setError("Le nombre de lignes dépasse la limite de votre plan.");
        return;
      }
      const prospects = buildMappedRows();
      if (prospects.length === 0) {
        setError("Aucune ligne valide. Vérifiez le mapping des colonnes.");
        return;
      }
      payload = { name: listName.trim(), source: fileType, prospects };
    } else {
      const prospects = rows
        .filter((r) => r.name.trim() || r.url.trim())
        .map((r) => ({
          full_name: r.name.trim() || null,
          linkedin: r.url.trim() || null,
        }));
      if (prospects.length === 0) {
        setError("Ajoutez au moins un prospect (nom ou URL LinkedIn)");
        return;
      }
      payload = { name: listName.trim(), source: "manual", prospects };
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const errors = json?.error?.details?.errors;
        const errMsg = errors
          ? Object.values(errors).find(Boolean)
          : (json?.error?.message ?? "Erreur lors de l'import");
        throw new Error(String(errMsg));
      }
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospects-v2"] });
      queryClient.invalidateQueries({ queryKey: ["bdd"] });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const fileBody = (
    <div className="space-y-4">
      {parsedRows.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center hover:bg-muted/40">
          <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
          <div className="text-[13.5px] font-medium">
            Glissez un fichier ou cliquez pour parcourir
          </div>
          <div className="text-[12px] text-muted-foreground">
            Formats acceptés : .csv, .xlsx, .xls
          </div>
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
          />
        </label>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-[12.5px]">
            <span className="flex items-center gap-2 truncate">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate font-medium">{fileName}</span>
              <span className="text-muted-foreground">
                · {parsedRows.length} ligne{parsedRows.length > 1 ? "s" : ""}
                {maxRows !== -1 ? ` / ${maxRows}` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setParsedRows([]);
                setFields([]);
                setFileType(null);
                setFileName(null);
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Changer
            </button>
          </div>

          {isOverPlanRowLimit && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              Le fichier dépasse la limite de votre plan ({maxRows} lignes).
            </div>
          )}

          {/* Column mapping */}
          <div className="space-y-2">
            <Label>Associer les colonnes</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TARGET_FIELDS.map((target) => (
                <div key={target} className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    {TARGET_FIELD_LABELS[target]}
                  </Label>
                  <Select
                    value={mappings[target]}
                    onValueChange={(value) =>
                      setMappings((prev) => ({ ...prev, [target]: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Colonne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_OPTION}>— Aucune —</SelectItem>
                      {fields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Custom columns — map any other CSV column to a named field that
              lands in the CRM (stored in prospects.metadata server-side). */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Colonnes personnalisées</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addCustomMapping}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Colonne
              </Button>
            </div>
            {customMappings.length === 0 ? (
              <p className="text-[11.5px] text-muted-foreground">
                Importez un champ qui n&apos;existe pas par défaut (ex&nbsp;:
                Région, Score). Il devient une colonne du CRM, affichable via le
                sélecteur de colonnes.
              </p>
            ) : (
              <div className="space-y-2">
                {customMappings.map((cm) => {
                  const reserved =
                    cm.name.trim().length > 0 &&
                    RESERVED_FIELD_NAMES.has(cm.name.trim().toLowerCase());
                  return (
                    <div key={cm.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Nom de la colonne (ex : Région)"
                        value={cm.name}
                        onChange={(e) =>
                          updateCustomMapping(cm.id, { name: e.target.value })
                        }
                        className={`flex-1 ${reserved ? "border-amber-400" : ""}`}
                      />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ←
                      </span>
                      <Select
                        value={cm.source}
                        onValueChange={(value) =>
                          updateCustomMapping(cm.id, { source: value })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Colonne CSV" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_OPTION}>— Aucune —</SelectItem>
                          {fields.map((field) => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomMapping(cm.id)}
                        aria-label="Retirer la colonne"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
                {customMappings.some(
                  (cm) =>
                    cm.name.trim().length > 0 &&
                    RESERVED_FIELD_NAMES.has(cm.name.trim().toLowerCase()),
                ) && (
                  <p className="text-[11px] text-amber-600">
                    Un nom réutilise un champ standard (Nom, Email, Téléphone,
                    Société, Poste, LinkedIn) et sera ignoré. Choisissez un autre
                    nom.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Full datatable preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Aperçu{" "}
                <span className="font-normal text-muted-foreground">
                  ({validRowCount} ligne{validRowCount > 1 ? "s" : ""} valides
                  {parsedRows.length > PREVIEW_ROWS
                    ? ` · ${PREVIEW_ROWS} premières affichées`
                    : ""}
                  )
                </span>
              </Label>
            </div>
            <div className="max-h-[320px] overflow-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="w-8 border-b border-border px-2 py-1.5 text-left font-semibold text-muted-foreground">
                      #
                    </th>
                    {TARGET_FIELDS.map((target) => (
                      <th
                        key={target}
                        className="whitespace-nowrap border-b border-border px-2.5 py-1.5 text-left font-semibold text-muted-foreground"
                      >
                        {TARGET_FIELD_LABELS[target]}
                      </th>
                    ))}
                    {validCustomMappings.map((cm) => (
                      <th
                        key={cm.id}
                        className="whitespace-nowrap border-b border-border px-2.5 py-1.5 text-left font-semibold text-muted-foreground"
                      >
                        {cm.name.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, PREVIEW_ROWS).map((row, index) => {
                    const isValid = !!(row.full_name || row.email || row.linkedin);
                    return (
                      <tr
                        key={index}
                        className={`border-b border-border/60 ${isValid ? "" : "bg-amber-50/60 dark:bg-amber-950/20"}`}
                      >
                        <td className="px-2 py-1 text-muted-foreground tabular-nums">
                          {index + 1}
                        </td>
                        {TARGET_FIELDS.map((target) => (
                          <td
                            key={target}
                            className="max-w-[200px] truncate px-2.5 py-1"
                            title={String(row[target] ?? "")}
                          >
                            {String(row[target] ?? "") || (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        ))}
                        {validCustomMappings.map((cm) => {
                          const raw = parsedRows[index] ?? {};
                          const v = raw[cm.source];
                          const s = v == null ? "" : String(v).trim();
                          return (
                            <td
                              key={cm.id}
                              className="max-w-[200px] truncate px-2.5 py-1"
                              title={s}
                            >
                              {s || (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const manualBody = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Prospects (nom, URL LinkedIn)</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-4 w-4" />
          Ligne
        </Button>
      </div>
      <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-lg border border-border p-3">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              placeholder="Nom"
              value={row.name}
              onChange={(e) => updateRow(index, "name", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="https://linkedin.com/in/..."
              value={row.url}
              onChange={(e) => updateRow(index, "url", e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(index)}
              disabled={rows.length === 1}
              aria-label="Supprimer la ligne"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Importer des prospects"
      description={
        showManual
          ? "Importez un fichier CSV/Excel ou ajoutez des prospects à la main."
          : "Importez un fichier CSV/Excel et associez ses colonnes."
      }
      size="xl"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="min-w-[96px]"
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || (activeTab === "file" && isOverPlanRowLimit)}
            className="min-w-[120px] bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting
              ? "Import en cours..."
              : activeTab === "file"
                ? `Importer${validRowCount > 0 ? ` (${validRowCount})` : ""}`
                : "Importer"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="list-name">Nom de la liste *</Label>
          <Input
            id="list-name"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Ex : Prospects Q1 2025"
            required
          />
        </div>

        {showManual ? (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "manual" | "file")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Fichier CSV/Excel</TabsTrigger>
              <TabsTrigger value="manual">Manuel</TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="pt-3">
              {fileBody}
            </TabsContent>
            <TabsContent value="manual" className="pt-3">
              {manualBody}
            </TabsContent>
          </Tabs>
        ) : (
          fileBody
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {enrichmentPreview.total > 0 && (
          <div
            className={
              autoEnrichEnabled
                ? "rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
                : "rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground"
            }
          >
            <div className="flex items-start gap-2">
              {autoEnrichEnabled ? (
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <div>
                {autoEnrichEnabled ? (
                  <>
                    <strong>Enrichissement automatique activé.</strong>{" "}
                    {enrichmentPreview.withLinkedIn} sur {enrichmentPreview.total}{" "}
                    prospect(s) seront enrichis via LinkedIn en arrière-plan.{" "}
                    {enrichmentPreview.total - enrichmentPreview.withLinkedIn > 0 && (
                      <span className="opacity-80">
                        Les autres n&apos;ont pas d&apos;URL LinkedIn et seront
                        importés tels quels.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Enrichissement automatique <strong>désactivé</strong>. Les
                    prospects seront importés sans enrichissement. Vous pouvez
                    l&apos;activer dans Paramètres → Intégrations.
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}
