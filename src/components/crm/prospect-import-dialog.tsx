"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { getImportMaxRows, type PlanId } from "@/lib/config/plans-config";
import { mapProspectRow } from "@/lib/utils/deduplicateProspects";

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
  phone: "Telephone",
  company: "Societe",
  job_title: "Poste",
  linkedin: "URL LinkedIn",
};

const NONE_OPTION = "__none__";
const MAX_CLIENT_ROWS = 5000;

const VALID_PLANS: PlanId[] = ["trial", "essential", "pro", "business", "demo"];

function inferMapping(target: TargetField, fields: string[]): string {
  const lower = fields.map((f) => ({ original: f, normalized: f.trim().toLowerCase() }));

  const candidates: Record<TargetField, string[]> = {
    full_name: ["full name", "name", "nom complet", "nom", "fullname"],
    email: ["email", "e-mail", "mail", "email address", "adresse email"],
    phone: ["phone", "telephone", "tel", "mobile", "numero"],
    company: ["company", "societe", "entreprise", "organization"],
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
}

export function ProspectImportDialog({
  open,
  onOpenChange,
}: ProspectImportDialogProps) {
  const queryClient = useQueryClient();
  const { parse: parseCsv } = useParseCSV();
  const { parse: parseExcel } = useParseExcel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listName, setListName] = useState("");
  const [activeTab, setActiveTab] = useState<"manual" | "file">("manual");
  const [rows, setRows] = useState<ProspectRow[]>([{ name: "", url: "" }]);
  const [fileType, setFileType] = useState<"csv" | "xlsx" | null>(null);
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

  const { data: subscriptionInfo } = useQuery({
    queryKey: ["subscription-info"],
    queryFn: async () => {
      const res = await fetch("/api/subscription/info", { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as { currentPlan?: string };
    },
    enabled: open,
    staleTime: 60_000,
  });

  const planId: PlanId = useMemo(() => {
    const raw = subscriptionInfo?.currentPlan;
    return raw && VALID_PLANS.includes(raw as PlanId) ? (raw as PlanId) : "trial";
  }, [subscriptionInfo?.currentPlan]);

  const maxRows = getImportMaxRows(planId);
  const isOverPlanRowLimit = maxRows !== -1 && parsedRows.length > maxRows;

  const mappedRowsPreview = useMemo(() => {
    return parsedRows.slice(0, 5).map((row) => {
      const mapped: Record<string, unknown> = {};
      (Object.keys(mappings) as TargetField[]).forEach((target) => {
        const source = mappings[target];
        if (source && source !== NONE_OPTION) {
          mapped[target] = row[source];
        }
      });
      return mapProspectRow(mapped);
    });
  }, [parsedRows, mappings]);

  const resetForm = () => {
    setListName("");
    setActiveTab("manual");
    setRows([{ name: "", url: "" }]);
    setFileType(null);
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
    setError(null);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { name: "", url: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "name" | "url", value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    const extension = file.name.split(".").pop()?.toLowerCase();
    const type = extension === "csv" ? "csv" : extension === "xls" || extension === "xlsx" ? "xlsx" : null;
    if (!type) {
      setError("Format non supporte. Utilisez un fichier .csv, .xlsx ou .xls");
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
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Impossible de parser le fichier");
    }
  };

  const buildMappedRows = () => {
    return parsedRows
      .map((row) => {
        const mapped: Record<string, unknown> = {};
        (Object.keys(mappings) as TargetField[]).forEach((target) => {
          const source = mappings[target];
          if (source && source !== NONE_OPTION) {
            mapped[target] = row[source];
          }
        });

        const normalized = mapProspectRow(mapped) as Record<string, unknown>;
        return {
          full_name: String(normalized.full_name ?? "").trim(),
          email: String(normalized.email ?? "").trim(),
          phone: String(normalized.phone ?? "").trim(),
          company: String(normalized.company ?? "").trim(),
          job_title: String(normalized.job_title ?? "").trim(),
          linkedin: String(normalized.linkedin ?? "").trim(),
        };
      })
      .filter((row) => row.full_name || row.email || row.linkedin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setError("Le nombre de lignes depasse la limite de votre plan.");
        return;
      }

      const prospects = buildMappedRows();
      if (prospects.length === 0) {
        setError("Aucune ligne valide. Verifiez le mapping des colonnes.");
        return;
      }

      payload = {
        name: listName.trim(),
        source: fileType,
        prospects,
      };
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

      payload = {
        name: listName.trim(),
        source: "linkedin_extension",
        prospects,
      };
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
          : json?.error?.message ?? "Erreur lors de l'import";
        throw new Error(String(errMsg));
      }

      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-activity"] });
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importer des prospects</DialogTitle>
          <DialogDescription>
            Import manuel ou import fichier CSV/Excel avec mapping des colonnes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">Nom de la liste *</Label>
            <Input
              id="list-name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Ex: Prospects Q1 2025"
              required
            />
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "manual" | "file")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manuel</TabsTrigger>
              <TabsTrigger value="file">Fichier CSV/Excel</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label>Prospects (nom, URL LinkedIn)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addRow}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Ligne
                </Button>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
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
            </TabsContent>

            <TabsContent value="file" className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="prospects-file">Fichier CSV/Excel</Label>
                <div className="rounded-lg border border-dashed p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4" />
                    Formats acceptes: .csv, .xlsx, .xls
                  </div>
                  <Input
                    id="prospects-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleFileUpload(file);
                    }}
                  />
                </div>
              </div>

              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {maxRows === -1
                  ? `${parsedRows.length} lignes detectees (limite plan: illimitee).`
                  : `${parsedRows.length} / ${maxRows} lignes (limite plan).`}
              </div>

              {fields.length > 0 && (
                <div className="space-y-3">
                  <Label>Mapping colonnes</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(TARGET_FIELD_LABELS) as TargetField[]).map((target) => (
                      <div key={target} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {TARGET_FIELD_LABELS[target]}
                        </Label>
                        <Select
                          value={mappings[target]}
                          onValueChange={(value) =>
                            setMappings((prev) => ({ ...prev, [target]: value }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selectionner une colonne" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_OPTION}>-- Aucune --</SelectItem>
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
              )}

              {mappedRowsPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Apercu (5 premieres lignes)</Label>
                  <div className="max-h-48 overflow-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {(Object.keys(TARGET_FIELD_LABELS) as TargetField[]).map((target) => (
                            <th key={target} className="px-2 py-1 text-left font-medium">
                              {TARGET_FIELD_LABELS[target]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mappedRowsPreview.map((row, index) => (
                          <tr key={index} className="border-t">
                            {(Object.keys(TARGET_FIELD_LABELS) as TargetField[]).map((target) => (
                              <td key={target} className="px-2 py-1">
                                {String((row as Record<string, unknown>)[target] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || (activeTab === "file" && isOverPlanRowLimit)}>
              {isSubmitting ? "Import en cours..." : activeTab === "file" ? "Importer le fichier" : "Importer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
