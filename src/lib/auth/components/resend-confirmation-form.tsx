"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResendConfirmationFormProps {
  email?: string;
}

export function ResendConfirmationForm({ email }: ResendConfirmationFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [currentEmail, setCurrentEmail] = useState(email ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = currentEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setSuccess(null);
      setError("Veuillez renseigner une adresse email.");
      return;
    }

    setLoading(true);
    setSuccess(null);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
    });

    if (resendError) {
      setError(resendError.message);
      setLoading(false);
      return;
    }

    setSuccess("Un nouvel email a ete envoye. Verifiez votre boite de reception.");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="resend-confirmation-email">Email</Label>
        <Input
          id="resend-confirmation-email"
          type="email"
          value={currentEmail}
          onChange={(event) => setCurrentEmail(event.target.value)}
          placeholder="vous@entreprise.com"
          autoComplete="email"
          required
          aria-describedby={[
            error ? "resend-confirmation-error" : null,
            success ? "resend-confirmation-success" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </div>

      {error ? (
        <p id="resend-confirmation-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {success ? (
        <p id="resend-confirmation-success" className="text-sm text-emerald-600">
          {success}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Envoi en cours..." : "Renvoyer l'email"}
      </Button>
    </form>
  );
}
