"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { resolveClientAppOrigin } from "@/lib/config/app-url";
import { translateAuthError } from "@/lib/utils/translate-auth-error";

function ForgotPasswordFormInner() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState(emailParam?.trim() ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setSent(false);
      setError("Veuillez saisir votre adresse e-mail.");
      return;
    }

    setLoading(true);
    setSent(false);
    setError(null);

    const base = resolveClientAppOrigin();
    const redirectTo = base
      ? `${base}/api/auth/confirm?next=${encodeURIComponent("/auth/update-password")}`
      : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      redirectTo ? { redirectTo } : undefined
    );

    if (resetError) {
      setError(translateAuthError(resetError));
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
      <CardContent className="p-8 sm:p-10">
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Si un compte existe avec cette adresse, vous recevrez un e-mail
              contenant un lien pour choisir un nouveau mot de passe.
            </p>
            <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              Le lien est valable 60 minutes. Pensez à vérifier vos spams.
            </p>
            <Button asChild variant="secondary" className="mt-2 w-full h-11">
              <Link href="/auth/login">Retour à la connexion</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-password-email">E-mail</Label>
              <Input
                id="forgot-password-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}

            <Button
              type="submit"
              variant="secondary"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? "Envoi en cours…" : "Envoyer le lien"}
            </Button>

            <p className="text-center text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-slate-700 underline-offset-2 hover:underline dark:text-slate-300"
              >
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ForgotPasswordForm() {
  return (
    <Suspense
      fallback={
        <div className="h-48 animate-pulse rounded-2xl bg-white/5" />
      }
    >
      <ForgotPasswordFormInner />
    </Suspense>
  );
}
