"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";

interface ProspectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = {
  full_name: "",
  email: "",
  company: "",
  job_title: "",
  phone: "",
};

/**
 * "Nouveau prospect" — single manual prospect creation. Built on the shared
 * AppModal shell. CSV/multi-row import lives in ProspectImportDialog so the
 * two entry points no longer overlap.
 */
export function ProspectCreateDialog({
  open,
  onOpenChange,
}: ProspectCreateDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const resetForm = () => {
    setForm(EMPTY);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.full_name.trim()) {
      setError("Le nom est requis");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim() || undefined,
          company: form.company.trim() || undefined,
          job_title: form.job_title.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errors = json?.error?.details?.errors;
        const errMsg = errors
          ? Object.values(errors).find(Boolean)
          : (json?.error?.message ?? "Erreur lors de la création");
        throw new Error(String(errMsg));
      }

      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospects-v2"] });
      toast.success("Prospect créé");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const field = (key: keyof typeof EMPTY) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Nouveau prospect"
      description="Ajoutez un prospect à votre CRM. Le nom est obligatoire."
      size="md"
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
            disabled={isSubmitting}
            className="min-w-[96px] bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Création..." : "Créer"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nom *</Label>
          <Input id="full_name" placeholder="Prénom Nom" required {...field("full_name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@exemple.com" {...field("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Entreprise</Label>
          <Input id="company" placeholder="Nom de l'entreprise" {...field("company")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job_title">Poste</Label>
          <Input id="job_title" placeholder="Fonction" {...field("job_title")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" type="tel" placeholder="+33 6 12 34 56 78" {...field("phone")} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {/* Hidden submit so Enter submits the form. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </AppModal>
  );
}
